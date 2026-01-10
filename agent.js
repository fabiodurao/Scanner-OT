const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load configuration
const config = require('./config');

// Logging utility
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// HTTP request helper
const makeRequest = (url, options, body = null) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// API helper for agent-jobs edge function
const agentApi = async (action, data = {}) => {
  const response = await makeRequest(
    `${config.SUPABASE_URL}/functions/v1/agent-jobs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-key': config.AGENT_SECRET,
      },
    },
    { action, ...data }
  );
  
  if (response.status !== 200) {
    throw new Error(`API error: ${response.status} - ${JSON.stringify(response.data)}`);
  }
  
  return response.data;
};

// Update job status with step information
const updateJobStatus = async (jobId, status, progress, step = null, extraData = {}) => {
  try {
    const updateData = {
      job_id: jobId,
      status,
      progress,
      ...extraData,
    };
    
    if (step) {
      updateData.current_step = step;
    }
    
    await agentApi('update_status', updateData);
  } catch (error) {
    log('ERROR', `Failed to update job status: ${error.message}`);
  }
};

// Check if job was cancelled
const checkCancelled = async (jobId) => {
  try {
    const result = await agentApi('check_cancelled', { job_id: jobId });
    return result.cancelled;
  } catch {
    return false;
  }
};

// Download file from S3 using AWS CLI
const downloadFromS3 = async (s3Key, bucket, destPath, credentials) => {
  const s3Uri = `s3://${bucket}/${s3Key}`;
  
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: credentials.access_key_id,
    AWS_SECRET_ACCESS_KEY: credentials.secret_access_key,
    AWS_DEFAULT_REGION: credentials.region,
  };
  
  log('INFO', `Downloading from S3: ${s3Uri}`);
  
  execSync(`aws s3 cp "${s3Uri}" "${destPath}"`, { env, stdio: 'inherit' });
  
  return destPath;
};

// Decompress file if needed
const decompressFile = (filePath) => {
  if (filePath.endsWith('.zst')) {
    const outputPath = filePath.replace('.zst', '');
    log('INFO', `Decompressing: ${filePath}`);
    execSync(`zstd -d -f "${filePath}" -o "${outputPath}"`, { stdio: 'inherit' });
    fs.unlinkSync(filePath);
    return outputPath;
  } else if (filePath.endsWith('.gz')) {
    const outputPath = filePath.replace('.gz', '');
    log('INFO', `Decompressing: ${filePath}`);
    execSync(`gunzip -f "${filePath}"`, { stdio: 'inherit' });
    return outputPath;
  }
  return filePath;
};

// Get PCAP metadata using capinfos
const getPcapInfo = (pcapPath) => {
  try {
    log('INFO', `Analyzing PCAP: ${pcapPath}`);
    const output = execSync(`capinfos -M "${pcapPath}"`, { encoding: 'utf8' });
    
    const lines = output.split('\n');
    let duration = null;
    let packets = null;
    let startTime = null;
    let endTime = null;
    
    for (const line of lines) {
      if (line.includes('Capture duration:')) {
        // Format: "Capture duration:    123.456789 seconds"
        const match = line.match(/(\d+\.?\d*)\s*seconds/);
        if (match) {
          duration = parseFloat(match[1]);
        }
      } else if (line.includes('Number of packets:')) {
        const match = line.match(/Number of packets:\s*(\d+)/);
        if (match) {
          packets = parseInt(match[1]);
        }
      } else if (line.includes('First packet time:')) {
        const match = line.match(/First packet time:\s*(.+)/);
        if (match) {
          startTime = match[1].trim();
        }
      } else if (line.includes('Last packet time:')) {
        const match = line.match(/Last packet time:\s*(.+)/);
        if (match) {
          endTime = match[1].trim();
        }
      }
    }
    
    log('INFO', `PCAP info: duration=${duration}s, packets=${packets}`);
    
    return { duration, packets, startTime, endTime };
  } catch (error) {
    log('WARN', `Failed to get PCAP info: ${error.message}`);
    return { duration: null, packets: null, startTime: null, endTime: null };
  }
};

