/*
  # Fix notification function security and policies

  1. Changes
    - Drop existing policies
    - Make notification functions run with elevated privileges
    - Add policy for viewing own notifications
    - Add policy for database functions
    - Add performance index

  2. Security
    - Functions run with elevated privileges via SECURITY DEFINER
    - Users can only view their own notifications
    - Updates restricted to database functions
*/

-- First, drop all existing policies
DROP
POLICY IF EXISTS "Users can insert notifications" ON notification_queue;
DROP
POLICY IF EXISTS "Users can view their own notifications" ON notification_queue;
DROP
POLICY IF EXISTS "Database functions can update notifications" ON notification_queue;

-- Make the notification functions run with elevated privileges
ALTER FUNCTION create_additional_recipient_notifications() SECURITY DEFINER;
ALTER FUNCTION process_kudos_notifications() SECURITY DEFINER;

-- Add policy for viewing own notifications
CREATE
POLICY "Users can view their own notifications"
  ON notification_queue
  FOR
SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Add policy for database functions to update notifications
CREATE
POLICY "Database functions can update notifications"
  ON notification_queue
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Create index to improve policy performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_kudos
    ON notification_queue (user_id, kudos_id);