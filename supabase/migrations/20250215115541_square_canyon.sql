/*
  # Add users insert policy

  1. Security Changes
    - Add RLS policy to allow inserting new users during authentication
    - Users can only insert their own record with matching auth.uid()
*/

CREATE
POLICY "Users can insert their own record"
    ON users FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid()::text = id::text);