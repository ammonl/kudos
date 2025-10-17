/*
  # Update user management system

  1. Changes
    - Add google_id column to users table
    - Add is_placeholder column to users table
    - Update constraints and indexes
    - Add RLS policies for admins

  2. Security
    - Only admins can create placeholder users
    - Users can claim their placeholder account
*/

-- Add new columns first
ALTER TABLE users
    ADD COLUMN is_placeholder boolean,
ADD COLUMN google_id_new text;

-- Set default values for existing records
UPDATE users
SET is_placeholder = false,
    google_id_new  = google_id;

-- Now we can safely drop the old column and rename the new one
ALTER TABLE users
DROP
COLUMN google_id;

ALTER TABLE users
    ALTER COLUMN is_placeholder SET NOT NULL,
ALTER
COLUMN is_placeholder SET DEFAULT false;

ALTER TABLE users
    RENAME COLUMN google_id_new TO google_id;

-- Add constraints after data is migrated
ALTER TABLE users
    ADD CONSTRAINT users_google_id_key
        UNIQUE (google_id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE users
    ADD CONSTRAINT valid_user_state
        CHECK (
            (google_id IS NOT NULL AND NOT is_placeholder) OR
            (google_id IS NULL AND is_placeholder)
            );

-- Create function to check if user can be created
CREATE
OR REPLACE FUNCTION can_create_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can create placeholder users
  IF
is_admin() THEN
    RETURN true;
END IF;

  -- Users can only create their own account if it matches their auth ID
RETURN auth.uid()::text = current_setting('request.jwt.claims')::jsonb->>'sub';
END;
$$;

-- Update user creation policy
DROP
POLICY IF EXISTS "Users can insert their own record" ON users;
CREATE
POLICY "Users can create or claim accounts"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can create placeholder users
    (is_admin() AND is_placeholder) OR
    -- Users can claim their account
    (NOT is_placeholder AND auth.uid()::text = id::text)
  );

-- Add policy for updating placeholder status
CREATE
POLICY "Users can claim their placeholder account"
  ON users
  FOR
UPDATE
    TO authenticated
    USING (
    -- Must be a placeholder account
    is_placeholder AND
    -- No Google ID set
    google_id IS NULL AND
    -- Email must match
    email = auth.jwt()->>'email'
    )
WITH CHECK (
    -- Can only update to claim the account
    NOT is_placeholder AND
    google_id IS NOT NULL AND
    auth.uid()::text = id::text
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_placeholder
    ON users(is_placeholder);

CREATE INDEX IF NOT EXISTS idx_users_google_id
    ON users(google_id);