-- Drop the view policy for app settings
DROP
POLICY IF EXISTS "Users can view app settings" ON app_settings;

-- Create index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_app_settings_key
    ON app_settings(key);