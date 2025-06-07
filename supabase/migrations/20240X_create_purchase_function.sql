-- Drop the old function first
DROP FUNCTION IF EXISTS purchase_item(uuid, bigint, bigint, bigint, text);

-- Create the purchase function
CREATE OR REPLACE FUNCTION purchase_item(
    p_user_id uuid,
    p_location_id bigint,
    p_item_id uuid,
    p_item_price bigint, -- assuming price is stored in cents
    p_item_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- or SECURITY INVOKER if preferred, but DEFINER is simpler here
AS $$
DECLARE
    current_balance bigint;
BEGIN
    -- Check current balance
    SELECT balance INTO current_balance
    FROM balances
    WHERE user_id = p_user_id AND location_id = p_location_id;

    -- If no balance entry, assume 0
    IF NOT FOUND THEN
        current_balance := 0;
    END IF;

    -- Check if sufficient balance exists
    IF current_balance < p_item_price THEN
        RAISE EXCEPTION 'Insufficient Balance';
    END IF;

    -- Deduct balance
    UPDATE balances
    SET balance = balance - p_item_price
    WHERE user_id = p_user_id AND location_id = p_location_id;

    -- Record transaction
    INSERT INTO transactions (
        location_id,
        customer_name,
        amount,      -- Store amount in cents
        status,
        items        -- JSONB column for item details
    )
    VALUES (
        p_location_id,
        p_user_id::text,
        p_item_price,
        'completed',
        jsonb_build_array(jsonb_build_object(
            'id', p_item_id::text, -- Convert UUID to text for JSONB
            'name', p_item_name,
            'price', p_item_price,
            'quantity', 1
        ))
    );

    -- You might want to add logging or other actions here

END;
$$;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION purchase_item(uuid, bigint, uuid, bigint, text) TO authenticated; 