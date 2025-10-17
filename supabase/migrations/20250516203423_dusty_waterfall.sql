/*
  # Fix kudos policies to use internal user ID

  1. Changes
    - Update kudos policies to use internal user ID instead of auth.uid()
    - Add function to get internal user ID from auth.uid()
    - Update existing policies
    - Add proper indexes for performance

  2. Security
    - Maintains security model using internal IDs
    - Properly handles Google auth relationship
*/

-- Create function to get internal user ID from auth.uid()
CREATE
OR REPLACE FUNCTION uid() 
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
SELECT id
FROM users
WHERE google_id = auth.uid()::text
$$;

-- Drop existing policies
DROP
POLICY IF EXISTS "Users can create kudos" ON kudos;
DROP
POLICY IF EXISTS "Users can delete their own kudos" ON kudos;
DROP
POLICY IF EXISTS "Users can view all kudos" ON kudos;

-- Recreate policies using internal user ID
CREATE
POLICY "Users can create kudos"
  ON kudos
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = giver_id);

CREATE
POLICY "Users can delete their own kudos"
  ON kudos
  FOR DELETE
TO authenticated
  USING (uid() = giver_id);

CREATE
POLICY "Users can view all kudos"
  ON kudos
  FOR
SELECT
    TO authenticated
    USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_google_id_internal
    ON users(google_id, id);