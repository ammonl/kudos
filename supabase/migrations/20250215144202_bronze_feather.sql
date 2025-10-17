/*
  # Add manager cascade trigger

  1. Changes
    - Add trigger to handle manager_id references before user deletion
    - Set manager_id to NULL for all users who had the deleted user as their manager

  2. Security
    - No changes to RLS policies
*/

-- Function to handle manager references before user deletion
CREATE
OR REPLACE FUNCTION handle_manager_references()
RETURNS TRIGGER AS $$
BEGIN
  -- Set manager_id to NULL for all users who had this user as their manager
UPDATE users
SET manager_id = NULL
WHERE manager_id = OLD.id;

RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- Create trigger to handle manager references before user deletion
DO
$$
BEGIN
  -- Drop the trigger if it exists
DROP TRIGGER IF EXISTS handle_manager_before_delete ON users;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

CREATE TRIGGER handle_manager_before_delete
    BEFORE DELETE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_manager_references();