// Submit single job
  const handleSubmitJob = async () => {
    if (!selectedFile || !selectedSiteId || !user) return;
    
    setSubmitting(true);
    
    const { error } = await supabase
      .from('processing_jobs')
      .insert({
        pcap_file_id: selectedFile.id,
        site_id: selectedSiteId,
        n8n_webhook_url: webhookUrl || null,
        status: 'pending',
        current_step: 'pending',
        progress: 0,
        created_by: user.id,
        pcap_filename: selectedFile.original_filename,
        pcap_size_bytes: selectedFile.size_bytes,
        mbsniffer_interval_batch: parseInt(intervalBatch) || 60,
        mbsniffer_interval_min: parseInt(intervalMin) || 5,
        output_log: `[${new Date().toISOString().split('T')[1].split('.')[0]}] Job created, waiting for agent...`,
      });
    
    if (error) {
      toast.error('Error creating job: ' + error.message);
    } else {
      toast.success('Job created! Waiting for agent to process.');
      setDialogOpen(false);
      setActiveTab('jobs');
    }
    
    setSubmitting(false);
  };