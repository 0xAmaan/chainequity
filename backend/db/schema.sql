-- ChainEquity Backend Database Schema
-- PostgreSQL schema for event indexing and cap table generation

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS buybacks CASCADE;
DROP TABLE IF EXISTS metadata_changes CASCADE;
DROP TABLE IF EXISTS stock_splits CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS balances CASCADE;
DROP TABLE IF EXISTS allowlist CASCADE;
DROP TABLE IF EXISTS indexer_state CASCADE;

-- Indexer state tracking
CREATE TABLE indexer_state (
    id SERIAL PRIMARY KEY,
    last_processed_block BIGINT NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_syncing BOOLEAN NOT NULL DEFAULT FALSE,
    contract_address VARCHAR(42) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize with single row
INSERT INTO indexer_state (id, last_processed_block, contract_address)
VALUES (1, 0, '0x0000000000000000000000000000000000000000');

-- Allowlist tracking
CREATE TABLE allowlist (
    address VARCHAR(42) PRIMARY KEY,
    is_allowlisted BOOLEAN NOT NULL DEFAULT TRUE,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    added_at_block BIGINT NOT NULL,
    removed_at TIMESTAMP,
    removed_at_block BIGINT,
    tx_hash VARCHAR(66) NOT NULL
);

CREATE INDEX idx_allowlist_status ON allowlist(is_allowlisted);
CREATE INDEX idx_allowlist_added_block ON allowlist(added_at_block);

-- Transfer events
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount VARCHAR(78) NOT NULL, -- Store as string to handle uint256
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    CONSTRAINT unique_transfer UNIQUE (tx_hash, log_index)
);

CREATE INDEX idx_transfers_from ON transfers(from_address);
CREATE INDEX idx_transfers_to ON transfers(to_address);
CREATE INDEX idx_transfers_block ON transfers(block_number);
CREATE INDEX idx_transfers_timestamp ON transfers(block_timestamp);

-- Current balances (derived from transfers)
CREATE TABLE balances (
    address VARCHAR(42) PRIMARY KEY,
    balance VARCHAR(78) NOT NULL DEFAULT '0',
    last_updated_block BIGINT NOT NULL,
    last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (address != '0x0000000000000000000000000000000000000000')
);

CREATE INDEX idx_balances_nonzero ON balances(balance) WHERE balance != '0';
CREATE INDEX idx_balances_updated_block ON balances(last_updated_block);

-- Stock split events
CREATE TABLE stock_splits (
    id SERIAL PRIMARY KEY,
    multiplier INTEGER NOT NULL,
    new_total_supply VARCHAR(78) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    affected_holders INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_splits_block ON stock_splits(block_number);
CREATE INDEX idx_splits_timestamp ON stock_splits(block_timestamp);

-- Metadata change events
CREATE TABLE metadata_changes (
    id SERIAL PRIMARY KEY,
    old_name TEXT NOT NULL,
    new_name TEXT NOT NULL,
    old_symbol VARCHAR(20) NOT NULL,
    new_symbol VARCHAR(20) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66) NOT NULL UNIQUE
);

CREATE INDEX idx_metadata_block ON metadata_changes(block_number);

-- Buyback events (SharesBoughtBack)
CREATE TABLE buybacks (
    id SERIAL PRIMARY KEY,
    holder_address VARCHAR(42) NOT NULL,
    amount VARCHAR(78) NOT NULL, -- Store as string to handle uint256
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    CONSTRAINT unique_buyback UNIQUE (tx_hash, log_index)
);

CREATE INDEX idx_buybacks_holder ON buybacks(holder_address);
CREATE INDEX idx_buybacks_block ON buybacks(block_number);
CREATE INDEX idx_buybacks_timestamp ON buybacks(block_timestamp);

-- View: Current Cap Table
CREATE OR REPLACE VIEW current_cap_table AS
SELECT
    b.address,
    b.balance,
    ROUND((b.balance::NUMERIC / NULLIF(SUM(b.balance::NUMERIC) OVER (), 0)) * 100, 4) as ownership_percentage,
    b.last_updated_block,
    b.last_updated_at,
    a.is_allowlisted
FROM balances b
LEFT JOIN allowlist a ON b.address = a.address
WHERE b.balance::NUMERIC > 0
ORDER BY b.balance::NUMERIC DESC;

-- View: Recent Activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT
    'transfer' as event_type,
    t.from_address as address1,
    t.to_address as address2,
    t.amount as value,
    t.block_number,
    t.block_timestamp,
    t.tx_hash
FROM transfers t
UNION ALL
SELECT
    'allowlist_add' as event_type,
    a.address as address1,
    NULL as address2,
    NULL as value,
    a.added_at_block as block_number,
    a.added_at as block_timestamp,
    a.tx_hash
FROM allowlist a
WHERE a.is_allowlisted = TRUE
UNION ALL
SELECT
    'stock_split' as event_type,
    NULL as address1,
    NULL as address2,
    s.multiplier::TEXT as value,
    s.block_number,
    s.block_timestamp,
    s.tx_hash
FROM stock_splits s
UNION ALL
SELECT
    'buyback' as event_type,
    b.holder_address as address1,
    NULL as address2,
    b.amount as value,
    b.block_number,
    b.block_timestamp,
    b.tx_hash
FROM buybacks b
ORDER BY block_number DESC, block_timestamp DESC
LIMIT 100;

-- Function: Update balance (called by indexer)
CREATE OR REPLACE FUNCTION update_balance(
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
    WHERE address = p_address;

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
    INSERT INTO balances (address, balance, last_updated_block, last_updated_at)
    VALUES (p_address, new_balance::TEXT, p_block_number, NOW())
    ON CONFLICT (address)
    DO UPDATE SET
        balance = new_balance::TEXT,
        last_updated_block = p_block_number,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Get cap table at specific block
CREATE OR REPLACE FUNCTION get_cap_table_at_block(p_block_number BIGINT)
RETURNS TABLE (
    address VARCHAR(42),
    balance VARCHAR(78),
    ownership_percentage NUMERIC
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
        b.addr as address,
        b.bal::TEXT as balance,
        ROUND((b.bal / NULLIF(SUM(b.bal) OVER (), 0)) * 100, 4) as ownership_percentage
    FROM balances_at_block b
    WHERE b.bal > 0
    ORDER BY b.bal DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE allowlist IS 'Tracks addresses approved for holding tokens';
COMMENT ON TABLE transfers IS 'All Transfer events from the ChainEquity contract';
COMMENT ON TABLE balances IS 'Current token balances (derived from transfers)';
COMMENT ON TABLE stock_splits IS 'Stock split corporate action events';
COMMENT ON TABLE metadata_changes IS 'Token name/symbol change events';
COMMENT ON TABLE buybacks IS 'SharesBoughtBack events (company share repurchase)';
COMMENT ON TABLE indexer_state IS 'Tracks indexer sync progress';
COMMENT ON VIEW current_cap_table IS 'Real-time view of token ownership distribution';
COMMENT ON VIEW recent_activity IS 'Recent blockchain activity across all event types';
