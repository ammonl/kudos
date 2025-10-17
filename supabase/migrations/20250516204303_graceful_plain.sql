/*
  # Fix user account deletion

  1. Changes
    - Update user deletion policies to use internal user ID
    - Add policy for users to delete their own accounts
    - Update handle_user_deletion function to ensure complete cleanup
    - Add proper indexes for performance

  2. Security
    - Users can delete their own accounts
    - Admins can delete non-admin users
    - Proper cleanup of all related data
*/

-- Drop existing policies
DROP
POLICY IF EXISTS "Users can delete own record" ON users;
DROP
POLICY IF EXISTS "Admins can delete non-admin users" ON users;

-- Add policy for users to delete their own accounts
CREATE
POLICY "Users can delete own record"
  ON users
  FOR DELETE
TO authenticated
  USING (uid() = id);

-- Update admin deletion policy to use internal user ID
CREATE
POLICY "Admins can delete non-admin users"
  ON users
  FOR DELETE
TO authenticated
  USING (is_admin() AND can_delete_user(id));

-- Update handle_user_deletion function to ensure complete cleanup
CREATE
OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- First, handle manager references
UPDATE users
SET manager_id = NULL
WHERE manager_id = OLD.id;

-- Delete kudos where user was the giver
DELETE
FROM kudos
WHERE giver_id = OLD.id;

-- Delete kudos where user was the primary recipient
DELETE
FROM kudos
WHERE recipient_id = OLD.id;

-- Delete kudos_recipients entries
DELETE
FROM kudos_recipients
WHERE recipient_id = OLD.id;

-- Delete notification queue entries
DELETE
FROM notification_queue
WHERE user_id = OLD.id;

-- Delete settings
DELETE
FROM settings
WHERE user_id = OLD.id;

-- The rest of the related records will be deleted automatically via CASCADE

RETURN OLD;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS before_user_delete ON users;

CREATE TRIGGER before_user_delete
    BEFORE DELETE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_id_google_id
    ON users(id, google_id);