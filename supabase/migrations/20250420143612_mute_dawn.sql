/*
  # Add admin users configuration

  1. Changes
    - Add admin_users setting to app_settings table
    - Set initial admin users list
    - Add description for the setting

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Insert admin users setting if it doesn't exist
INSERT INTO app_settings (key, value, description)
VALUES ('admin_users',
        '[]',
        'List of user IDs who have admin access') ON CONFLICT (key) DO NOTHING;