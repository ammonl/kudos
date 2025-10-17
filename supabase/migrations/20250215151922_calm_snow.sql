/*
  # Simplify user deletion trigger

  1. Changes
    - Remove manager reference handling from handle_user_deletion function
    - Manager references are now handled by ON DELETE SET NULL constraint

  2. Security
    - No changes to RLS policies
    - Maintains data integrity through foreign key constraints
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS before_user_delete ON users;

-- Drop existing function
DROP FUNCTION IF EXISTS handle_user_deletion();

-- Create simplified function without manager handling
CREATE
OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle cleanup of related records
DELETE
FROM settings
WHERE user_id = OLD.id;
DELETE
FROM kudos
WHERE giver_id = OLD.id;
DELETE
FROM kudos_recipients
WHERE recipient_id = OLD.id;
DELETE
FROM leaderboard
WHERE user_id = OLD.id;
DELETE
FROM notifications
WHERE user_id = OLD.id;

RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- Recreate trigger with simplified function
CREATE TRIGGER before_user_delete
    BEFORE DELETE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();