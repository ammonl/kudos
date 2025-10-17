-- Update the uid() function to be more robust
CREATE
OR REPLACE FUNCTION uid() 
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT id
FROM users
WHERE google_id = auth.uid()::text
  LIMIT 1
$$;

-- Drop existing policies
DROP
POLICY IF EXISTS "Users can view and update their own settings" ON settings;

-- Add policy for viewing and updating own settings
CREATE
POLICY "Users can view and update their own settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_settings_user_id_lookup
    ON settings(user_id);

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS idx_users_google_id_lookup
    ON users(google_id);