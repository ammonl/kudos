/*
  # Consolidate manager reference handling

  1. Changes
    - Drop existing triggers and functions
    - Create a single, comprehensive trigger for handling user deletion
    - Ensure manager_id references are handled first

  2. Security
    - No changes to RLS policies
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS handle_manager_before_delete ON users;
DROP TRIGGER IF EXISTS reset_manager_before_delete ON users;
DROP TRIGGER IF EXISTS on_user_deleted ON users;

DROP FUNCTION IF EXISTS handle_manager_references();
DROP FUNCTION IF EXISTS reset_manager_references();
DROP FUNCTION IF EXISTS handle_deleted_user();

-- Create a single function to handle all user deletion cleanup
CREATE
OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- First, handle manager references
UPDATE users
SET manager_id = NULL
WHERE manager_id = OLD.id;

-- Then handle other cleanup
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

-- Create a single trigger for user deletion
CREATE TRIGGER before_user_delete
    BEFORE DELETE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();