CREATE
OR REPLACE FUNCTION claim_pending_notifications(batch_size INTEGER)
RETURNS SETOF notification_queue -- Ensures the function returns rows matching your table structure
LANGUAGE plpgsql
AS $$
BEGIN
RETURN QUERY
UPDATE notification_queue
SET status     = 'processing',
    updated_at = NOW() -- Assuming you have an 'updated_at' column
WHERE id IN (SELECT id
             FROM notification_queue
             WHERE status = 'pending'
             ORDER BY created_at -- Or another column like 'id' or 'inserted_at' for FIFO processing
    LIMIT batch_size
    FOR
UPDATE SKIP LOCKED -- Key for concurrent access: skips rows locked by other transactions
    )
    RETURNING *;
END;
$$;
