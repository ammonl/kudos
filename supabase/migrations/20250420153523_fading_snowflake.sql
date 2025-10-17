/*
  # Add user management functionality for admins

  1. Changes
    - Add function to check if user can be deleted
    - Add policy for admins to delete users
    - Add trigger to handle user deletion cleanup
    - Add constraint to prevent admin deletion

  2. Security
    - Only admins can delete users
    - Admins cannot be deleted while they are admins
    - Proper cleanup of all user data on deletion
*/

-- Create function to check if user can be deleted
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

-- Add policy for admins to delete users
CREATE
POLICY "Admins can delete non-admin users"
  ON users
  FOR DELETE
TO authenticated
  USING (
    is_admin() AND can_delete_user(id)
  );

-- Create function to handle user deletion cleanup
CREATE
OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all kudos where user was the giver
DELETE
FROM kudos
WHERE giver_id = OLD.id;

-- Delete all kudos where user was the primary recipient
DELETE
FROM kudos
WHERE recipient_id = OLD.id;

-- Remove user from additional recipients
DELETE
FROM kudos_recipients
WHERE recipient_id = OLD.id;

-- Delete all notifications for this user
DELETE
FROM notification_queue
WHERE user_id = OLD.id;

-- Delete user's settings
DELETE
FROM settings
WHERE user_id = OLD.id;

-- Set manager_id to NULL for any users who had this user as their manager
UPDATE users
SET manager_id = NULL
WHERE manager_id = OLD.id;

RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS before_user_delete ON users;
CREATE TRIGGER before_user_delete
    BEFORE DELETE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();