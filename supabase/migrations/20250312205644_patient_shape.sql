/*
  # Fix notification processing setup

  1. Changes
    - Install http extension for making HTTP requests
    - Update process_pending_notifications function to use http extension
    - Fix headers construction
*/

-- Install the http extension
create
extension if not exists http with schema extensions;

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
declare
headers jsonb;
begin
  -- Construct headers properly as JSONB
  headers
:= jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true))
  );

  -- Call the Edge Function to process notifications using http extension
  perform
http.post(
      url := (select get_edge_function_url()) || '/process-notifications',
      headers := headers
    );
end;
$$;

-- Drop existing schedules if they exist
select cron.unschedule('process-notifications');
select cron.unschedule('weekly-reminders');

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