/*
  # Update manager_id foreign key constraint

  1. Changes
    - Drop existing foreign key constraint
    - Add new foreign key constraint with ON DELETE SET NULL

  2. Security
    - No changes to RLS policies
    - Maintains data integrity by automatically setting NULL on parent deletion
*/

-- First drop the existing foreign key constraint
ALTER TABLE users
DROP
CONSTRAINT IF EXISTS users_manager_id_fkey;

-- Add the new constraint with ON DELETE SET NULL
ALTER TABLE users
    ADD CONSTRAINT users_manager_id_fkey
        FOREIGN KEY (manager_id)
            REFERENCES users (id)
            ON DELETE SET NULL;