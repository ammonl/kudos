/*
  # Fix notification queue policies and functions

  1. Changes
    - Drop existing policies
    - Add policy for viewing own notifications
    - Add policy for database functions
    - Make notification functions run with elevated privileges
    - Add performance indexes

  2. Security
    - Functions run with elevated privileges via SECURITY DEFINER
    - Users can only view their own notifications
    - Updates restricted to database functions
*/

-- Drop existing policies
DROP
POLICY IF EXISTS "Users can view their own notifications" ON notification_queue;
DROP
POLICY IF EXISTS "Database functions can manage notifications" ON notification_queue;

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
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_kudos
    ON notification_queue (user_id, kudos_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status_type
    ON notification_queue (status, type);