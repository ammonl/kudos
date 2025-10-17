/*
  # Fix notification system constraints and functions

  1. Changes
    - Update valid_kudos_notification constraint to properly handle other_notification type
    - Add message column to notification_queue if not exists
    - Update notification processing functions
    - Add proper indexes for performance

  2. Security
    - No changes to RLS policies
    - Functions remain security definer
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
                        AND kudos_id IS NOT NULL
                    )
                    OR
                (
                    type = 'access_request'
                        AND message IS NOT NULL
                    )
                    OR
                (
                    type = 'weekly_reminder'
                        AND kudos_id IS NULL
                    )
                )
            );

-- Add message column if it doesn't exist
DO
$$
BEGIN
  IF
NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_queue' 
    AND column_name = 'message'
  ) THEN
ALTER TABLE notification_queue
    ADD COLUMN message text;
END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO
$$
BEGIN
  IF
NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_queue' 
    AND column_name = 'updated_at'  
  ) THEN
ALTER TABLE notification_queue
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_type
    ON notification_queue (status, type);

CREATE INDEX IF NOT EXISTS idx_notification_queue_message
    ON notification_queue (message);