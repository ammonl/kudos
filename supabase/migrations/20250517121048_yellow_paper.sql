-- Create function to schedule weekly reminders
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
record;
  leaderboard
record;
  message
text;
BEGIN
  -- Get all users who have opted in for reminders
FOR user_record IN
SELECT u.id, u.name, u.email
FROM users u
         JOIN settings s ON s.user_id = u.id
WHERE s.reminder_opt_in = true
    LOOP
-- Get user's activity
SELECT COUNT(*) FILTER (WHERE k.recipient_id = user_record.id) as received, COUNT(*) FILTER (WHERE k.giver_id = user_record.id) as given, (SELECT c.name
                                                                                                                                           FROM kudos k2
                                                                                                                                                    JOIN categories c ON c.id = k2.category_id
                                                                                                                                           WHERE k2.recipient_id = user_record.id
                                                                                                                                             AND k2.created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.name
ORDER BY COUNT (*) DESC
    LIMIT 1
    ) as top_category
INTO activity
FROM kudos k
WHERE (k.recipient_id = user_record.id
   OR k.giver_id = user_record.id)
  AND k.created_at
    > CURRENT_DATE - INTERVAL '7 days';

-- Get user's leaderboard position
WITH user_stats AS (SELECT u.id,
                           u.name,
                           COALESCE(SUM(CASE WHEN k.giver_id = u.id THEN 1 ELSE 0 END), 0) +
                           COALESCE(SUM(CASE WHEN k.recipient_id = u.id THEN 3 ELSE 0 END), 0) +
                           COALESCE(SUM(CASE WHEN kr.recipient_id = u.id THEN 3 ELSE 0 END), 0) as points
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
    id, name, points, RANK() OVER (ORDER BY points DESC) as rank
FROM user_stats
    )
SELECT ru.rank,
       ru.points,
       (SELECT name || ' (' || points || ' points)' FROM ranked_users WHERE rank = 1 LIMIT 1) as leader
INTO leaderboard
FROM ranked_users ru
WHERE ru.id = user_record.id;

-- Construct message in the required format
message
:= format(
      'You received %s kudos this week
You gave %s kudos this week
Position: %s
Points: %s
Leader: %s
Top category: %s',
      COALESCE(activity.received, 0),
      COALESCE(activity.given, 0),
      COALESCE(leaderboard.rank, 0),
      COALESCE(leaderboard.points, 0),
      COALESCE(leaderboard.leader, 'No leader yet'),
      COALESCE(activity.top_category, 'None')
    );

    -- Create notification queue entry for email
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_settings_reminder_opt_in
    ON settings(reminder_opt_in);

-- Create index for kudos queries
CREATE INDEX IF NOT EXISTS idx_kudos_recipient_created
    ON kudos(recipient_id, created_at);

CREATE INDEX IF NOT EXISTS idx_kudos_giver_created
    ON kudos(giver_id, created_at);