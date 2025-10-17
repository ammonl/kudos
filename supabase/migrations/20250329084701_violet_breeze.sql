/*
  # Fix notification queue policies and functions

  1. Changes
    - Drop existing policies on notification_queue
    - Add new policies with proper security context
    - Update notification functions to run with elevated privileges
    - Add proper indexes for performance

  2. Security
    - Functions run with SECURITY DEFINER to bypass RLS
    - Users can only view their own notifications
    - Database functions can perform all operations
*/

-- Drop existing policies
DROP
POLICY IF EXISTS "Users can view their own notifications" ON notification_queue;
DROP
POLICY IF EXISTS "Database functions can update notifications" ON notification_queue;
DROP
POLICY IF EXISTS "Users can insert notifications" ON notification_queue;

-- Make notification functions run with elevated privileges
ALTER FUNCTION create_kudos_notifications() SECURITY DEFINER;
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

-- Add policy for database functions
CREATE
POLICY "Database functions can manage notifications"
  ON notification_queue
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_kudos
    ON notification_queue (user_id, kudos_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status_type
    ON notification_queue (status, type);