// Run mbsniffer with progress tracking
const runMbsniffer = (pcapPath, job, pcapInfo) => {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', pcapPath,
      '--interval-batch', String(job.mbsniffer_interval_batch || 1000),
      '--interval-min', String(job.mbsniffer_interval_min || 100),
    ];
    
    // Add endpoint if webhook URL is provided
    if (job.n8n_webhook_url) {
      args.push('-endpoint', job.n8n_webhook_url);
    }
    
    log('INFO', `Running mbsniffer: ${config.MBSNIFFER_PATH} ${args.join(' ')}`);
    
    const mbsniffer = spawn(config.MBSNIFFER_PATH, args);
    
    const startTime = Date.now();
    const totalDuration = pcapInfo.duration || 300; // Default 5 min if unknown
    let lastProgressUpdate = 0;
    
    // Progress update interval (every 2 seconds)
    const progressInterval = setInterval(async () => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      
      // Estimate progress: processing step is 35-95% (60% range)
      // Use elapsed time vs estimated total time
      const estimatedProgress = Math.min(elapsedSeconds / totalDuration, 1);
      const progress = Math.floor(35 + (estimatedProgress * 60));
      
      if (progress > lastProgressUpdate) {
        lastProgressUpdate = progress;
        await updateJobStatus(job.id, 'running', Math.min(progress, 95), 'processing', {
          elapsed_seconds: Math.floor(elapsedSeconds),
          total_duration: Math.floor(totalDuration),
        });
      }
      
      // Check for cancellation
      const cancelled = await checkCancelled(job.id);
      if (cancelled) {
        log('INFO', 'Job cancelled, killing mbsniffer');
        mbsniffer.kill('SIGTERM');
      }
    }, 2000);
    
    mbsniffer.stdout.on('data', (data) => {
      // Just count, don't store
      const lines = data.toString().split('\n').filter(l => l.trim()).length;
      if (lines > 0) {
        log('DEBUG', `mbsniffer: processed ${lines} output lines`);
      }
    });
    
    mbsniffer.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        log('WARN', `mbsniffer stderr: ${line}`);
      }
    });
    
    mbsniffer.on('close', (code) => {
      clearInterval(progressInterval);
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      log('INFO', `mbsniffer exited with code ${code} after ${totalTime}s`);
      
      if (code === 0) {
        resolve({ success: true, processingTime: totalTime });
      } else if (code === null) {
        // Killed (cancelled)
        reject(new Error('Job cancelled by user'));
      } else {
        reject(new Error(`mbsniffer exited with code ${code}`));
      }
    });
    
    mbsniffer.on('error', (error) => {
      clearInterval(progressInterval);
      reject(error);
    });
    
    // Store reference for potential cancellation
    runMbsniffer.currentProcess = mbsniffer;
  });
};

