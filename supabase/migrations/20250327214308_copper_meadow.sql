/*
  # Fix notification functions for additional recipients

  1. Changes
    - Update create_additional_recipient_notifications function to handle notifications correctly
    - Fix manager notification handling for additional recipients
    - Ensure proper notification types are used

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS additional_recipient_notification_trigger ON kudos_recipients;

-- Update the function for additional recipients
CREATE
OR REPLACE FUNCTION create_additional_recipient_notifications()
RETURNS TRIGGER AS $$
DECLARE
recipient_setting record;
  kudos_data
record;
BEGIN
  -- Get recipient's notification settings
SELECT s.notify_by_email,
       s.notify_by_slack,
       u.manager_id
INTO recipient_setting
FROM users u
         LEFT JOIN settings s ON s.user_id = u.id
WHERE u.id = NEW.recipient_id;

-- Get kudos data to check notify_manager flag
SELECT notify_manager
INTO kudos_data
FROM kudos
WHERE id = NEW.kudos_id;

-- Create notification for additional recipient
IF
recipient_setting.notify_by_email THEN
    INSERT INTO notification_queue (
      user_id,
      type,
      kudos_id,
      channel,
      status
    ) VALUES (
      NEW.recipient_id,
      'kudos_received',
      NEW.kudos_id,
      'email',
      'pending'
    );
END IF;

  IF
recipient_setting.notify_by_slack THEN
    INSERT INTO notification_queue (
      user_id,
      type,
      kudos_id,
      channel,
      status
    ) VALUES (
      NEW.recipient_id,
      'kudos_received',
      NEW.kudos_id,
      'slack',
      'pending'
    );
END IF;

  -- Notify manager if enabled and exists
  IF
kudos_data.notify_manager AND recipient_setting.manager_id IS NOT NULL THEN
    -- Get manager's notification settings
SELECT notify_by_email,
       notify_by_slack
INTO recipient_setting
FROM settings
WHERE user_id = recipient_setting.manager_id;

-- Create manager notifications
IF
recipient_setting.notify_by_email THEN
      INSERT INTO notification_queue (
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        recipient_setting.manager_id,
        'manager_notification',
        NEW.kudos_id,
        'email',
        'pending'
      )
      ON CONFLICT (id) DO NOTHING; -- Prevent duplicate notifications
END IF;

    IF
recipient_setting.notify_by_slack THEN
      INSERT INTO notification_queue (
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        recipient_setting.manager_id,
        'manager_notification',
        NEW.kudos_id,
        'slack',
        'pending'
      )
      ON CONFLICT (id) DO NOTHING; -- Prevent duplicate notifications
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER additional_recipient_notification_trigger
    AFTER INSERT
    ON kudos_recipients
    FOR EACH ROW
    EXECUTE FUNCTION create_additional_recipient_notifications();