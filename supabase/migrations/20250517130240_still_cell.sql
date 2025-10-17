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
  weekly_stats
record;
  leader_info
text;
  user_rank
bigint;
  top_cat
text;
  message
text;
BEGIN
  -- Get all users who have opted in for reminders
FOR user_record IN
SELECT u.id, u.name, u.email, s.notify_by_slack, s.notify_by_email
FROM users u
         JOIN settings s ON s.user_id = u.id
WHERE s.reminder_opt_in = true
    LOOP
-- Get user's weekly stats from the view
SELECT kudos_given,
       kudos_received,
       total_points
INTO weekly_stats
FROM kudos_stats_weekly
WHERE user_id = user_record.id;

-- Get user's rank
SELECT row_number() OVER (ORDER BY total_points DESC)
INTO user_rank
FROM kudos_stats_weekly
WHERE user_id = user_record.id;

-- Get current leader
SELECT name || ' (' || total_points || ' points)'
INTO leader_info
FROM kudos_stats_weekly
ORDER BY total_points DESC LIMIT 1;

-- Get user's top category from top_kudos_recipients view
SELECT r.top_category
INTO top_cat
FROM top_kudos_recipients r
WHERE r.user_id = user_record.id;

-- Construct message in the required format
message
:= format(
      'You received %s kudos this week
You gave %s kudos this week
Position: %s
Points: %s
Leader: %s
Top category: %s',
      COALESCE(weekly_stats.kudos_received, 0),
      COALESCE(weekly_stats.kudos_given, 0),
      COALESCE(user_rank, 0),
      COALESCE(weekly_stats.total_points, 0),
      COALESCE(leader_info, 'No leader yet'),
      COALESCE(top_cat, 'None')
    );

    IF
user_record.notify_by_email = true THEN
      -- Create notification queue entry for email
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
        'email',
        message
      );
END IF;

    -- If user has Slack enabled, send there too
    IF
user_record.notify_by_slack = true THEN
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
