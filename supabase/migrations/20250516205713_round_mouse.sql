-- Create a function to update user settings in a transaction
CREATE
OR REPLACE FUNCTION update_user_settings(
  p_user_id uuid,
  p_name text DEFAULT NULL,
  p_manager_id uuid DEFAULT NULL,
  p_notify_by_email boolean DEFAULT NULL,
  p_notify_by_slack boolean DEFAULT NULL,
  p_reminder_opt_in boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_internal_user_id uuid;
  v_result
json;
BEGIN
  -- Get the internal user ID
SELECT id
INTO v_internal_user_id
FROM users
WHERE google_id = p_user_id::text;

IF
v_internal_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
END IF;

  -- Start transaction
BEGIN
    -- Update user profile if name or manager changed
    IF
p_name IS NOT NULL OR p_manager_id IS NOT DISTINCT FROM p_manager_id THEN
UPDATE users
SET name       = COALESCE(p_name, name),
    manager_id = p_manager_id
WHERE id = v_internal_user_id;
END IF;

    -- Update settings if any setting is provided
    IF
p_notify_by_email IS NOT NULL OR 
       p_notify_by_slack IS NOT NULL OR 
       p_reminder_opt_in IS NOT NULL THEN
UPDATE settings
SET notify_by_email = COALESCE(p_notify_by_email, notify_by_email),
    notify_by_slack = COALESCE(p_notify_by_slack, notify_by_slack),
    reminder_opt_in = COALESCE(p_reminder_opt_in, reminder_opt_in)
WHERE user_id = v_internal_user_id;
END IF;

    -- Get updated data
SELECT json_build_object(
               'user', u,
               'settings', s
       )
INTO v_result
FROM users u
         LEFT JOIN settings s ON s.user_id = u.id
WHERE u.id = v_internal_user_id;

RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
      RAISE;
END;
END;
$$;

-- Update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_google_id_lookup ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id_lookup ON settings(user_id);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_user_settings TO authenticated;