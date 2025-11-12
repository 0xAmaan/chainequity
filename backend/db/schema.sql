-- ChainEquity Backend Database Schema (Multi-Contract Support)
-- PostgreSQL schema for event indexing and cap table generation

-- Drop existing functions (to avoid signature conflicts)
DROP FUNCTION IF EXISTS get_current_cap_table(integer);
DROP FUNCTION IF EXISTS get_cap_table_at_block(integer, bigint);
DROP FUNCTION IF EXISTS get_recent_activity(integer, integer);
DROP FUNCTION IF EXISTS update_balance(varchar, varchar, boolean, bigint);
DROP FUNCTION IF EXISTS update_balance(integer, varchar, varchar, boolean, bigint);
DROP FUNCTION IF EXISTS get_cap_table_at_block(bigint);

-- Drop existing views
DROP VIEW IF EXISTS current_cap_table CASCADE;
DROP VIEW IF EXISTS recent_activity CASCADE;

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS buybacks CASCADE;
DROP TABLE IF EXISTS metadata_changes CASCADE;
DROP TABLE IF EXISTS stock_splits CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS balances CASCADE;
DROP TABLE IF EXISTS allowlist CASCADE;
DROP TABLE IF EXISTS indexer_state CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;

-- Contracts table - stores all deployed contracts
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    chain_id INTEGER NOT NULL,
    deployed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deployed_by VARCHAR(42),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_contracts_address ON contracts(contract_address);
CREATE INDEX idx_contracts_active ON contracts(is_active);

-- Indexer state tracking (per contract)
CREATE TABLE indexer_state (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    last_processed_block BIGINT NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_syncing BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(contract_id)
);

CREATE INDEX idx_indexer_state_contract ON indexer_state(contract_id);

-- Allowlist tracking (per contract)
CREATE TABLE allowlist (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    address VARCHAR(42) NOT NULL,
    is_allowlisted BOOLEAN NOT NULL DEFAULT TRUE,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    added_at_block BIGINT NOT NULL,
    removed_at TIMESTAMP,
    removed_at_block BIGINT,
    tx_hash VARCHAR(66) NOT NULL,
    UNIQUE(contract_id, address)
);

CREATE INDEX idx_allowlist_contract ON allowlist(contract_id);
CREATE INDEX idx_allowlist_status ON allowlist(contract_id, is_allowlisted);
CREATE INDEX idx_allowlist_added_block ON allowlist(added_at_block);

-- Transfer events (per contract)
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount VARCHAR(78) NOT NULL, -- Store as string to handle uint256
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    CONSTRAINT unique_transfer UNIQUE (contract_id, tx_hash, log_index)
);

CREATE INDEX idx_transfers_contract ON transfers(contract_id);
CREATE INDEX idx_transfers_from ON transfers(contract_id, from_address);
CREATE INDEX idx_transfers_to ON transfers(contract_id, to_address);
CREATE INDEX idx_transfers_block ON transfers(block_number);
CREATE INDEX idx_transfers_timestamp ON transfers(block_timestamp);

-- Current balances (derived from transfers, per contract)
CREATE TABLE balances (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    address VARCHAR(42) NOT NULL,
    balance VARCHAR(78) NOT NULL DEFAULT '0',
    last_updated_block BIGINT NOT NULL,
    last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, address),
    CHECK (address != '0x0000000000000000000000000000000000000000')
);

CREATE INDEX idx_balances_contract ON balances(contract_id);
CREATE INDEX idx_balances_nonzero ON balances(contract_id, balance) WHERE balance != '0';
CREATE INDEX idx_balances_updated_block ON balances(last_updated_block);

-- Stock split events (per contract)
CREATE TABLE stock_splits (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    multiplier INTEGER NOT NULL,
    new_total_supply VARCHAR(78) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    affected_holders INTEGER NOT NULL DEFAULT 0,
    UNIQUE(contract_id, tx_hash)
);

CREATE INDEX idx_splits_contract ON stock_splits(contract_id);
CREATE INDEX idx_splits_block ON stock_splits(block_number);
CREATE INDEX idx_splits_timestamp ON stock_splits(block_timestamp);

-- Metadata change events (per contract)
CREATE TABLE metadata_changes (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    old_name TEXT NOT NULL,
    new_name TEXT NOT NULL,
    old_symbol VARCHAR(20) NOT NULL,
    new_symbol VARCHAR(20) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    UNIQUE(contract_id, tx_hash)
);

CREATE INDEX idx_metadata_contract ON metadata_changes(contract_id);
CREATE INDEX idx_metadata_block ON metadata_changes(block_number);

-- Buyback events (SharesBoughtBack, per contract)
CREATE TABLE buybacks (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    holder_address VARCHAR(42) NOT NULL,
    amount VARCHAR(78) NOT NULL, -- Store as string to handle uint256
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    CONSTRAINT unique_buyback UNIQUE (contract_id, tx_hash, log_index)
);

CREATE INDEX idx_buybacks_contract ON buybacks(contract_id);
CREATE INDEX idx_buybacks_holder ON buybacks(contract_id, holder_address);
CREATE INDEX idx_buybacks_block ON buybacks(block_number);
CREATE INDEX idx_buybacks_timestamp ON buybacks(block_timestamp);

-- Function: Update balance (called by indexer) - now with contract_id
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

    -- Ensure current_balance is never NULL (in case no rows returned)
    current_balance := COALESCE(current_balance, 0);

    -- Calculate new balance
    IF p_is_credit THEN
        new_balance := current_balance + p_amount::NUMERIC;
    ELSE
        new_balance := current_balance - p_amount::NUMERIC;
    END IF;

    -- Ensure balance doesn't go negative
    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Balance would go negative for address %', p_address;
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

-- Function: Get current cap table for a contract
CREATE OR REPLACE FUNCTION get_current_cap_table(p_contract_id INTEGER)
RETURNS TABLE (
    address VARCHAR(42),
    balance VARCHAR(78),
    ownership_percentage NUMERIC,
    is_allowlisted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.address,
        b.balance,
        ROUND((b.balance::NUMERIC / NULLIF(SUM(b.balance::NUMERIC) OVER (), 0)) * 100, 4) as ownership_percentage,
        COALESCE(a.is_allowlisted, FALSE) as is_allowlisted
    FROM balances b
    LEFT JOIN allowlist a ON b.contract_id = a.contract_id AND b.address = a.address AND a.is_allowlisted = TRUE
    WHERE b.contract_id = p_contract_id AND b.balance::NUMERIC > 0
    ORDER BY b.balance::NUMERIC DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get cap table at specific block for a contract
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

-- Function: Get recent activity for a contract
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
        'transfer'::TEXT as event_type,
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
        'allowlist_added'::TEXT as event_type,
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
        'allowlist_removed'::TEXT as event_type,
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
        'stock_split'::TEXT as event_type,
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
        'buyback'::TEXT as event_type,
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
        'metadata_change'::TEXT as event_type,
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

COMMENT ON TABLE contracts IS 'All deployed ChainEquity contracts';
COMMENT ON TABLE allowlist IS 'Tracks addresses approved for holding tokens (per contract)';
COMMENT ON TABLE transfers IS 'All Transfer events from ChainEquity contracts';
COMMENT ON TABLE balances IS 'Current token balances (derived from transfers, per contract)';
COMMENT ON TABLE stock_splits IS 'Stock split corporate action events';
COMMENT ON TABLE metadata_changes IS 'Token name/symbol change events';
COMMENT ON TABLE buybacks IS 'SharesBoughtBack events (company share repurchase)';
COMMENT ON TABLE indexer_state IS 'Tracks indexer sync progress per contract';
