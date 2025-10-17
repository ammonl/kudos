/*
  # Set up notification processing infrastructure

  1. New Tables
    - `app_settings`: Stores application-wide configuration values
  
  2. Changes
    - Creates the cron extension if it doesn't exist
    - Creates a cron job to process notifications every minute
    - Stores Edge Function URL in app_settings table
*/

-- First, create the cron extension if it doesn't exist
create
extension if not exists pg_cron with schema extensions;

-- Create app_settings table to store configuration
create table if not exists app_settings
(
    key
    text
    primary
    key,
    value
    text
    not
    null,
    description
    text,
    created_at
    timestamptz
    default
    now
(
),
    updated_at timestamptz default now
(
)
    );

-- Add RLS policy
alter table app_settings enable row level security;

-- Allow read access to authenticated users
create
policy "Anyone can view app settings"
  on app_settings
  for
select
    to authenticated
    using (true);

-- Store the Edge Function URL
insert into app_settings (key, value, description)
values ('edge_function_url',
        'https://wlraxiscateqlztwnwws.functions.supabase.co',
        'Base URL for Edge Functions') on conflict (key) do
update
set value = excluded.value, updated_at = now();

-- Create a function to get the Edge Function URL
create
or replace function get_edge_function_url()
returns text
language sql
stable
as $$
select value
from app_settings
where key = 'edge_function_url';
$$;

-- Grant usage on the schema
grant
usage
on
schema
cron to postgres;

-- Grant execute on all functions in the schema
grant execute on all
functions in schema cron to postgres;

-- Create a cron job to process notifications every minute
select cron.schedule(
               'process-notifications', -- job name
               '* * * * *', -- every minute
               $$ select
    net.http_post(
      url := (select get_edge_function_url()) || '/process-notifications',
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
$$
);