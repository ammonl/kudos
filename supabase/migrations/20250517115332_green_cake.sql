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
SELECT u.id, u.name, u.email
FROM users u
         JOIN settings s ON s.user_id = u.id
WHERE s.reminder_opt_in = true
    LOOP
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_settings_reminder_opt_in
    ON settings(reminder_opt_in);