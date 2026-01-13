// Submit batch jobs (all files in session)
  const handleSubmitBatchJobs = async () => {
    if (!selectedSiteId || !user || batchFiles.length === 0) return;
    
    setBatchSubmitting(true);
    
    // Generate a unique sequence_group for this batch
    const sequenceGroup = generateUUID();
    
    // Create jobs from batch files in their current order
    const jobsToInsert = batchFiles.map((file, index) => ({
      pcap_file_id: file.id,
      site_id: selectedSiteId,
      n8n_webhook_url: batchWebhookUrl || null,
      status: 'pending',
      current_step: 'pending',
      progress: 0,
      created_by: user.id,
      pcap_filename: file.original_filename,
      pcap_size_bytes: file.size_bytes,
      mbsniffer_interval_batch: parseInt(batchIntervalBatch) || 60,
      mbsniffer_interval_min: parseInt(batchIntervalMin) || 5,
      output_log: `[${new Date().toISOString().split('T')[1].split('.')[0]}] Job created (${index + 1}/${batchFiles.length} in sequence), waiting for agent...`,
      sequence_group: sequenceGroup,
      sequence_order: index + 1,
    }));
    
    const { data, error } = await supabase
      .from('processing_jobs')
      .insert(jobsToInsert)
      .select();
    
    if (error) {
      toast.error('Error creating batch jobs: ' + error.message);
    } else {
      toast.success(`${batchFiles.length} jobs created! They will be processed sequentially.`);
      if (data) {
        setJobs(prev => {
          const existingIds = new Set(prev.map(j => j.id));
          const newJobs = data.filter(j => !existingIds.has(j.id)) as ProcessingJob[];
          return [...newJobs, ...prev];
        });
      }
      setBatchDialogOpen(false);
      setActiveTab('jobs');
    }
    
    setBatchSubmitting(false);
  };