/*
  # Add notification processing function and trigger

  1. Changes
    - Create function to process kudos_notifications entries
    - Add trigger to automatically process new notifications
    - Add function to create notification queue entries

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Create function to process kudos notifications
CREATE
OR REPLACE FUNCTION process_kudos_notifications()
RETURNS TRIGGER AS $$
DECLARE
kudos_data record;
  recipient_data
record;
  giver_data
record;
  additional_recipients
text;
BEGIN
  -- Get kudos data including giver, recipient, and category
SELECT k.*,
       g.name as giver_name,
       r.name as recipient_name,
       c.name as category_name
INTO kudos_data
FROM kudos k
         JOIN users g ON g.id = k.giver_id
         JOIN users r ON r.id = k.recipient_id
         JOIN categories c ON c.id = k.category_id
WHERE k.id = NEW.kudos_id;

-- Get recipient data
SELECT name, email
INTO recipient_data
FROM users
WHERE id = NEW.user_id;

-- Get additional recipients if any
SELECT string_agg(u.name, ', ')
INTO additional_recipients
FROM kudos_recipients kr
         JOIN users u ON u.id = kr.recipient_id
WHERE kr.kudos_id = NEW.kudos_id;

-- Create notification queue entry
INSERT INTO notification_queue (user_id,
                                type,
                                kudos_id,
                                status,
                                channel)
SELECT NEW.user_id,
       CASE
           WHEN NEW.user_id = kudos_data.recipient_id THEN 'kudos_received'::notification_type
           WHEN EXISTS (SELECT 1
                        FROM users u
                        WHERE u.id = kudos_data.recipient_id
                          AND u.manager_id = NEW.user_id) THEN 'manager_notification'::notification_type
           ELSE 'kudos_received'::notification_type
           END,
       NEW.kudos_id,
       'pending'::notification_status, CASE
                                           WHEN EXISTS (SELECT 1
                                                        FROM settings s
                                                        WHERE s.user_id = NEW.user_id
                                                          AND s.notify_by_slack = true) THEN 'slack'::notification_channel
                                           ELSE 'email'::notification_channel
    END WHERE NOT EXISTS (
    -- Prevent duplicate notifications
    SELECT 1 FROM notification_queue
    WHERE user_id = NEW.user_id
    AND kudos_id = NEW.kudos_id
    AND type = CASE 
      WHEN NEW.user_id = kudos_data.recipient_id THEN 'kudos_received'::notification_type
      WHEN EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = kudos_data.recipient_id 
        AND u.manager_id = NEW.user_id
      ) THEN 'manager_notification'::notification_type
      ELSE 'kudos_received'::notification_type
    END
  );

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Create trigger for kudos notifications
CREATE TRIGGER process_kudos_notifications_trigger
    AFTER INSERT
    ON kudos_notifications
    FOR EACH ROW
    EXECUTE FUNCTION process_kudos_notifications();

-- Add index to improve notification processing performance
CREATE INDEX IF NOT EXISTS idx_kudos_notifications_status
    ON kudos_notifications (kudos_id, user_id);