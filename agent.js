const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load configuration
const config = require('./config');

// Configuration for parallel processing
const MAX_CONCURRENT_JOBS = config.MAX_CONCURRENT_JOBS || 3;

// Track active jobs
const activeJobs = new Map();

// Flag to prevent new jobs during shutdown
let isShuttingDown = false;

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

// Append log line to job
const appendJobLog = async (jobId, message) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const logLine = `[${timestamp}] ${message}`;
  
  try {
    await agentApi('append_log', { job_id: jobId, log_line: logLine });
  } catch (error) {
    log('WARN', `Failed to append log: ${error.message}`);
  }
  
  return logLine;
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
const downloadFromS3 = async (s3Key, bucket, destPath, credentials, jobId) => {
  const s3Uri = `s3://${bucket}/${s3Key}`;
  
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: credentials.access_key_id,
    AWS_SECRET_ACCESS_KEY: credentials.secret_access_key,
    AWS_DEFAULT_REGION: credentials.region,
  };
  
  await appendJobLog(jobId, `Starting download from S3: ${s3Uri}`);
  log('INFO', `Downloading from S3: ${s3Uri}`);
  
  const startTime = Date.now();
  execSync(`aws s3 cp "${s3Uri}" "${destPath}"`, { env, stdio: 'inherit' });
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  const stats = fs.statSync(destPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  await appendJobLog(jobId, `Download complete: ${sizeMB} MB in ${duration}s`);
  log('INFO', `Download complete: ${sizeMB} MB in ${duration}s`);
  
  return destPath;
};

