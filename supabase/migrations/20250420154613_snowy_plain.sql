/*
  # Fix user deletion cascade

  1. Changes
    - Update foreign key constraints to use ON DELETE CASCADE
    - Update handle_user_deletion function to handle cleanup properly
    - Add proper ordering to deletion operations

  2. Security
    - Maintains existing security model
    - Ensures data integrity during deletion
*/

-- First, drop existing foreign key constraints
ALTER TABLE kudos_recipients
DROP
CONSTRAINT IF EXISTS kudos_recipients_recipient_id_fkey;

ALTER TABLE kudos_notifications
DROP
CONSTRAINT IF EXISTS kudos_notifications_user_id_fkey;

ALTER TABLE notification_queue
DROP
CONSTRAINT IF EXISTS notification_queue_user_id_fkey;

ALTER TABLE settings
DROP
CONSTRAINT IF EXISTS settings_user_id_fkey;

-- Recreate foreign key constraints with CASCADE
ALTER TABLE kudos_recipients
    ADD CONSTRAINT kudos_recipients_recipient_id_fkey
        FOREIGN KEY (recipient_id) REFERENCES users (id)
            ON DELETE CASCADE;

ALTER TABLE kudos_notifications
    ADD CONSTRAINT kudos_notifications_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE;

ALTER TABLE notification_queue
    ADD CONSTRAINT notification_queue_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE;

ALTER TABLE settings
    ADD CONSTRAINT settings_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE;

-- Update the user deletion function to handle cleanup in proper order
CREATE
OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- First, handle manager references
UPDATE users
SET manager_id = NULL
WHERE manager_id = OLD.id;

-- Delete kudos where user was the giver
DELETE
FROM kudos
WHERE giver_id = OLD.id;

-- Delete kudos where user was the primary recipient
DELETE
FROM kudos
WHERE recipient_id = OLD.id;

-- The rest of the related records will be deleted automatically via CASCADE

RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS before_user_delete ON users;

CREATE TRIGGER before_user_delete
    BEFORE DELETE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();