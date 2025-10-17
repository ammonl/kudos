/*
  # Refactor kudos table to remove primary recipient

  1. Changes
    - Remove recipient_id column from kudos table
    - Update all database functions to work with kudos_recipients table only
    - Update views to handle the new structure
    - Update notification functions
    - Migrate existing data

  2. Security
    - Maintain existing RLS policies
    - Update functions to work with new structure
*/

-- First, migrate existing data from kudos.recipient_id to kudos_recipients
INSERT INTO kudos_recipients (kudos_id, recipient_id)
SELECT id, recipient_id
FROM kudos
WHERE recipient_id IS NOT NULL ON CONFLICT (kudos_id, recipient_id) DO NOTHING;

-- Drop existing views that depend on recipient_id
DROP VIEW IF EXISTS kudos_stats_weekly CASCADE;
DROP VIEW IF EXISTS kudos_stats_monthly CASCADE;
DROP VIEW IF EXISTS top_kudos_recipients CASCADE;

-- Remove recipient_id column from kudos table
ALTER TABLE kudos DROP COLUMN IF EXISTS recipient_id;

-- Update constraint to remove recipient_id check
ALTER TABLE kudos DROP CONSTRAINT IF EXISTS different_users;

-- Recreate weekly stats view without primary recipient
CREATE VIEW kudos_stats_weekly AS
WITH kudos_counts AS (
    -- Count kudos given
    SELECT giver_id                       as user_id,
           COUNT(*)                       as kudos_given,
           0                              as kudos_received,
           date_trunc('week', created_at) as period
    FROM kudos
    WHERE created_at > CURRENT_DATE -
        INTERVAL '7 days'
        GROUP BY giver_id, date_trunc('week', created_at)
        UNION ALL

-- Count kudos received (all recipients)
SELECT kr.recipient_id                  as user_id,
       0                                as kudos_given,
       COUNT(*)                         as kudos_received,
       date_trunc('week', k.created_at) as period
FROM kudos_recipients kr
         JOIN kudos k ON k.id = kr.kudos_id
WHERE k.created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY kr.recipient_id, date_trunc('week', k.created_at)
    )
SELECT u.id                                                                       as user_id,
       u.name,
       COALESCE(SUM(kc.kudos_given), 0)                                           as kudos_given,
       COALESCE(SUM(kc.kudos_received), 0)                                        as kudos_received,
       COALESCE(SUM(kc.kudos_given), 0) + COALESCE(SUM(kc.kudos_received), 0) * 3 as total_points,
       MAX(kc.period)                                                             as period
FROM users u
         LEFT JOIN kudos_counts kc ON u.id = kc.user_id
GROUP BY u.id, u.name
HAVING COALESCE(SUM(kc.kudos_given), 0) + COALESCE(SUM(kc.kudos_received), 0) > 0
ORDER BY total_points DESC;

-- Recreate monthly stats view without primary recipient
CREATE VIEW kudos_stats_monthly AS
WITH kudos_counts AS (
    -- Count kudos given
    SELECT giver_id                        as user_id,
           COUNT(*)                        as kudos_given,
           0                               as kudos_received,
           date_trunc('month', created_at) as period
    FROM kudos
    WHERE created_at > CURRENT_DATE -
        INTERVAL '30 days'
        GROUP BY giver_id, date_trunc('month', created_at)
        UNION ALL

-- Count kudos received (all recipients)
SELECT kr.recipient_id                   as user_id,
       0                                 as kudos_given,
       COUNT(*)                          as kudos_received,
       date_trunc('month', k.created_at) as period
FROM kudos_recipients kr
         JOIN kudos k ON k.id = kr.kudos_id
WHERE k.created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY kr.recipient_id, date_trunc('month', k.created_at)
    )
SELECT u.id                                                                       as user_id,
       u.name,
       COALESCE(SUM(kc.kudos_given), 0)                                           as kudos_given,
       COALESCE(SUM(kc.kudos_received), 0)                                        as kudos_received,
       COALESCE(SUM(kc.kudos_given), 0) + COALESCE(SUM(kc.kudos_received), 0) * 3 as total_points,
       MAX(kc.period)                                                             as period
FROM users u
         LEFT JOIN kudos_counts kc ON u.id = kc.user_id
GROUP BY u.id, u.name
HAVING COALESCE(SUM(kc.kudos_given), 0) + COALESCE(SUM(kc.kudos_received), 0) > 0
ORDER BY total_points DESC;

