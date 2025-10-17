/*
  # Add user deletion policies

  1. Changes
    - Add policy to allow users to delete their own records
    - Add cascading delete triggers for related tables

  2. Security
    - Only authenticated users can delete their own records
    - Cascading deletes ensure all related data is cleaned up
*/

-- Add policy for users to delete their own records
CREATE
POLICY "Users can delete own record"
    ON users FOR DELETE
TO authenticated
    USING (auth.uid()::text = id::text);

-- Create cascading delete triggers for settings
CREATE
OR REPLACE FUNCTION handle_deleted_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- Delete settings
DELETE
FROM settings
WHERE user_id = OLD.id;

-- Delete kudos where user is the giver
DELETE
FROM kudos
WHERE giver_id = OLD.id;

-- Delete kudos_recipients where user is the recipient
DELETE
FROM kudos_recipients
WHERE recipient_id = OLD.id;

-- Delete from leaderboard
DELETE
FROM leaderboard
WHERE user_id = OLD.id;

-- Delete notifications
DELETE
FROM notifications
WHERE user_id = OLD.id;

RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- Create the trigger
DO
$$
BEGIN
  -- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_user_deleted ON users;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

CREATE TRIGGER on_user_deleted
    BEFORE DELETE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_deleted_user();