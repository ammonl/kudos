/*
  # Update notification_type enum

  1. Changes
    - Add 'other_notification' to notification_type enum
    - Update constraint in notification_queue table
  
  2. Notes
    - Uses safe ALTER TYPE ADD VALUE approach
    - Updates table constraint to include new type
*/

-- Add 'other_notification' to notification_type enum if it doesn't exist
DO
$$
BEGIN
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'other_notification';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop existing constraint
ALTER TABLE notification_queue DROP CONSTRAINT IF EXISTS valid_kudos_notification;

-- Add updated constraint including other_notification
ALTER TABLE notification_queue
    ADD CONSTRAINT valid_kudos_notification
        CHECK (
            (
                (
                    type IN ('kudos_received', 'manager_notification', 'other_notification')
                        AND kudos_id IS NOT NULL
                    )
                    OR
                (
                    type = 'weekly_reminder'
                        AND kudos_id IS NULL
                    )
                )
            );