-- Recreate top recipients view without primary recipient
CREATE VIEW top_kudos_recipients AS
WITH category_counts AS (SELECT kr.recipient_id as user_id,
                                c.name          as category,
                                COUNT(*) as count,
    ROW_NUMBER(
) OVER (PARTITION BY kr.recipient_id ORDER BY COUNT (*
) DESC
) as category_rank
    FROM kudos_recipients kr
    JOIN kudos k ON k.id = kr.kudos_id
    JOIN categories c ON c.id = k.category_id
    WHERE k.created_at > CURRENT_DATE - INTERVAL '30 days'
    GROUP BY kr.recipient_id, c.name
)
SELECT u.id        as user_id,
       u.name,
       cc.category as top_category,
       cc.count    as category_count
FROM users u
         JOIN category_counts cc ON u.id = cc.user_id
WHERE cc.category_rank = 1
ORDER BY cc.count DESC;

-- Grant permissions to authenticated users
GRANT SELECT ON kudos_stats_weekly TO authenticated;
GRANT SELECT ON kudos_stats_monthly TO authenticated;
GRANT SELECT ON top_kudos_recipients TO authenticated;

-- Update create_kudos_notifications function
CREATE
OR REPLACE FUNCTION create_kudos_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is now triggered only when kudos_recipients are inserted
  -- The main kudos creation no longer handles notifications directly
RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update create_additional_recipient_notifications function to handle all recipients
CREATE
OR REPLACE FUNCTION create_recipient_notifications()
RETURNS TRIGGER AS $$
DECLARE
recipient_settings record;
  manager_settings
record;
  kudos_data
record;
  is_manager_recipient
boolean;
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
SELECT notify_manager, giver_id, message
INTO kudos_data
FROM kudos
WHERE id = NEW.kudos_id;

-- Create notification for recipient
IF
recipient_settings.notify_by_email THEN
    INSERT INTO notification_queue (
      id,
      user_id,
      type,
      kudos_id,
      channel,
      status,
      message
    ) VALUES (
      gen_random_uuid(),
      NEW.recipient_id,
      'kudos_received',
      NEW.kudos_id,
      'email',
      'pending',
      kudos_data.message
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
      status,
      message
    ) VALUES (
      gen_random_uuid(),
      NEW.recipient_id,
      'kudos_received',
      NEW.kudos_id,
      'slack',
      'pending',
      kudos_data.message
    )
    ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;

  -- Check if the manager is also a recipient of the same kudos
  is_manager_recipient
:= EXISTS (
    SELECT 1
    FROM kudos_recipients
    WHERE kudos_id = NEW.kudos_id AND recipient_id = recipient_settings.manager_id
  );

  -- Notify manager if enabled, exists, and manager is not the kudos giver or a recipient
  IF
kudos_data.notify_manager AND 
     recipient_settings.manager_id IS NOT NULL AND 
     recipient_settings.manager_id != kudos_data.giver_id AND
     NOT is_manager_recipient THEN
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
        status,
        message
      ) VALUES (
        gen_random_uuid(),
        recipient_settings.manager_id,
        'manager_notification',
        NEW.kudos_id,
        'email',
        'pending',
        kudos_data.message
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
        status,
        message
      ) VALUES (
        gen_random_uuid(),
        recipient_settings.manager_id,
        'manager_notification',
        NEW.kudos_id,
        'slack',
        'pending',
        kudos_data.message
      )
      ON CONFLICT (user_id, kudos_id, channel) DO NOTHING;
END IF;
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old triggers
DROP TRIGGER IF EXISTS kudos_notification_trigger ON kudos;
DROP TRIGGER IF EXISTS additional_recipient_notification_trigger ON kudos_recipients;

-- Create new trigger for all recipients
CREATE TRIGGER recipient_notification_trigger
    AFTER INSERT
    ON kudos_recipients
    FOR EACH ROW
    EXECUTE FUNCTION create_recipient_notifications();

-- Update handle_user_deletion function to handle new structure
CREATE
OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- First, handle manager references
UPDATE users
SET manager_id = NULL
WHERE manager_id = OLD.id;

-- Delete kudos where user was the giver
DELETE
FROM kudos
WHERE giver_id = OLD.id;

-- Delete kudos_recipients entries (this will cascade delete kudos if no recipients remain)
DELETE
FROM kudos_recipients
WHERE recipient_id = OLD.id;

-- Delete notification queue entries
DELETE
FROM notification_queue
WHERE user_id = OLD.id;

-- Delete settings
DELETE
FROM settings
WHERE user_id = OLD.id;

RETURN OLD;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;