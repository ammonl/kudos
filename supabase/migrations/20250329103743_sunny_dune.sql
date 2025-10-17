/*
  # Update notification system to prevent duplicates

  1. Changes
    - Add unique constraint to prevent duplicate notifications
    - Update notification functions to handle conflicts
    - Add composite index for performance

  2. Security
    - No changes to RLS policies
    - Functions remain security definer
*/

-- Add unique constraint to prevent duplicate notifications per user per kudos
ALTER TABLE notification_queue
    ADD CONSTRAINT unique_user_kudos_notification
        UNIQUE (user_id, kudos_id, type);

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
    )
    ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
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
    )
    ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
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
      )
      ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
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
      )
      ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

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
    )
    ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
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
    )
    ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
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
      ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
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
      ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Update the function for processing kudos notifications
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
    ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
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
    ON CONFLICT (user_id, kudos_id, type) DO NOTHING;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Create index to improve performance of unique constraint
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_kudos_type
    ON notification_queue (user_id, kudos_id, type);