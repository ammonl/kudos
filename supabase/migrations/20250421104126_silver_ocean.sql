/*
  # Update notification constraint to allow other_notification

  1. Changes
    - Drop existing constraint
    - Add updated constraint that includes other_notification type
    - Update indexes for better performance

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop existing constraint
ALTER TABLE notification_queue
DROP
CONSTRAINT IF EXISTS valid_kudos_notification;

-- Add updated constraint including other_notification
ALTER TABLE notification_queue
    ADD CONSTRAINT valid_kudos_notification
        CHECK (
            (
                (
                    type IN ('kudos_received', 'manager_notification', 'other_notification')
                        AND (kudos_id IS NOT NULL OR message IS NOT NULL)
                    )
                    OR
                (
                    type = 'weekly_reminder'
                        AND kudos_id IS NULL
                    )
                )
            );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_type
    ON notification_queue (status, type);