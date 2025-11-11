-- Migration: Add Multi-Contract Support
-- This migration adds support for tracking multiple contracts

-- Step 1: Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) UNIQUE NOT NULL,
    chain_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    decimals INTEGER DEFAULT 18,
    deployer_address VARCHAR(42) NOT NULL,
    deployed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_contracts_chain ON contracts(chain_id);
CREATE INDEX idx_contracts_deployer ON contracts(deployer_address);
CREATE INDEX idx_contracts_address ON contracts(contract_address);

COMMENT ON TABLE contracts IS 'Registry of all deployed GatedEquityToken contracts';

-- Step 2: Add contract_id to all event tables
ALTER TABLE allowlist ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE balances ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE stock_splits ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE metadata_changes ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE buybacks ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;

-- Step 3: Create indexes on contract_id foreign keys
CREATE INDEX IF NOT EXISTS idx_allowlist_contract ON allowlist(contract_id);
CREATE INDEX IF NOT EXISTS idx_transfers_contract ON transfers(contract_id);
CREATE INDEX IF NOT EXISTS idx_balances_contract ON balances(contract_id);
CREATE INDEX IF NOT EXISTS idx_splits_contract ON stock_splits(contract_id);
CREATE INDEX IF NOT EXISTS idx_metadata_contract ON metadata_changes(contract_id);
CREATE INDEX IF NOT EXISTS idx_buybacks_contract ON buybacks(contract_id);

