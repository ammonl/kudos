/*
  # Update notification queue unique constraint

  1. Changes
    - Drop existing unique constraint on (user_id, kudos_id, type)
    - Add new unique constraint on (user_id, kudos_id)
    - Update indexes for better performance

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop existing unique constraint
ALTER TABLE notification_queue
DROP
CONSTRAINT IF EXISTS unique_user_kudos_notification;

-- Add new unique constraint on user_id and kudos_id only
ALTER TABLE notification_queue
    ADD CONSTRAINT unique_user_kudos_notification
        UNIQUE (user_id, kudos_id);

-- Drop old index that included type
DROP INDEX IF EXISTS idx_notification_queue_user_kudos_type;

-- Create new index for the unique constraint
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_kudos
    ON notification_queue (user_id, kudos_id);

-- Keep status index for notification processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_status
    ON notification_queue (status);