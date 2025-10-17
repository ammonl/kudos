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
  stats
record;
  top_recipient
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
-- Get user's weekly stats from the view
SELECT kudos_given,
       kudos_received,
       total_points,
       RANK() OVER (ORDER BY total_points DESC) as rank
INTO stats
FROM kudos_stats_weekly
WHERE user_id = user_record.id;

-- Get current leader from weekly stats
WITH leader AS (SELECT name, total_points
                FROM kudos_stats_weekly
                ORDER BY total_points DESC
    LIMIT 1
    )
SELECT name || ' (' || total_points || ' points)' as leader_info
INTO STRICT stats
FROM leader;

-- Get user's top category from top_kudos_recipients view
SELECT top_category
INTO top_recipient
FROM top_kudos_recipients
WHERE user_id = user_record.id;

-- Construct message in the required format
message
:= format(
      'You received %s kudos this week
You gave %s kudos this week
Position: %s
Points: %s
Leader: %s
Top category: %s',
      COALESCE(stats.kudos_received, 0),
      COALESCE(stats.kudos_given, 0),
      COALESCE(stats.rank, 0),
      COALESCE(stats.total_points, 0),
      COALESCE(stats.leader_info, 'No leader yet'),
      COALESCE(top_recipient.top_category, 'None')
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