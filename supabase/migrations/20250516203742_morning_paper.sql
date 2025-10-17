/*
  # Fix settings policies to use internal user ID

  1. Changes
    - Drop existing settings policies
    - Add new policies using uid() function
    - Add index for better performance

  2. Security
    - Users can only view and update their own settings
    - Uses internal user ID instead of auth ID
*/

-- Drop existing policies
DROP
POLICY IF EXISTS "Users can view and update their own settings" ON settings;
DROP
POLICY IF EXISTS "Enable read access for all users" ON settings;

-- Add policy for viewing and updating own settings
CREATE
POLICY "Users can view and update their own settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_settings_user_id
    ON settings(user_id);