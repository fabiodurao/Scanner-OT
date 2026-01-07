import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jgclhfwigmxmqyhqngcm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnY2xoZndpZ214bXF5aHFuZ2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MjU3OTksImV4cCI6MjA3OTAwMTc5OX0.U1llCdG1mcofRDT59r8jcHngBiW82Tu7NTQPhi-ahlE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);