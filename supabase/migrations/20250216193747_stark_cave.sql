/*
  # Notification System Setup

  1. New Tables
    - `notification_queue`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `type` (enum: kudos_received, manager_notification, weekly_reminder)
      - `kudos_id` (uuid, optional, references kudos)
      - `status` (enum: pending, sent, failed)
      - `channel` (enum: email, slack)
      - `created_at` (timestamp)
      - `sent_at` (timestamp, optional)
      - `error` (text, optional)

  2. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
  'kudos_received',
  'manager_notification',
  'weekly_reminder'
);

-- Create notification status enum
CREATE TYPE notification_status AS ENUM (
  'pending',
  'processing',
  'sent',
  'failed'
);

-- Create notification channel enum
CREATE TYPE notification_channel AS ENUM (
  'email',
  'slack'
);

-- Create notification queue table
CREATE TABLE notification_queue
(
    id         UUID PRIMARY KEY              DEFAULT gen_random_uuid(),
    user_id    UUID                 NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       notification_type    NOT NULL,
    kudos_id   UUID REFERENCES kudos (id) ON DELETE CASCADE,
    status     notification_status  NOT NULL DEFAULT 'pending',
    channel    notification_channel NOT NULL,
    created_at TIMESTAMPTZ          NOT NULL DEFAULT now(),
    sent_at    TIMESTAMPTZ,
    error      TEXT,
    CONSTRAINT valid_kudos_notification CHECK (
        (type IN ('kudos_received', 'manager_notification') AND kudos_id IS NOT NULL) OR
        (type = 'weekly_reminder' AND kudos_id IS NULL)
        )
);

-- Create indexes
CREATE INDEX idx_notification_queue_status ON notification_queue (status);
CREATE INDEX idx_notification_queue_user ON notification_queue (user_id);
CREATE INDEX idx_notification_queue_kudos ON notification_queue (kudos_id);

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE
POLICY "Users can view their own notifications"
  ON notification_queue
  FOR
SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Create function to create notifications for kudos
CREATE
OR REPLACE FUNCTION create_kudos_notifications()
RETURNS TRIGGER AS $$
DECLARE
recipient_setting record;
  manager_id
uuid;
BEGIN
  -- Get primary recipient's notification settings and manager
SELECT s.notify_by_email,
       s.notify_by_slack,
       u.manager_id
INTO recipient_setting
FROM users u
         LEFT JOIN settings s ON s.user_id = u.id
WHERE u.id = NEW.recipient_id;

-- Create notification for primary recipient
IF
recipient_setting.notify_by_email THEN
    INSERT INTO notification_queue (user_id, type, kudos_id, channel)
    VALUES (NEW.recipient_id, 'kudos_received', NEW.id, 'email');
END IF;

  IF
recipient_setting.notify_by_slack THEN
    INSERT INTO notification_queue (user_id, type, kudos_id, channel)
    VALUES (NEW.recipient_id, 'kudos_received', NEW.id, 'slack');
END IF;

  -- Notify manager if enabled and exists
  IF
NEW.notify_manager AND recipient_setting.manager_id IS NOT NULL THEN
    -- Get manager's notification settings
SELECT notify_by_email,
       notify_by_slack
INTO recipient_setting
FROM settings
WHERE user_id = recipient_setting.manager_id;

IF
recipient_setting.notify_by_email THEN
      INSERT INTO notification_queue (user_id, type, kudos_id, channel)
      VALUES (recipient_setting.manager_id, 'manager_notification', NEW.id, 'email');
END IF;

    IF
recipient_setting.notify_by_slack THEN
      INSERT INTO notification_queue (user_id, type, kudos_id, channel)
      VALUES (recipient_setting.manager_id, 'manager_notification', NEW.id, 'slack');
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Create trigger for new kudos
CREATE TRIGGER kudos_notification_trigger
    AFTER INSERT
    ON kudos
    FOR EACH ROW
    EXECUTE FUNCTION create_kudos_notifications();

-- Create function to create notifications for additional recipients
CREATE
OR REPLACE FUNCTION create_additional_recipient_notifications()
RETURNS TRIGGER AS $$
DECLARE
recipient_setting record;
  manager_id
uuid;
BEGIN
  -- Get recipient's notification settings and manager
SELECT s.notify_by_email,
       s.notify_by_slack,
       u.manager_id
INTO recipient_setting
FROM users u
         LEFT JOIN settings s ON s.user_id = u.id
WHERE u.id = NEW.recipient_id;

-- Create notification for additional recipient
IF
recipient_setting.notify_by_email THEN
    INSERT INTO notification_queue (user_id, type, kudos_id, channel)
    VALUES (NEW.recipient_id, 'kudos_received', NEW.kudos_id, 'email');
END IF;

  IF
recipient_setting.notify_by_slack THEN
    INSERT INTO notification_queue (user_id, type, kudos_id, channel)
    VALUES (NEW.recipient_id, 'kudos_received', NEW.kudos_id, 'slack');
END IF;

  -- Notify manager if enabled and exists
SELECT notify_manager
INTO strict NEW.notify_manager
FROM kudos
WHERE id = NEW.kudos_id;

IF
NEW.notify_manager AND recipient_setting.manager_id IS NOT NULL THEN
    -- Get manager's notification settings
SELECT notify_by_email,
       notify_by_slack
INTO recipient_setting
FROM settings
WHERE user_id = recipient_setting.manager_id;

IF
recipient_setting.notify_by_email THEN
      INSERT INTO notification_queue (user_id, type, kudos_id, channel)
      VALUES (recipient_setting.manager_id, 'manager_notification', NEW.kudos_id, 'email');
END IF;

    IF
recipient_setting.notify_by_slack THEN
      INSERT INTO notification_queue (user_id, type, kudos_id, channel)
      VALUES (recipient_setting.manager_id, 'manager_notification', NEW.kudos_id, 'slack');
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Create trigger for additional recipients
CREATE TRIGGER additional_recipient_notification_trigger
    AFTER INSERT
    ON kudos_recipients
    FOR EACH ROW
    EXECUTE FUNCTION create_additional_recipient_notifications();

-- Create function to schedule weekly reminders
CREATE
OR REPLACE FUNCTION schedule_weekly_reminders()
RETURNS void AS $$
DECLARE
user_record record;
BEGIN
  -- Get all users who have opted in for reminders
FOR user_record IN
SELECT u.id, s.notify_by_email, s.notify_by_slack
FROM users u
         JOIN settings s ON s.user_id = u.id
WHERE s.reminder_opt_in = true LOOP
    -- Create email reminder if enabled
    IF user_record.notify_by_email THEN
INSERT
INTO notification_queue (user_id, type, channel)
VALUES (user_record.id, 'weekly_reminder', 'email');
END IF;

    -- Create Slack reminder if enabled
    IF
user_record.notify_by_slack THEN
      INSERT INTO notification_queue (user_id, type, channel)
      VALUES (user_record.id, 'weekly_reminder', 'slack');
END IF;
END LOOP;
END;
$$
LANGUAGE plpgsql;