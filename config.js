// Agent configuration
// Load from environment variables with defaults

module.exports = {
  // Supabase configuration
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://jgclhfwigmxmqyhqngcm.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  
  // Agent authentication
  AGENT_SECRET: process.env.AGENT_SECRET_KEY || 'change-me-in-production',
  
  // Processing configuration
  MBSNIFFER_PATH: process.env.MBSNIFFER_PATH || '/usr/local/bin/mbsniffer',
  WORK_DIR: process.env.WORK_DIR || '/tmp/pcap-agent',
  
  // Polling configuration
  POLL_INTERVAL: parseInt(process.env.POLL_INTERVAL) || 5000, // 5 seconds
  
  // Parallel processing
  MAX_CONCURRENT_JOBS: parseInt(process.env.MAX_CONCURRENT_JOBS) || 3,
};