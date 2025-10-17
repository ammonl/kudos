/*
  # Update notification functions to skip manager notifications when manager is the kudos giver

  1. Changes
    - Update create_kudos_notifications function
    - Update create_additional_recipient_notifications function
    - Add check to prevent manager notifications when manager is the kudos giver

  2. Security
    - No changes to RLS policies
    - Functions remain security definer
*/

-- Update the function for kudos notifications
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
      id,
      user_id,
      type,
      kudos_id,
      channel,
      status
    ) VALUES (
      gen_random_uuid(),
      NEW.recipient_id,
      'kudos_received',
      NEW.id,
      'email',
      'pending'
    )
    ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;

  IF
recipient_settings.notify_by_slack THEN
    INSERT INTO notification_queue (
      id,
      user_id,
      type,
      kudos_id,
      channel,
      status
    ) VALUES (
      gen_random_uuid(),
      NEW.recipient_id,
      'kudos_received',
      NEW.id,
      'slack',
      'pending'
    )
    ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;

  -- Notify manager if enabled, exists, and manager is not the kudos giver
  IF
NEW.notify_manager AND 
     recipient_settings.manager_id IS NOT NULL AND 
     recipient_settings.manager_id != NEW.giver_id THEN
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
        id,
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        gen_random_uuid(),
        recipient_settings.manager_id,
        'manager_notification',
        NEW.id,
        'email',
        'pending'
      )
      ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;

    IF
manager_settings.notify_by_slack THEN
      INSERT INTO notification_queue (
        id,
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        gen_random_uuid(),
        recipient_settings.manager_id,
        'manager_notification',
        NEW.id,
        'slack',
        'pending'
      )
      ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

-- Get kudos data to check notify_manager flag and giver_id
SELECT notify_manager, giver_id
INTO kudos_data
FROM kudos
WHERE id = NEW.kudos_id;

-- Create notification for additional recipient
IF
recipient_settings.notify_by_email THEN
    INSERT INTO notification_queue (
      id,
      user_id,
      type,
      kudos_id,
      channel,
      status
    ) VALUES (
      gen_random_uuid(),
      NEW.recipient_id,
      'kudos_received',
      NEW.kudos_id,
      'email',
      'pending'
    )
    ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;

  IF
recipient_settings.notify_by_slack THEN
    INSERT INTO notification_queue (
      id,
      user_id,
      type,
      kudos_id,
      channel,
      status
    ) VALUES (
      gen_random_uuid(),
      NEW.recipient_id,
      'kudos_received',
      NEW.kudos_id,
      'slack',
      'pending'
    )
    ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;

  -- Notify manager if enabled, exists, and manager is not the kudos giver
  IF
kudos_data.notify_manager AND 
     recipient_settings.manager_id IS NOT NULL AND 
     recipient_settings.manager_id != kudos_data.giver_id THEN
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
        id,
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        gen_random_uuid(),
        recipient_settings.manager_id,
        'manager_notification',
        NEW.kudos_id,
        'email',
        'pending'
      )
      ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;

    IF
manager_settings.notify_by_slack THEN
      INSERT INTO notification_queue (
        id,
        user_id,
        type,
        kudos_id,
        channel,
        status
      ) VALUES (
        gen_random_uuid(),
        recipient_settings.manager_id,
        'manager_notification',
        NEW.kudos_id,
        'slack',
        'pending'
      )
      ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;