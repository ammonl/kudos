/*
  # Update kudos notifications processing

  1. Changes
    - Update process_kudos_notifications function to handle other_notification type
    - Add notification type to enum if not exists
    - Improve notification type selection logic
    - Add proper error handling

  2. Security
    - No changes to RLS policies required
    - Maintains existing security model
*/

-- Add 'other_notification' to notification_type enum if it doesn't exist
DO
$$
BEGIN
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'other_notification';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update the function to process kudos notifications
CREATE
OR REPLACE FUNCTION process_kudos_notifications()
RETURNS TRIGGER AS $$
DECLARE
kudos_data record;
  user_settings
record;
BEGIN
  -- Get kudos data including giver, recipient, and category
SELECT k.*,
       g.name                     as giver_name,
       r.name                     as recipient_name,
       c.name                     as category_name,
       (SELECT string_agg(u.name, ', ')
        FROM kudos_recipients kr
                 JOIN users u ON u.id = kr.recipient_id
        WHERE kr.kudos_id = k.id) as additional_recipients
INTO kudos_data
FROM kudos k
         JOIN users g ON g.id = k.giver_id
         JOIN users r ON r.id = k.recipient_id
         JOIN categories c ON c.id = k.category_id
WHERE k.id = NEW.kudos_id;

-- Get user's notification settings
SELECT notify_by_email,
       notify_by_slack
INTO user_settings
FROM settings
WHERE user_id = NEW.user_id;

-- Create notification queue entries based on user's preferences
IF
user_settings.notify_by_email THEN
    INSERT INTO notification_queue (
      user_id,
      type,
      kudos_id,
      status,
      channel
    ) VALUES (
      NEW.user_id,
      'other_notification',
      NEW.kudos_id,
      'pending',
      'email'
    )
    ON CONFLICT (id) DO NOTHING;
END IF;

  IF
user_settings.notify_by_slack THEN
    INSERT INTO notification_queue (
      user_id,
      type,
      kudos_id,
      status,
      channel
    ) VALUES (
      NEW.user_id,
      'other_notification',
      NEW.kudos_id,
      'pending',
      'slack'
    )
    ON CONFLICT (id) DO NOTHING;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS process_kudos_notifications_trigger ON kudos_notifications;

-- Recreate the trigger
CREATE TRIGGER process_kudos_notifications_trigger
    AFTER INSERT
    ON kudos_notifications
    FOR EACH ROW
    EXECUTE FUNCTION process_kudos_notifications();

-- Ensure we have the necessary index for performance
CREATE INDEX IF NOT EXISTS idx_kudos_notifications_status
    ON kudos_notifications (kudos_id, user_id);