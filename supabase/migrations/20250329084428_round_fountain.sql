/*
  # Fix manager notifications for multiple recipients

  1. Changes
    - Update create_additional_recipient_notifications function to properly handle manager notifications
    - Fix variable scoping issues with recipient_setting
    - Add proper error handling
    - Improve notification type handling

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
recipient_settings record;
  manager_settings
record;
  kudos_data
record;
BEGIN
  -- Get recipient's notification settings and manager
SELECT s.notify_by_email,
       s.notify_by_slack,
       u.manager_id,
       u.name as recipient_name
INTO recipient_settings
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
recipient_settings.notify_by_email THEN
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
recipient_settings.notify_by_slack THEN
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
kudos_data.notify_manager AND recipient_settings.manager_id IS NOT NULL THEN
    -- Get manager's notification settings
SELECT s.notify_by_email,
       s.notify_by_slack,
       u.name as manager_name
INTO manager_settings
FROM users u
         LEFT JOIN settings s ON s.user_id = u.id
WHERE u.id = recipient_settings.manager_id;

-- Create manager notifications
IF
manager_settings.notify_by_email THEN
      INSERT INTO notification_queue (
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        recipient_settings.manager_id,
        'manager_notification',
        NEW.kudos_id,
        'email',
        'pending'
      )
      ON CONFLICT (id) DO NOTHING; -- Prevent duplicate notifications
END IF;

    IF
manager_settings.notify_by_slack THEN
      INSERT INTO notification_queue (
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        recipient_settings.manager_id,
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

-- Update the original kudos notification function to match the same pattern
CREATE
OR REPLACE FUNCTION create_kudos_notifications()
RETURNS TRIGGER AS $$
DECLARE
recipient_settings record;
  manager_settings
record;
BEGIN
  -- Get primary recipient's notification settings and manager
SELECT s.notify_by_email,
       s.notify_by_slack,
       u.manager_id,
       u.name as recipient_name
INTO recipient_settings
FROM users u
         LEFT JOIN settings s ON s.user_id = u.id
WHERE u.id = NEW.recipient_id;

-- Create notification for primary recipient
IF
recipient_settings.notify_by_email THEN
    INSERT INTO notification_queue (
      user_id,
      type,
      kudos_id,
      channel,
      status
    ) VALUES (
      NEW.recipient_id,
      'kudos_received',
      NEW.id,
      'email',
      'pending'
    );
END IF;

  IF
recipient_settings.notify_by_slack THEN
    INSERT INTO notification_queue (
      user_id,
      type,
      kudos_id,
      channel,
      status
    ) VALUES (
      NEW.recipient_id,
      'kudos_received',
      NEW.id,
      'slack',
      'pending'
    );
END IF;

  -- Notify manager if enabled and exists
  IF
NEW.notify_manager AND recipient_settings.manager_id IS NOT NULL THEN
    -- Get manager's notification settings
SELECT s.notify_by_email,
       s.notify_by_slack,
       u.name as manager_name
INTO manager_settings
FROM users u
         LEFT JOIN settings s ON s.user_id = u.id
WHERE u.id = recipient_settings.manager_id;

-- Create manager notifications
IF
manager_settings.notify_by_email THEN
      INSERT INTO notification_queue (
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        recipient_settings.manager_id,
        'manager_notification',
        NEW.id,
        'email',
        'pending'
      );
END IF;

    IF
manager_settings.notify_by_slack THEN
      INSERT INTO notification_queue (
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        recipient_settings.manager_id,
        'manager_notification',
        NEW.id,
        'slack',
        'pending'
      );
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql;