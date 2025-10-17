/*
  # Fix notification queue indexes and constraints

  1. Changes
    - Drop existing unique constraint
    - Drop existing indexes safely
    - Create new indexes for performance
    - Update notification functions
    - Set proper security context

  2. Security
    - Functions run with elevated privileges
    - Maintain existing security model
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

-- Create new indexes for performance
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_notification_queue_kudos'
  ) THEN
CREATE INDEX idx_notification_queue_kudos ON notification_queue (kudos_id);
END IF;

  IF
NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_notification_queue_user'
  ) THEN
CREATE INDEX idx_notification_queue_user ON notification_queue (user_id);
END IF;

  IF
NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_notification_queue_status'
  ) THEN
CREATE INDEX idx_notification_queue_status ON notification_queue (status);
END IF;
END $$;

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
    );
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
      );
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
      );
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;