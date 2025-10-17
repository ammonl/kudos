/*
  # Update notification processing schedule

  1. Changes
    - Update cron schedule for process-notifications to run every 2 minutes
    - Keep weekly reminder schedule unchanged
    - Drop existing schedules first to avoid conflicts

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop existing schedules if they exist
select cron.unschedule('process-notifications');
select cron.unschedule('weekly-reminders');

-- Schedule notification processor to run every 2 minutes
select cron.schedule(
               'process-notifications',
               '*/2 * * * *',
               'select process_pending_notifications();'
       );

-- Schedule weekly reminders for Monday at 9am UTC (unchanged)
select cron.schedule(
               'weekly-reminders',
               '0 9 * * 1',
               'select schedule_weekly_reminders();'
       );