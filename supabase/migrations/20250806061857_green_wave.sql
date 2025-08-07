/*
  # Update Report Status Constraints for Two-Stage ETL

  1. Changes
    - Update status check constraint to include new statuses
    - Add support for pending_approval, system_rejected, failed states
  
  2. New Status Flow
    - queued -> processing -> pending_approval -> approved -> completed
    - Or: queued -> processing -> system_rejected/failed (if validation fails)
    - Or: pending_approval -> rejected (if admin rejects)
*/

-- Drop existing constraint
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

-- Add updated constraint with new statuses
ALTER TABLE reports ADD CONSTRAINT reports_status_check 
CHECK (status = ANY (ARRAY[
  'queued'::text, 
  'processing'::text, 
  'pending_approval'::text,
  'approved'::text,
  'completed'::text, 
  'rejected'::text, 
  'system_rejected'::text, 
  'failed'::text
]));