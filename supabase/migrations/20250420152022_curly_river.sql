/*
  # Add RLS policies for admin settings

  1. Changes
    - Add policy to allow admins to update app_settings table
    - Add policy to allow admins to view app_settings
    - Update existing policies to use is_admin() function

  2. Security
    - Only admins can update admin user list
    - Maintains existing security model
*/

-- Drop existing policies
DROP
POLICY IF EXISTS "Anyone can view app settings" ON app_settings;

-- Add policy for admins to update app_settings
CREATE
POLICY "Admins can manage app settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add policy for viewing app settings
CREATE
POLICY "Users can view app settings"
  ON app_settings
  FOR
SELECT
    TO authenticated
    USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_app_settings_key
    ON app_settings(key);