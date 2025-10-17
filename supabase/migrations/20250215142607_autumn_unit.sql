/*
  # Add RLS policy for user updates

  1. Changes
    - Add policy to allow users to update their own records
    - Add policy to allow users to view all users (already exists but documented for completeness)

  2. Security
    - Users can only update their own records
    - All authenticated users can view all users
*/

-- Add policy for users to update their own records
CREATE
POLICY "Users can update own record"
    ON users FOR
UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);