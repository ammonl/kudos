/*
  # Add unique constraint for notification channels

  1. Changes
    - Add unique constraint for user_id, kudos_id, and channel
    - Drop existing indexes and constraints
    - Create new indexes for performance
    - Update notification functions to handle uniqueness

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop existing unique constraint if it exists
DO
$$
BEGIN
ALTER TABLE notification_queue
DROP
CONSTRAINT IF EXISTS unique_user_kudos_notification;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Drop existing indexes if they exist
DO
$$
BEGIN
DROP INDEX IF EXISTS idx_notification_queue_user_kudos;
DROP INDEX IF EXISTS idx_notification_queue_status;
DROP INDEX IF EXISTS idx_notification_queue_kudos;
DROP INDEX IF EXISTS idx_notification_queue_user;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add unique constraint for user_id, kudos_id, and channel
ALTER TABLE notification_queue
    ADD CONSTRAINT unique_user_kudos_channel
        UNIQUE (user_id, kudos_id, channel);

-- Create new indexes for performance
CREATE INDEX idx_notification_queue_kudos ON notification_queue (kudos_id);
CREATE INDEX idx_notification_queue_user ON notification_queue (user_id);
CREATE INDEX idx_notification_queue_status ON notification_queue (status);

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

-- Get kudos data to check notify_manager flag
SELECT notify_manager
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