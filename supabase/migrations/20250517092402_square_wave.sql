/*
  # Update weekly reminder notifications

  1. Changes
    - Add function to get user's kudos activity
    - Add function to get leaderboard position
    - Update weekly reminder notification content
    - Add proper indexes for performance

  2. Security
    - Functions run with elevated privileges
    - Maintains existing security model
*/

-- Create function to get user's kudos activity
CREATE
OR REPLACE FUNCTION get_user_kudos_activity(p_user_id uuid, p_days integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_result json;
BEGIN
SELECT json_build_object(
               'kudos_received', (SELECT COUNT(*)
                                  FROM kudos k
                                  WHERE k.recipient_id = p_user_id
                                    AND k.created_at > CURRENT_DATE - p_days * INTERVAL '1 day' ),
    'kudos_given', (
      SELECT COUNT(*)
      FROM kudos k
      WHERE k.giver_id = p_user_id
      AND k.created_at > CURRENT_DATE - p_days * INTERVAL '1 day'
    ),
    'top_category', (
      SELECT c.name
      FROM kudos k
      JOIN categories c ON c.id = k.category_id
      WHERE k.recipient_id = p_user_id
      AND k.created_at > CURRENT_DATE - p_days * INTERVAL '1 day'
      GROUP BY c.name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  )
INTO v_result;

RETURN v_result;
END;
$$;

-- Create function to get user's leaderboard position
CREATE
OR REPLACE FUNCTION get_user_leaderboard_position(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_result json;
BEGIN
WITH user_stats AS (SELECT u.id,
                           u.name,
                           COALESCE(SUM(CASE WHEN k.giver_id = u.id THEN 1 ELSE 0 END), 0)      as kudos_given,
                           COALESCE(SUM(CASE WHEN k.recipient_id = u.id THEN 3 ELSE 0 END), 0)  as kudos_received_points,
                           COALESCE(SUM(CASE WHEN kr.recipient_id = u.id THEN 3 ELSE 0 END), 0) as additional_points
                    FROM users u
                             LEFT JOIN kudos k ON (k.giver_id = u.id OR k.recipient_id = u.id)
                             LEFT JOIN kudos_recipients kr ON kr.recipient_id = u.id
                    WHERE k.created_at > CURRENT_DATE -
    INTERVAL '7 days'
    OR kr.kudos_id IN (SELECT id FROM kudos WHERE created_at
   > CURRENT_DATE - INTERVAL '7 days')
GROUP BY u.id, u.name
    ),
    ranked_users AS (
SELECT
    id, name, kudos_given + kudos_received_points + additional_points as total_points, RANK() OVER (ORDER BY kudos_given + kudos_received_points + additional_points DESC) as rank
FROM user_stats
    )
SELECT json_build_object(
               'rank', ru.rank,
               'total_points', ru.total_points,
               'top_user', (SELECT json_build_object('name', name, 'points', total_points)
                            FROM ranked_users
                            WHERE rank = 1
                   LIMIT 1 )
  )
INTO v_result
FROM ranked_users ru
WHERE ru.id = p_user_id;

RETURN COALESCE(v_result, json_build_object(
        'rank', 0,
        'total_points', 0,
        'top_user', NULL
                          ));
END;
$$;

-- Update the weekly reminder function
CREATE
OR REPLACE FUNCTION schedule_weekly_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
user_record record;
  activity
json;
  leaderboard
json;
  message
text;
BEGIN
  -- Get all users who have opted in for reminders
FOR user_record IN
SELECT u.id, u.name, u.email
FROM users u
         JOIN settings s ON s.user_id = u.id
WHERE s.reminder_opt_in = true LOOP
    -- Get user's activity
    activity := get_user_kudos_activity(user_record.id, 7);
leaderboard
:= get_user_leaderboard_position(user_record.id);

    -- Construct personalized message
    message
:= format(
      'Hi %s! Here''s your weekly Kudos update:

Your Activity This Week:
• You received %s kudos
• You gave %s kudos
%s

Leaderboard Position: %s
Total Points: %s
Current Leader: %s with %s points

Give kudos to your colleagues and climb the leaderboard!',
      user_record.name,
      (activity->>'kudos_received')::text,
      (activity->>'kudos_given')::text,
      CASE WHEN activity->>'top_category' IS NOT NULL 
        THEN format(E'\n• Most received in category: %s', activity->>'top_category')
        ELSE ''
      END,
      (leaderboard->>'rank')::text,
      (leaderboard->>'total_points')::text,
      (leaderboard->'top_user'->>'name')::text,
      (leaderboard->'top_user'->>'points')::text
    );

    -- Create notification queue entry
INSERT INTO notification_queue (id,
                                user_id,
                                type,
                                status,
                                channel,
                                message)
VALUES (gen_random_uuid(),
        user_record.id,
        'weekly_reminder',
        'pending',
        'email',
        message);

-- If user has Slack enabled, send there too
IF
EXISTS (
      SELECT 1 FROM settings
      WHERE user_id = user_record.id
      AND notify_by_slack = true
      AND slack_user_id IS NOT NULL
    ) THEN
      INSERT INTO notification_queue (
        id,
        user_id,
        type,
        status,
        channel,
        message
      ) VALUES (
        gen_random_uuid(),
        user_record.id,
        'weekly_reminder',
        'pending',
        'slack',
        message
      );
END IF;
END LOOP;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kudos_created_at ON kudos(created_at);
CREATE INDEX IF NOT EXISTS idx_kudos_recipients_kudos_id ON kudos_recipients(kudos_id);