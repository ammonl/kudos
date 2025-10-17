/*
  # Set up notification scheduler

  1. Changes
    - Create a scheduled function to process notifications every minute
    - Create a scheduled function to send weekly reminders every Monday at 9am UTC
  
  2. Notes
    - Uses Supabase's built-in scheduler instead of pg_cron
    - Schedules are defined in UTC
*/

-- Create a function to schedule weekly reminders
create
or replace function schedule_weekly_reminders()
returns void
language plpgsql
security definer
as $$
declare
user_record record;
begin
  -- Get all users who have opted in for reminders
for user_record in
select u.id, u.name, u.email
from users u
         join settings s on s.user_id = u.id
where s.reminder_opt_in = true
    loop
-- Create a notification queue entry for each user
insert
into notification_queue (id,
                         user_id,
                         type,
                         status,
                         channel)
values (
    gen_random_uuid(), user_record.id, 'weekly_reminder', 'pending', 'email'
    );
end loop;
end;
$$;

-- Create a function to process pending notifications
create
or replace function process_pending_notifications()
returns void
language plpgsql
security definer
as $$
begin
  -- Call the Edge Function to process notifications
  -- The actual processing happens in the Edge Function
  perform
net.http_post(
      url := 'https://wlraxiscateqlztwnwws.functions.supabase.co/process-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    );
end;
$$;

-- Schedule the notification processor to run every minute
select cron.schedule(
               'process-notifications',
               '* * * * *',
               'select process_pending_notifications();'
       );

-- Schedule weekly reminders for Monday at 9am UTC
select cron.schedule(
               'weekly-reminders',
               '0 9 * * 1',
               'select schedule_weekly_reminders();'
       );