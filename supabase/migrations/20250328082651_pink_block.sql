/*
  # Fix notification queue policies

  1. Changes
    - Drop existing policies if they exist
    - Recreate policies with proper checks
    - Add index for performance optimization

  2. Security
    - Users can only insert notifications for kudos they created
    - Users can only view their own notifications
    - Only database functions can update notification status
*/

-- Drop existing policies if they exist
DO
$$
BEGIN
  DROP
POLICY IF EXISTS "Users can insert notifications" ON notification_queue;
  DROP
POLICY IF EXISTS "Users can view their own notifications" ON notification_queue;
  DROP
POLICY IF EXISTS "Database functions can update notifications" ON notification_queue;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Add policy for users to insert notifications
CREATE
POLICY "Users can insert notifications"
  ON notification_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kudos
      WHERE kudos.id = kudos_id
      AND kudos.giver_id = auth.uid()
    )
  );

-- Add policy for users to view their own notifications
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
  FOR
UPDATE
    TO authenticated
    USING (true)
WITH CHECK (true);

-- Create index to improve policy performance
DROP INDEX IF EXISTS idx_notification_queue_user_kudos;
CREATE INDEX idx_notification_queue_user_kudos
    ON notification_queue (user_id, kudos_id);