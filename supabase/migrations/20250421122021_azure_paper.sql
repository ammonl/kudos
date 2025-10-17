-- Create trigger function to create default settings for placeholder users
CREATE
OR REPLACE FUNCTION create_placeholder_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default settings for the new placeholder user
  IF
NEW.is_placeholder THEN
    INSERT INTO settings (
      user_id,
      notify_by_email,
      notify_by_slack,
      reminder_opt_in,
      slack_user_id,
      slack_workspace_id,
      slack_channel_id
    ) VALUES (
      NEW.id,
      true,  -- notify_by_email = true
      false, -- notify_by_slack = false
      false, -- reminder_opt_in = false
      null,  -- slack_user_id = null
      null,  -- slack_workspace_id = null
      null   -- slack_channel_id = null
    );
END IF;

RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create settings for new placeholder users
CREATE TRIGGER create_placeholder_settings_trigger
    AFTER INSERT
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_placeholder_settings();