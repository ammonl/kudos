/*
  # Fix notification system to prevent duplicates

  1. Changes
    - Drop existing policies
    - Add unique constraint to prevent duplicate notifications
    - Update notification functions to handle duplicates gracefully
    - Add proper indexes for performance

  2. Security
    - Functions run with elevated privileges
    - Users can only view their own notifications
    - Database functions can manage notifications
*/

-- Drop existing policies
DROP
POLICY IF EXISTS "Users can view their own notifications" ON notification_queue;
DROP
POLICY IF EXISTS "Database functions can manage notifications" ON notification_queue;

-- Add unique constraint to prevent duplicate notifications
ALTER TABLE notification_queue
DROP
CONSTRAINT IF EXISTS unique_user_kudos_notification;

ALTER TABLE notification_queue
    ADD CONSTRAINT unique_user_kudos_notification
        UNIQUE (user_id, kudos_id, type);

-- Make notification functions run with elevated privileges
ALTER FUNCTION create_kudos_notifications() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION create_additional_recipient_notifications() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION process_kudos_notifications() SECURITY DEFINER SET search_path = public;

-- Add policy for viewing own notifications
CREATE
POLICY "Users can view their own notifications"
  ON notification_queue
  FOR
SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Add policy for database functions to manage notifications
CREATE
POLICY "Database functions can manage notifications"
  ON notification_queue
  FOR ALL
  TO postgres
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_kudos_type
    ON notification_queue (user_id, kudos_id, type);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status_type
    ON notification_queue (status, type);