// Process a single job
const processJob = async (job, pcapFile, site, s3Credentials) => {
  const workDir = path.join(config.WORK_DIR, job.id);
  
  try {
    // Create work directory
    fs.mkdirSync(workDir, { recursive: true });
    
    // Step 1: Download (0-20%)
    log('INFO', 'Step 1: Downloading...');
    await updateJobStatus(job.id, 'downloading', 5, 'downloading');
    
    const downloadPath = path.join(workDir, pcapFile.filename);
    await downloadFromS3(pcapFile.s3_key, pcapFile.s3_bucket, downloadPath, s3Credentials);
    
    await updateJobStatus(job.id, 'downloading', 20, 'downloading');
    log('INFO', 'Download complete');
    
    // Check for cancellation
    if (await checkCancelled(job.id)) {
      throw new Error('Job cancelled by user');
    }
    
    // Step 2: Extract (20-30%)
    log('INFO', 'Step 2: Extracting...');
    await updateJobStatus(job.id, 'extracting', 25, 'extracting');
    
    const pcapPath = decompressFile(downloadPath);
    
    await updateJobStatus(job.id, 'extracting', 30, 'extracting');
    log('INFO', `Extraction complete: ${pcapPath}`);
    
    // Check for cancellation
    if (await checkCancelled(job.id)) {
      throw new Error('Job cancelled by user');
    }
    
    // Step 3: Analyze PCAP (30-35%)
    log('INFO', 'Step 3: Analyzing PCAP...');
    await updateJobStatus(job.id, 'running', 32, 'analyzing');
    
    const pcapInfo = getPcapInfo(pcapPath);
    
    // Update job with PCAP metadata
    await updateJobStatus(job.id, 'running', 35, 'processing', {
      pcap_duration: pcapInfo.duration,
      pcap_packets: pcapInfo.packets,
      pcap_start_time: pcapInfo.startTime,
      pcap_end_time: pcapInfo.endTime,
    });
    
    // Check for cancellation
    if (await checkCancelled(job.id)) {
      throw new Error('Job cancelled by user');
    }
    
    // Step 4: Run mbsniffer (35-95%)
    log('INFO', 'Step 4: Running mbsniffer...');
    const result = await runMbsniffer(pcapPath, job, pcapInfo);
    
    // Step 5: Complete (95-100%)
    log('INFO', 'Step 5: Finalizing...');
    await updateJobStatus(job.id, 'completed', 100, 'completed', {
      output_log: `Processing completed successfully in ${result.processingTime}s`,
      processing_time: result.processingTime,
    });
    
    log('INFO', `Job ${job.id} completed successfully`);
    
  } catch (error) {
    log('ERROR', `Job ${job.id} failed: ${error.message}`);
    
    const isCancelled = error.message.includes('cancelled');
    await updateJobStatus(
      job.id,
      isCancelled ? 'cancelled' : 'error',
      0,
      isCancelled ? 'cancelled' : 'error',
      { error_message: error.message }
    );
    
  } finally {
    // Cleanup work directory
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
      log('DEBUG', `Cleaned up work directory: ${workDir}`);
    } catch (e) {
      log('WARN', `Failed to cleanup work directory: ${e.message}`);
    }
  }
};

// Main polling loop
const pollForJobs = async () => {
  try {
    // Get S3 credentials
    const s3Credentials = await agentApi('get_s3_credentials');
    
    // Try to claim a job
    const result = await agentApi('claim_job');
    
    if (!result.job) {
      return;
    }
    
    const { job, pcap_file, site } = result;
    log('INFO', `Claimed job: ${job.id}`);
    log('INFO', `File: ${pcap_file.original_filename} (${(pcap_file.size_bytes / 1024 / 1024).toFixed(1)} MB)`);
    
    // Process the job
    await processJob(job, pcap_file, site, s3Credentials);
    
  } catch (error) {
    log('ERROR', `Polling error: ${error.message}`);
  }
};

// Start the agent
const main = async () => {
  log('INFO', '========================================');
  log('INFO', '   PCAP Processing Agent Started');
  log('INFO', '========================================');
  log('INFO', `Polling interval: ${config.POLL_INTERVAL / 1000}s`);
  log('INFO', `Work directory: ${config.WORK_DIR}`);
  log('INFO', `mbsniffer: ${config.MBSNIFFER_PATH}`);
  
  // Ensure work directory exists
  fs.mkdirSync(config.WORK_DIR, { recursive: true });
  
  // Check mbsniffer exists
  if (!fs.existsSync(config.MBSNIFFER_PATH)) {
    log('ERROR', `mbsniffer not found at ${config.MBSNIFFER_PATH}`);
    process.exit(1);
  }
  
  // Check capinfos exists
  try {
    execSync('which capinfos', { stdio: 'pipe' });
    log('INFO', 'capinfos: available');
  } catch {
    log('WARN', 'capinfos not found - PCAP duration estimation will be limited');
  }
  
  log('INFO', 'Waiting for jobs...');
  log('INFO', '');
  
  // Initial poll
  await pollForJobs();
  
  // Start polling loop
  setInterval(pollForJobs, config.POLL_INTERVAL);
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('INFO', 'Shutting down...');
  if (runMbsniffer.currentProcess) {
    runMbsniffer.currentProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', 'Shutting down...');
  if (runMbsniffer.currentProcess) {
    runMbsniffer.currentProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Run
main().catch((error) => {
  log('ERROR', `Fatal error: ${error.message}`);
  process.exit(1);
});