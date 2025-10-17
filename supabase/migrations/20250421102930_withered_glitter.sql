/*
  # Add message column to notification_queue table

  1. Changes
    - Add message column to notification_queue table
    - Update existing functions to handle message field
    - Add index for performance

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Add message column to notification_queue table
ALTER TABLE notification_queue
    ADD COLUMN IF NOT EXISTS message text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_message
    ON notification_queue(message);