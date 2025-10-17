-- Update is_admin function to use internal user ID
CREATE
OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
admin_list text;
  internal_user_id
uuid;
BEGIN
  -- Get the internal user ID
SELECT id
INTO internal_user_id
FROM users
WHERE google_id = auth.uid()::text;

-- Get the admin users list from app_settings
SELECT value
INTO admin_list
FROM app_settings
WHERE key = 'admin_users';

-- Check if the user's internal ID is in the admin list
RETURN admin_list::jsonb ? internal_user_id::text;
END;
$$;

-- Update can_delete_user function to use internal user ID
CREATE
OR REPLACE FUNCTION can_delete_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
admin_list text;
BEGIN
  -- Get the admin users list
SELECT value
INTO admin_list
FROM app_settings
WHERE key = 'admin_users';

-- Check if user is an admin
RETURN NOT (admin_list::jsonb ? user_id::text);
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_google_id_internal
    ON users(google_id, id);