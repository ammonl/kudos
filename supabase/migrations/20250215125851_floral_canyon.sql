/*
  # Reset manager trigger

  1. Changes
    - Add trigger to automatically set manager_id to null when a manager is deleted
    - This ensures no users are left with invalid manager references

  2. Security
    - No changes to RLS policies required
    - Maintains data integrity by preventing orphaned manager references
*/

-- Function to handle manager reset
CREATE
OR REPLACE FUNCTION reset_manager_references()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all users who had the deleted user as their manager
UPDATE users
SET manager_id = NULL
WHERE manager_id = OLD.id;

RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- Create trigger to run before user deletion
DO
$$
BEGIN
  -- Drop the trigger if it exists
DROP TRIGGER IF EXISTS reset_manager_before_delete ON users;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

CREATE TRIGGER reset_manager_before_delete
    BEFORE DELETE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION reset_manager_references();