// Decompress file if needed
const decompressFile = async (filePath, jobId) => {
  if (filePath.endsWith('.zst')) {
    const outputPath = filePath.replace('.zst', '');
    await appendJobLog(jobId, `Decompressing .zst file...`);
    log('INFO', `Decompressing: ${filePath}`);
    
    const startTime = Date.now();
    execSync(`zstd -d -f "${filePath}" -o "${outputPath}"`, { stdio: 'inherit' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    fs.unlinkSync(filePath);
    
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    await appendJobLog(jobId, `Decompression complete: ${sizeMB} MB (took ${duration}s)`);
    return outputPath;
  } else if (filePath.endsWith('.gz')) {
    const outputPath = filePath.replace('.gz', '');
    await appendJobLog(jobId, `Decompressing .gz file...`);
    log('INFO', `Decompressing: ${filePath}`);
    
    const startTime = Date.now();
    execSync(`gunzip -f "${filePath}"`, { stdio: 'inherit' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    await appendJobLog(jobId, `Decompression complete: ${sizeMB} MB (took ${duration}s)`);
    return outputPath;
  }
  
  await appendJobLog(jobId, `File does not need decompression`);
  return filePath;
};

// Get PCAP metadata using capinfos
const getPcapInfo = async (pcapPath, jobId) => {
  try {
    await appendJobLog(jobId, `Analyzing PCAP file with capinfos...`);
    log('INFO', `Analyzing PCAP: ${pcapPath}`);
    
    const output = execSync(`capinfos -M "${pcapPath}"`, { encoding: 'utf8' });
    
    const lines = output.split('\n');
    let duration = null;
    let packets = null;
    let startTime = null;
    let endTime = null;
    
    for (const line of lines) {
      if (line.includes('Capture duration:')) {
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
    
    const durationStr = duration ? `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s` : 'unknown';
    const packetsStr = packets ? packets.toLocaleString() : 'unknown';
    
    await appendJobLog(jobId, `PCAP analysis complete:`);
    await appendJobLog(jobId, `  - Duration: ${durationStr}`);
    await appendJobLog(jobId, `  - Packets: ${packetsStr}`);
    if (startTime) await appendJobLog(jobId, `  - Start time: ${startTime}`);
    if (endTime) await appendJobLog(jobId, `  - End time: ${endTime}`);
    
    log('INFO', `PCAP info: duration=${duration}s, packets=${packets}`);
    
    return { duration, packets, startTime, endTime };
  } catch (error) {
    await appendJobLog(jobId, `Warning: Could not analyze PCAP (capinfos failed)`);
    log('WARN', `Failed to get PCAP info: ${error.message}`);
    return { duration: null, packets: null, startTime: null, endTime: null };
  }
};

// Run mbsniffer with progress tracking
const runMbsniffer = (pcapPath, job, pcapInfo, jobContext, site) => {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', pcapPath,
      '-interval-batch', String(job.mbsniffer_interval_batch || 60),
      '-interval-min', String(job.mbsniffer_interval_min || 5),
    ];
    
    // Add endpoint if webhook URL is provided
    if (job.n8n_webhook_url) {
      args.push('-endpoint', job.n8n_webhook_url);
    }
    
    // Add site unique_id if available (the -k parameter)
    if (site?.unique_id) {
      args.push('-k', site.unique_id);
    }
    
    appendJobLog(job.id, `Starting mbsniffer processing...`);
    appendJobLog(job.id, `  - interval-batch: ${job.mbsniffer_interval_batch || 60}s`);
    appendJobLog(job.id, `  - interval-min: ${job.mbsniffer_interval_min || 5}s`);
    if (job.n8n_webhook_url) {
      appendJobLog(job.id, `  - webhook: ${job.n8n_webhook_url}`);
    }
    if (site?.unique_id) {
      appendJobLog(job.id, `  - site key (-k): ${site.unique_id}`);
    }
    
    log('INFO', `Running mbsniffer: ${config.MBSNIFFER_PATH} ${args.join(' ')}`);
    
    const mbsniffer = spawn(config.MBSNIFFER_PATH, args);
    
    // Store process reference for cleanup
    jobContext.process = mbsniffer;
    jobContext.processRunning = true;
    
    const startTime = Date.now();
    const totalDuration = pcapInfo.duration || 300; // Default 5 min if unknown
    let lastProgressUpdate = 0;
    let lastLoggedProgress = 0;
    
    // Progress update interval (every 2 seconds)
    const progressInterval = setInterval(async () => {
      if (!jobContext.processRunning) {
        clearInterval(progressInterval);
        return;
      }
      
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      
      // Estimate progress: processing step is 35-95% (60% range)
      const estimatedProgress = Math.min(elapsedSeconds / totalDuration, 1);
      const progress = Math.floor(35 + (estimatedProgress * 60));
      
      if (progress > lastProgressUpdate) {
        lastProgressUpdate = progress;
        await updateJobStatus(job.id, 'running', Math.min(progress, 95), 'processing', {
          elapsed_seconds: Math.floor(elapsedSeconds),
          total_duration: Math.floor(totalDuration),
        });
        
        // Log progress every 10%
        const progressDecile = Math.floor(progress / 10) * 10;
        if (progressDecile > lastLoggedProgress && progressDecile <= 90) {
          lastLoggedProgress = progressDecile;
          await appendJobLog(job.id, `Processing progress: ${progress}% (${Math.floor(elapsedSeconds)}s elapsed)`);
        }
      }
      
      // Check for cancellation
      const cancelled = await checkCancelled(job.id);
      if (cancelled) {
        appendJobLog(job.id, `Cancellation requested - stopping mbsniffer...`);
        log('INFO', 'Job cancelled, killing mbsniffer');
        jobContext.cancelled = true;
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
    
    mbsniffer.on('close', async (code, signal) => {
      clearInterval(progressInterval);
      jobContext.processRunning = false;
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      log('INFO', `mbsniffer exited with code ${code}, signal ${signal} after ${totalTime}s`);
      
      if (code === 0) {
        await appendJobLog(job.id, `mbsniffer completed successfully in ${totalTime}s`);
        resolve({ success: true, processingTime: totalTime });
      } else if (jobContext.cancelled) {
        await appendJobLog(job.id, `mbsniffer cancelled by user after ${totalTime}s`);
        reject(new Error('Job cancelled by user'));
      } else if (jobContext.shuttingDown) {
        await appendJobLog(job.id, `mbsniffer stopped due to agent shutdown after ${totalTime}s`);
        reject(new Error('Agent shutdown'));
      } else if (signal) {
        // Process was killed by a signal (SIGTERM, SIGKILL, etc.)
        await appendJobLog(job.id, `mbsniffer was terminated by signal ${signal} after ${totalTime}s`);
        reject(new Error(`Process terminated by signal ${signal}`));
      } else if (code === null) {
        // Process was killed
        await appendJobLog(job.id, `mbsniffer was killed after ${totalTime}s`);
        reject(new Error('Process was killed'));
      } else {
        await appendJobLog(job.id, `mbsniffer failed with exit code ${code} after ${totalTime}s`);
        reject(new Error(`mbsniffer exited with code ${code}`));
      }
    });
    
    mbsniffer.on('error', async (error) => {
      clearInterval(progressInterval);
      jobContext.processRunning = false;
      await appendJobLog(job.id, `mbsniffer error: ${error.message}`);
      reject(error);
    });
  });
};

// Process a single job
const processJob = async (job, pcapFile, site, s3Credentials) => {
  const workDir = path.join(config.WORK_DIR, job.id);
  const jobContext = {
    process: null,
    processRunning: false,
    cancelled: false,
    shuttingDown: false,
    lastProgress: 0,
  };
  
  // Register job in active jobs map
  activeJobs.set(job.id, jobContext);
  
  try {
    // Create work directory
    fs.mkdirSync(workDir, { recursive: true });
    
    await appendJobLog(job.id, `=== Job started ===`);
    await appendJobLog(job.id, `File: ${pcapFile.original_filename}`);
    await appendJobLog(job.id, `Size: ${(pcapFile.size_bytes / 1024 / 1024).toFixed(2)} MB`);
    await appendJobLog(job.id, `Site: ${site?.name || 'Unknown'}`);
    if (site?.unique_id) {
      await appendJobLog(job.id, `Site Key: ${site.unique_id}`);
    }
    if (job.sequence_group) {
      await appendJobLog(job.id, `Sequence: #${job.sequence_order} in group ${job.sequence_group.slice(0, 8)}...`);
    }
    await appendJobLog(job.id, `Work directory: ${workDir}`);
    
    // Step 1: Download (0-20%)
    log('INFO', 'Step 1: Downloading...');
    await appendJobLog(job.id, `--- Step 1/4: Download ---`);
    await updateJobStatus(job.id, 'downloading', 5, 'downloading');
    
    const downloadPath = path.join(workDir, pcapFile.filename);
    await downloadFromS3(pcapFile.s3_key, pcapFile.s3_bucket, downloadPath, s3Credentials, job.id);
    
    await updateJobStatus(job.id, 'downloading', 20, 'downloading');
    jobContext.lastProgress = 20;
    
    // Check for cancellation or shutdown
    if (await checkCancelled(job.id) || isShuttingDown) {
      throw new Error(isShuttingDown ? 'Agent shutdown' : 'Job cancelled by user');
    }
    
    // Step 2: Extract (20-30%)
    log('INFO', 'Step 2: Extracting...');
    await appendJobLog(job.id, `--- Step 2/4: Extract ---`);
    await updateJobStatus(job.id, 'extracting', 25, 'extracting');
    
    const pcapPath = await decompressFile(downloadPath, job.id);
    
    await updateJobStatus(job.id, 'extracting', 30, 'extracting');
    jobContext.lastProgress = 30;
    
    // Check for cancellation or shutdown
    if (await checkCancelled(job.id) || isShuttingDown) {
      throw new Error(isShuttingDown ? 'Agent shutdown' : 'Job cancelled by user');
    }
    
    // Step 3: Analyze PCAP (30-35%)
    log('INFO', 'Step 3: Analyzing PCAP...');
    await appendJobLog(job.id, `--- Step 3/4: Analyze ---`);
    await updateJobStatus(job.id, 'running', 32, 'analyzing');
    
    const pcapInfo = await getPcapInfo(pcapPath, job.id);
    
    // Update job with PCAP metadata
    await updateJobStatus(job.id, 'running', 35, 'processing', {
      pcap_duration: pcapInfo.duration,
      pcap_packets: pcapInfo.packets,
      pcap_start_time: pcapInfo.startTime,
      pcap_end_time: pcapInfo.endTime,
    });
    jobContext.lastProgress = 35;
    
    // Check for cancellation or shutdown
    if (await checkCancelled(job.id) || isShuttingDown) {
      throw new Error(isShuttingDown ? 'Agent shutdown' : 'Job cancelled by user');
    }
    
    // Step 4: Run mbsniffer (35-95%)
    log('INFO', 'Step 4: Running mbsniffer...');
    await appendJobLog(job.id, `--- Step 4/4: Process ---`);
    const result = await runMbsniffer(pcapPath, job, pcapInfo, jobContext, site);
    
    // Step 5: Complete (95-100%)
    log('INFO', 'Step 5: Finalizing...');
    await appendJobLog(job.id, `--- Finalizing ---`);
    await appendJobLog(job.id, `Total processing time: ${result.processingTime}s`);
    await appendJobLog(job.id, `=== Job completed successfully ===`);
    
    await updateJobStatus(job.id, 'completed', 100, 'completed', {
      processing_time: result.processingTime,
    });
    
    log('INFO', `Job ${job.id} completed successfully`);
    
  } catch (error) {
    log('ERROR', `Job ${job.id} failed: ${error.message}`);
    
    const isCancelled = error.message.includes('cancelled');
    const isShutdown = error.message.includes('shutdown') || error.message.includes('Agent shutdown');
    const isInterrupted = error.message.includes('terminated') || 
                          error.message.includes('killed') || 
                          error.message.includes('signal');
    
    if (isCancelled) {
      await appendJobLog(job.id, `=== Job cancelled ===`);
      await updateJobStatus(job.id, 'cancelled', jobContext.lastProgress, 'cancelled', {
        error_message: 'Job cancelled by user',
      });
    } else if (isShutdown) {
      await appendJobLog(job.id, `=== Job interrupted by agent shutdown at ${jobContext.lastProgress}% ===`);
      await updateJobStatus(job.id, 'error', jobContext.lastProgress, 'error', {
        error_message: `Agent shutdown - job interrupted at ${jobContext.lastProgress}%`,
      });
    } else if (isInterrupted) {
      await appendJobLog(job.id, `=== Job interrupted at ${jobContext.lastProgress}% ===`);
      await appendJobLog(job.id, `Reason: ${error.message}`);
      await updateJobStatus(job.id, 'error', jobContext.lastProgress, 'error', {
        error_message: `Job interrupted at ${jobContext.lastProgress}%: ${error.message}`,
      });
    } else {
      await appendJobLog(job.id, `=== Job failed ===`);
      await appendJobLog(job.id, `Error: ${error.message}`);
      await updateJobStatus(job.id, 'error', jobContext.lastProgress, 'error', {
        error_message: error.message,
      });
    }
    
  } finally {
    // Remove from active jobs
    activeJobs.delete(job.id);
    
    // Cleanup work directory
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
      log('DEBUG', `Cleaned up work directory: ${workDir}`);
    } catch (e) {
      log('WARN', `Failed to cleanup work directory: ${e.message}`);
    }
  }
};

// Main polling loop - now supports parallel processing
const pollForJobs = async () => {
  // Don't poll if shutting down
  if (isShuttingDown) {
    return;
  }
  
  // Check if we can take more jobs
  if (activeJobs.size >= MAX_CONCURRENT_JOBS) {
    log('DEBUG', `Already running ${activeJobs.size}/${MAX_CONCURRENT_JOBS} jobs, skipping poll`);
    return;
  }
  
  try {
    // Get S3 credentials
    const s3Credentials = await agentApi('get_s3_credentials');
    
    // Try to claim a job
    const result = await agentApi('claim_job');
    
    if (!result.job) {
      return;
    }
    
    const { job, pcap_file, site } = result;
    log('INFO', `Claimed job: ${job.id} (${activeJobs.size + 1}/${MAX_CONCURRENT_JOBS} active)`);
    log('INFO', `File: ${pcap_file.original_filename} (${(pcap_file.size_bytes / 1024 / 1024).toFixed(1)} MB)`);
    if (site?.unique_id) {
      log('INFO', `Site: ${site.name} (${site.unique_id})`);
    }
    if (job.sequence_group) {
      log('INFO', `Sequence: #${job.sequence_order} in group ${job.sequence_group.slice(0, 8)}...`);
    }
    
    // Process the job in background (don't await)
    processJob(job, pcap_file, site, s3Credentials).catch(error => {
      log('ERROR', `Unhandled error in job ${job.id}: ${error.message}`);
    });
    
  } catch (error) {
    log('ERROR', `Polling error: ${error.message}`);
  }
};

// Graceful shutdown handler - IMPROVED VERSION
const shutdown = async (signal) => {
  // Prevent multiple shutdown calls
  if (isShuttingDown) {
    log('WARN', 'Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  log('INFO', `Received ${signal}, shutting down gracefully...`);
  log('INFO', `Active jobs to terminate: ${activeJobs.size}`);
  
  if (activeJobs.size === 0) {
    log('INFO', 'No active jobs, exiting immediately');
    process.exit(0);
  }
  
  // Collect all shutdown promises
  const shutdownPromises = [];
  
  // Kill all active processes and update their status
  for (const [jobId, context] of activeJobs) {
    log('INFO', `Terminating job ${jobId} at ${context.lastProgress}%...`);
    
    // Mark context as shutting down
    context.shuttingDown = true;
    
    // Kill the process if running
    if (context.process && context.processRunning) {
      context.process.kill('SIGTERM');
    }
    
    // Create a promise to update the job status
    const updatePromise = (async () => {
      try {
        await appendJobLog(jobId, `Agent shutdown (${signal}) - terminating job at ${context.lastProgress}%`);
        await updateJobStatus(jobId, 'error', context.lastProgress, 'error', {
          error_message: `Agent shutdown (${signal}) - job interrupted at ${context.lastProgress}%`,
        });
        log('INFO', `Job ${jobId} status updated to error`);
      } catch (error) {
        log('ERROR', `Failed to update job ${jobId} status: ${error.message}`);
      }
    })();
    
    shutdownPromises.push(updatePromise);
  }
  
  // Wait for all status updates to complete (with timeout)
  log('INFO', `Waiting for ${shutdownPromises.length} job status updates...`);
  
  try {
    await Promise.race([
      Promise.all(shutdownPromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
    log('INFO', 'All job statuses updated successfully');
  } catch (error) {
    log('WARN', `Some job status updates may have failed: ${error.message}`);
  }
  
  // Clean up work directories
  for (const [jobId] of activeJobs) {
    const workDir = path.join(config.WORK_DIR, jobId);
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
      log('DEBUG', `Cleaned up work directory: ${workDir}`);
    } catch (e) {
      log('WARN', `Failed to cleanup work directory ${workDir}: ${e.message}`);
    }
  }
  
  log('INFO', 'Shutdown complete');
  process.exit(0);
};

// Start the agent
const main = async () => {
  log('INFO', '========================================');
  log('INFO', '   PCAP Processing Agent Started');
  log('INFO', '========================================');
  log('INFO', `Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
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
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log('ERROR', `Uncaught exception: ${error.message}`);
  log('ERROR', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `Unhandled rejection at: ${promise}, reason: ${reason}`);
});

// Run
main().catch((error) => {
  log('ERROR', `Fatal error: ${error.message}`);
  process.exit(1);
});