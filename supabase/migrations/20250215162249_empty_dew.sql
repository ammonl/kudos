/*
  # Update kudos table for GIF support

  1. Changes
    - Rename image_url to gif_url in kudos table to better reflect its purpose
    - Add notify_manager flag to kudos table
    - Create kudos_notifications table for additional notified users

  2. Security
    - Enable RLS on kudos_notifications table
    - Add policies for authenticated users
*/

-- Rename image_url to gif_url in kudos table
ALTER TABLE kudos RENAME COLUMN image_url TO gif_url;

-- Add notify_manager flag to kudos table
ALTER TABLE kudos
    ADD COLUMN notify_manager BOOLEAN NOT NULL DEFAULT true;

-- Create kudos_notifications table
CREATE TABLE kudos_notifications
(
    kudos_id UUID REFERENCES kudos (id) ON DELETE CASCADE,
    user_id  UUID REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (kudos_id, user_id)
);

-- Enable RLS
ALTER TABLE kudos_notifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE
POLICY "Users can view all kudos notifications"
    ON kudos_notifications FOR
SELECT
    TO authenticated
    USING (true);

CREATE
POLICY "Users can insert kudos notifications when they create kudos"
    ON kudos_notifications FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kudos
            WHERE kudos.id = kudos_id
            AND kudos.giver_id = auth.uid()
        )
    );