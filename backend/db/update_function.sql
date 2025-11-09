-- Update get_cap_table_at_block function to include is_allowlisted
DROP FUNCTION IF EXISTS get_cap_table_at_block(BIGINT);

CREATE OR REPLACE FUNCTION get_cap_table_at_block(p_block_number BIGINT)
RETURNS TABLE (
    address VARCHAR(42),
    balance VARCHAR(78),
    ownership_percentage NUMERIC,
    is_allowlisted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH balances_at_block AS (
        SELECT
            COALESCE(t_to.to_address, t_from.from_address) as addr,
            COALESCE(
                SUM(CASE WHEN t_to.to_address IS NOT NULL THEN t_to.amount::NUMERIC ELSE 0 END) -
                SUM(CASE WHEN t_from.from_address IS NOT NULL THEN t_from.amount::NUMERIC ELSE 0 END),
                0
            ) as bal
        FROM transfers t_to
        FULL OUTER JOIN transfers t_from ON t_to.to_address = t_from.from_address
        WHERE (t_to.block_number <= p_block_number OR t_to.block_number IS NULL)
          AND (t_from.block_number <= p_block_number OR t_from.block_number IS NULL)
        GROUP BY COALESCE(t_to.to_address, t_from.from_address)
    )
    SELECT
        b.addr::VARCHAR(42) as address,
        b.bal::VARCHAR(78) as balance,
        ROUND((b.bal / NULLIF(SUM(b.bal) OVER (), 0)) * 100, 4) as ownership_percentage,
        COALESCE(a.is_allowlisted, FALSE) as is_allowlisted
    FROM balances_at_block b
    LEFT JOIN allowlist a ON b.addr = a.address
        AND (a.added_at_block IS NULL OR a.added_at_block <= p_block_number)
        AND (a.removed_at_block IS NULL OR a.removed_at_block > p_block_number)
    WHERE b.bal > 0
    ORDER BY b.bal DESC;
END;
$$ LANGUAGE plpgsql;
