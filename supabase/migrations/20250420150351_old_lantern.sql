/*
  # Add admin delete policy for kudos

  1. Changes
    - Add function to check if a user is an admin
    - Add policy to allow admins to delete kudos
    - Add index for better performance

  2. Security
    - Only admins can delete kudos
    - Maintains existing security model
*/

-- Create function to check if a user is an admin
CREATE
OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
admin_list text;
BEGIN
  -- Get the admin users list from app_settings
SELECT value
INTO admin_list
FROM app_settings
WHERE key = 'admin_users';

-- Check if the current user's ID is in the admin list
RETURN admin_list::jsonb ? (auth.uid()::text);
END;
$$;

-- Add policy for admins to delete kudos
CREATE
POLICY "Admins can delete kudos"
  ON kudos
  FOR DELETE
TO authenticated
  USING (is_admin());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_kudos_giver_id
    ON kudos(giver_id);