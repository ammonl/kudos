-- Add policy for users to delete their own kudos
CREATE
POLICY "Users can delete their own kudos"
  ON kudos
  FOR DELETE
TO authenticated
  USING (auth.uid() = giver_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_kudos_giver_recipient
    ON kudos(giver_id, recipient_id);