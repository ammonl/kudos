/*
  # Add kudos_recipients RLS policy

  1. Changes
    - Add policy to allow users to insert into kudos_recipients table
    - Policy ensures users can only add recipients for kudos they created
    - Add index for performance optimization

  2. Security
    - Users can only add recipients to kudos they created
    - Maintains existing security model
*/

-- Drop existing policies if they exist
DROP
POLICY IF EXISTS "Users can insert kudos recipients" ON kudos_recipients;
DROP
POLICY IF EXISTS "Users can view all kudos recipients" ON kudos_recipients;

-- Add policy for inserting kudos recipients
CREATE
POLICY "Users can insert kudos recipients"
  ON kudos_recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kudos
      WHERE kudos.id = kudos_id
      AND kudos.giver_id = uid()
    )
  );

-- Add policy for viewing kudos recipients
CREATE
POLICY "Users can view all kudos recipients"
  ON kudos_recipients
  FOR
SELECT
    TO authenticated
    USING (true);

-- Create index to improve policy performance
CREATE INDEX IF NOT EXISTS idx_kudos_recipients_kudos_id
    ON kudos_recipients (kudos_id);