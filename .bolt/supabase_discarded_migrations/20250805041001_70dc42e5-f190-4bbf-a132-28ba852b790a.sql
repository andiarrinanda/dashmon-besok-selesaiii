-- Enable pg_cron extension for background job processing
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP calls from pg_cron
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update reports table status to be more granular
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check 
CHECK (status IN ('queued', 'processing', 'completed', 'pending_approval', 'approved', 'rejected', 'system_rejected', 'failed'));

-- Update default status to 'queued' for new reports
ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'queued';

-- Create a pg_cron job that runs every minute to process queued reports
SELECT cron.schedule(
  'process-queued-reports',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
      url := 'https://vzpyamvunnhlzypzdbpf.supabase.co/functions/v1/process-report-worker',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cHlhbXZ1bm5obHp5cHpkYnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQ0MzIsImV4cCI6MjA2OTM2MDQzMn0.UaU6mywmh6_3szVV3CwPc3Q7aiyRxSeY8Ivb_yBryB0"}'::jsonb,
      body := '{"action": "process_queued_reports"}'::jsonb
    ) as request_id
  FROM reports 
  WHERE status IN ('queued', 'processing') 
  AND created_at > NOW() - INTERVAL '1 hour'
  LIMIT 1;
  $$
);