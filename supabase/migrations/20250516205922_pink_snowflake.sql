-- Fix the update_user_settings function to properly handle parameters
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
p_name IS NOT NULL OR p_manager_id IS NOT NULL THEN
UPDATE users
SET name       = COALESCE(p_name, name),
    manager_id = CASE
                     WHEN p_manager_id IS NOT NULL THEN p_manager_id
                     ELSE manager_id
        END
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
               'user', row_to_json(u),
               'settings', row_to_json(s)
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