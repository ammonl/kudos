-- Drop existing update policies
DROP
POLICY IF EXISTS "Users can update own record" ON users;
DROP
POLICY IF EXISTS "Users can claim their placeholder account" ON users;
DROP
POLICY IF EXISTS "Admins can update user records" ON users;

-- Add policy for users to update their own records
CREATE
POLICY "Users can update own record"
  ON users
  FOR
UPDATE
    TO authenticated
    USING (uid() = id)
WITH CHECK (uid() = id);

-- Add policy for claiming placeholder accounts
CREATE
POLICY "Users can claim their placeholder account"
  ON users
  FOR
UPDATE
    TO authenticated
    USING (
    -- Must be a placeholder account with matching email
    is_placeholder AND
    google_id IS NULL AND
    email = current_setting('request.jwt.claims')::jsonb->>'email'
    )
WITH CHECK (
    -- Can only update to claim the account
    NOT is_placeholder AND
    google_id IS NOT NULL
    );

-- Add policy for admins to update user records
CREATE
POLICY "Admins can update user records"
  ON users
  FOR
UPDATE
    TO authenticated
    USING (is_admin())
WITH CHECK (is_admin());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_id_lookup
    ON users(id);