-- Step 4: Update balances primary key to include contract_id
-- (We'll do this after data migration)

-- Step 5: Update indexer_state table for multi-contract support
ALTER TABLE indexer_state DROP CONSTRAINT IF EXISTS single_row;
ALTER TABLE indexer_state ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_indexer_contract ON indexer_state(contract_id);

-- Step 6: Migrate existing data
-- Insert existing contract from indexer_state into contracts table
DO $$
DECLARE
    existing_contract_address VARCHAR(42);
    new_contract_id INTEGER;
BEGIN
    -- Get the existing contract address from indexer_state
    SELECT contract_address INTO existing_contract_address
    FROM indexer_state
    WHERE id = 1;

    -- Only proceed if we have a contract address that's not the zero address
    IF existing_contract_address IS NOT NULL AND existing_contract_address != '0x0000000000000000000000000000000000000000' THEN
        -- Insert into contracts table (use placeholder values for name/symbol/deployer)
        INSERT INTO contracts (contract_address, chain_id, name, symbol, deployer_address)
        VALUES (
            existing_contract_address,
            31337, -- localhost chain ID (update if different)
            'Legacy Contract', -- placeholder
            'LEGACY', -- placeholder
            '0x0000000000000000000000000000000000000000' -- placeholder
        )
        ON CONFLICT (contract_address) DO NOTHING
        RETURNING id INTO new_contract_id;

        -- If we got an ID (new insert), update all tables
        IF new_contract_id IS NOT NULL THEN
            -- Update all event tables to reference this contract
            UPDATE allowlist SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE transfers SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE balances SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE stock_splits SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE metadata_changes SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE buybacks SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE indexer_state SET contract_id = new_contract_id WHERE id = 1;

            RAISE NOTICE 'Migrated existing contract % with ID %', existing_contract_address, new_contract_id;
        ELSE
            -- Contract already exists, get its ID
            SELECT id INTO new_contract_id FROM contracts WHERE contract_address = existing_contract_address;

            -- Update all tables
            UPDATE allowlist SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE transfers SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE balances SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE stock_splits SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE metadata_changes SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE buybacks SET contract_id = new_contract_id WHERE contract_id IS NULL;
            UPDATE indexer_state SET contract_id = new_contract_id WHERE id = 1;

            RAISE NOTICE 'Updated existing contract % with ID %', existing_contract_address, new_contract_id;
        END IF;
    END IF;
END $$;

-- Step 7: Make contract_id NOT NULL after migration
ALTER TABLE allowlist ALTER COLUMN contract_id SET NOT NULL;
ALTER TABLE transfers ALTER COLUMN contract_id SET NOT NULL;
ALTER TABLE balances ALTER COLUMN contract_id SET NOT NULL;
ALTER TABLE stock_splits ALTER COLUMN contract_id SET NOT NULL;
ALTER TABLE metadata_changes ALTER COLUMN contract_id SET NOT NULL;
ALTER TABLE buybacks ALTER COLUMN contract_id SET NOT NULL;
ALTER TABLE indexer_state ALTER COLUMN contract_id SET NOT NULL;

-- Step 8: Update balances primary key to include contract_id
ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_pkey;
ALTER TABLE balances ADD PRIMARY KEY (contract_id, address);

-- Step 9: Update views and functions to accept contract_id parameter

-- Drop old views
DROP VIEW IF EXISTS current_cap_table CASCADE;
DROP VIEW IF EXISTS recent_activity CASCADE;

-- Create parameterized functions instead of views

-- Function: Get current cap table for a specific contract
CREATE OR REPLACE FUNCTION get_current_cap_table(p_contract_id INTEGER)
RETURNS TABLE (
    address VARCHAR(42),
    balance VARCHAR(78),
    ownership_percentage NUMERIC,
    last_updated_block BIGINT,
    last_updated_at TIMESTAMP,
    is_allowlisted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.address,
        b.balance,
        ROUND((b.balance::NUMERIC / NULLIF(SUM(b.balance::NUMERIC) OVER (), 0)) * 100, 4) as ownership_percentage,
        b.last_updated_block,
        b.last_updated_at,
        COALESCE(a.is_allowlisted, FALSE) as is_allowlisted
    FROM balances b
    LEFT JOIN allowlist a ON b.address = a.address AND a.contract_id = p_contract_id
    WHERE b.contract_id = p_contract_id AND b.balance::NUMERIC > 0
    ORDER BY b.balance::NUMERIC DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get recent activity for a specific contract
CREATE OR REPLACE FUNCTION get_recent_activity(p_contract_id INTEGER, p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    event_type TEXT,
    address1 VARCHAR(42),
    address2 VARCHAR(42),
    value TEXT,
    block_number BIGINT,
    block_timestamp TIMESTAMP,
    tx_hash VARCHAR(66)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'transfer' as event_type,
        t.from_address as address1,
        t.to_address as address2,
        t.amount as value,
        t.block_number,
        t.block_timestamp,
        t.tx_hash
    FROM transfers t
    WHERE t.contract_id = p_contract_id
    UNION ALL
    SELECT
        'allowlist_added' as event_type,
        a.address as address1,
        NULL::VARCHAR(42) as address2,
        NULL::TEXT as value,
        a.added_at_block as block_number,
        a.added_at as block_timestamp,
        a.tx_hash
    FROM allowlist a
    WHERE a.contract_id = p_contract_id AND a.is_allowlisted = TRUE
    UNION ALL
    SELECT
        'allowlist_removed' as event_type,
        a.address as address1,
        NULL::VARCHAR(42) as address2,
        NULL::TEXT as value,
        a.removed_at_block as block_number,
        a.removed_at as block_timestamp,
        a.tx_hash
    FROM allowlist a
    WHERE a.contract_id = p_contract_id AND a.is_allowlisted = FALSE AND a.removed_at_block IS NOT NULL
    UNION ALL
    SELECT
        'stock_split' as event_type,
        NULL::VARCHAR(42) as address1,
        NULL::VARCHAR(42) as address2,
        s.multiplier::TEXT as value,
        s.block_number,
        s.block_timestamp,
        s.tx_hash
    FROM stock_splits s
    WHERE s.contract_id = p_contract_id
    UNION ALL
    SELECT
        'buyback' as event_type,
        b.holder_address as address1,
        NULL::VARCHAR(42) as address2,
        b.amount as value,
        b.block_number,
        b.block_timestamp,
        b.tx_hash
    FROM buybacks b
    WHERE b.contract_id = p_contract_id
    UNION ALL
    SELECT
        'metadata_change' as event_type,
        NULL::VARCHAR(42) as address1,
        NULL::VARCHAR(42) as address2,
        NULL::TEXT as value,
        m.block_number,
        m.block_timestamp,
        m.tx_hash
    FROM metadata_changes m
    WHERE m.contract_id = p_contract_id
    ORDER BY block_number DESC, block_timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Update existing update_balance function to accept contract_id
DROP FUNCTION IF EXISTS update_balance(VARCHAR, VARCHAR, BOOLEAN, BIGINT);

CREATE OR REPLACE FUNCTION update_balance(
    p_contract_id INTEGER,
    p_address VARCHAR(42),
    p_amount VARCHAR(78),
    p_is_credit BOOLEAN,
    p_block_number BIGINT
) RETURNS VOID AS $$
DECLARE
    current_balance NUMERIC;
    new_balance NUMERIC;
BEGIN
    -- Get current balance or 0 if not exists
    SELECT COALESCE(balance::NUMERIC, 0) INTO current_balance
    FROM balances
    WHERE contract_id = p_contract_id AND address = p_address;

    -- Ensure current_balance is never NULL
    current_balance := COALESCE(current_balance, 0);

    -- Calculate new balance
    IF p_is_credit THEN
        new_balance := current_balance + p_amount::NUMERIC;
    ELSE
        new_balance := current_balance - p_amount::NUMERIC;
    END IF;

    -- Ensure balance doesn't go negative
    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Balance would go negative for address % on contract %', p_address, p_contract_id;
    END IF;

    -- Insert or update balance
    INSERT INTO balances (contract_id, address, balance, last_updated_block, last_updated_at)
    VALUES (p_contract_id, p_address, new_balance::TEXT, p_block_number, NOW())
    ON CONFLICT (contract_id, address)
    DO UPDATE SET
        balance = new_balance::TEXT,
        last_updated_block = p_block_number,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Update get_cap_table_at_block to accept contract_id
DROP FUNCTION IF EXISTS get_cap_table_at_block(BIGINT);

CREATE OR REPLACE FUNCTION get_cap_table_at_block(p_contract_id INTEGER, p_block_number BIGINT)
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
        FULL OUTER JOIN transfers t_from ON t_to.to_address = t_from.from_address AND t_to.contract_id = t_from.contract_id
        WHERE t_to.contract_id = p_contract_id
          AND (t_to.block_number <= p_block_number OR t_to.block_number IS NULL)
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
        AND a.contract_id = p_contract_id
        AND (a.added_at_block IS NULL OR a.added_at_block <= p_block_number)
        AND (a.removed_at_block IS NULL OR a.removed_at_block > p_block_number)
    WHERE b.bal > 0
    ORDER BY b.bal DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_current_cap_table IS 'Get current cap table for a specific contract';
COMMENT ON FUNCTION get_recent_activity IS 'Get recent activity for a specific contract';
COMMENT ON FUNCTION update_balance IS 'Update balance for a specific contract and address';
COMMENT ON FUNCTION get_cap_table_at_block IS 'Get cap table at specific block for a specific contract';

-- Migration complete!
