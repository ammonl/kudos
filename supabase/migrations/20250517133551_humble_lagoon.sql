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
BEGIN
  -- Get all users who have opted in for reminders
FOR user_record IN
SELECT u.id, u.name, u.email, s.notify_by_slack, s.notify_by_email
FROM users u
         JOIN settings s ON s.user_id = u.id
WHERE s.reminder_opt_in = true LOOP
    IF user_record.notify_by_email = true THEN
-- Create notification queue entry for email
INSERT
INTO notification_queue (id,
                         user_id,
                         type,
                         status,
                         channel)
VALUES (
    gen_random_uuid(), user_record.id, 'weekly_reminder', 'pending', 'email'
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
        channel
      ) VALUES (
        gen_random_uuid(),
        user_record.id,
        'weekly_reminder',
        'pending',
        'slack'
      );
END IF;
END LOOP;
END;
$$;