```
forge script script/DeployGatedEquity.s.sol:DeployGatedEquity --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

# ChainEquity Testing Guide

A comprehensive manual testing guide for the complete ChainEquity system.

## Overview

This guide covers testing:
- **Smart Contracts** - Solidity contracts (GatedEquityToken)
- **Database** - PostgreSQL initialization and schema
- **Event Indexer** - Real-time blockchain event listener
- **CLI Tool** - Admin operations interface

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Bun** installed (`bun --version`)
- [ ] **Foundry** installed (`forge --version`, `anvil --version`)
- [ ] **PostgreSQL** installed (`pg_isready`)
- [ ] **curl** available (for RPC testing)

---

## Test Environment Setup

**You will need 3 terminals running simultaneously:**
1. **Terminal 1** - Anvil (local blockchain)
2. **Terminal 2** - Indexer (event listener)
3. **Terminal 3** - CLI commands (for testing)

---

### 1. Start Required Services

**Terminal 1: Start Anvil (Local Blockchain)**
```bash
anvil --port 8545
```

**Expected Output:**
- Shows 10 test accounts with private keys
- Listening on `127.0.0.1:8545`
- Default account #0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

**Keep this terminal running throughout testing**

---

**Terminal 2: Start PostgreSQL**
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Verify it's running
pg_isready -h localhost -p 5432
```

**Expected Output:**
```
localhost:5432 - accepting connections
```

---

### 2. Install Dependencies

**Terminal 3: Project Setup**
```bash
cd /Users/amaan/Desktop/Gauntlet/chain-equity

# Install Node dependencies
bun install

# Verify installation
ls node_modules | wc -l  # Should show ~70+ packages
```

---

## Part 1: Smart Contract Testing

### Test 1.1: Compile Contracts

```bash
forge build
```

**Expected Output:**
- `[⠢] Compiling...`
- `Compiler run successful!`
- Creates `out/` directory with compiled artifacts

**Verify:**
```bash
ls out/GatedEquityToken.sol/
# Should show: GatedEquityToken.json
```

---

### Test 1.2: Run Unit Tests

```bash
forge test -vvv
```

**Expected Output:**
- All tests pass with checkmarks
- Shows gas usage for each test
- No failures or reverts

**Key Tests to Verify:**
- `testDeployment` - Contract deploys correctly
- `testAllowlist` - Allowlist add/remove works
- `testMint` - Minting tokens works
- `testTransferRestriction` - Transfers are gated
- `testStockSplit` - Stock split mechanics
- `testMetadataChange` - Name/symbol updates

---

### Test 1.3: Deploy Contract to Anvil

```bash
forge script script/DeployGatedEquity.s.sol:DeployGatedEquity \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Expected Output:**
```
GatedEquityToken deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Name: ChainEquity Demo Token
Symbol: CEQDEMO
```

**Copy the deployed contract address!** You'll need it for the next steps.

---

### Test 1.4: Update Backend Configuration

```bash
# Edit backend/.env file
nano backend/.env
# Or use your preferred editor

# Update this line with your deployed contract address:
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Verify Configuration:**
```bash
cat backend/.env
```

**Should Show:**
```bash
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3  # ← Your address
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DATABASE_URL=postgresql://localhost:5432/chain_equity
DB_NAME=chain_equity
DB_USER=postgres
DB_PASSWORD=postgres
LOG_LEVEL=info
```

---

## Part 2: Database Testing

### Test 2.1: Initialize Database

```bash
bun run db:init
```

**Expected Output:**
```
🗄️  ChainEquity Database Initialization

✅ Connected to PostgreSQL server
✅ Created database: chain_equity
✅ Connected to database: chain_equity
✅ Applied database schema

📋 Created tables:
   - allowlist
   - balances
   - indexer_state
   - metadata_changes
   - stock_splits
   - transfers

👁️  Created views:
   - current_cap_table
   - recent_activity

✅ Database initialization complete!
```

---

### Test 2.2: Verify Database Schema

```bash
psql -U postgres -d chain_equity -c "\dt"
```

**Expected Output:**
```
              List of relations
 Schema |      Name        | Type  |  Owner
--------+------------------+-------+----------
 public | allowlist        | table | postgres
 public | balances         | table | postgres
 public | indexer_state    | table | postgres
 public | metadata_changes | table | postgres
 public | stock_splits     | table | postgres
 public | transfers        | table | postgres
```

---

### Test 2.3: Check Initial State

```bash
psql -U postgres -d chain_equity -c "SELECT * FROM indexer_state;"
```

**Expected Output:**
```
 id | last_processed_block
----+---------------------
  1 |                   0
```

---

### Test 2.4: Start the Indexer

**IMPORTANT: Keep this running throughout your testing!**

**Terminal 2: Start the Event Indexer**
```bash
bun run indexer
```

**Expected Output:**
```
🚀 ChainEquity Indexer Starting...
📍 Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
🔗 RPC URL: http://127.0.0.1:8545
🗄️  Database: chain_equity

Testing database connection...
✅ Database connection successful

📦 Current block: 2
📊 Last processed block: 0

🔄 Syncing historical events from block 1 to 2...

📋 Contract Info:
   Name: ChainEquity Demo Token
   Symbol: CEQDEMO
   Total Supply: 0

✅ Indexer is running and listening for events...
```

**What the Indexer Does:**
- Listens to blockchain events from your deployed contract
- Syncs historical events when it starts
- Writes all Transfer, Allowlist, and Corporate Action events to PostgreSQL
- Updates balances in real-time
- Keeps the cap table accurate

**Keep this terminal running!** The indexer must run continuously to keep the database in sync with the blockchain.

---

## Part 3: CLI Testing

**Terminal 3: For CLI Commands**

All CLI commands in this section should be run in a **third terminal** while Anvil (Terminal 1) and the Indexer (Terminal 2) are running.

---

### Test 3.1: Display Help

```bash
bun run cli --help
```

**Expected Output:**
```
ChainEquity CLI - Manage gated equity tokens on-chain

Commands:
  approve <address>           Add an address to the allowlist
  revoke <address>           Remove an address from the allowlist
  mint <address> <amount>    Mint tokens to an address
  buyback <address> <amount> Buy back shares from a holder
  split <multiplier>         Execute a stock split
  metadata <name> <symbol>   Change token name and symbol
  captable                   Display current cap table
  status [address]           Check allowlist status and balance
  info                       Display contract information
```

---

### Test 3.2: Get Contract Info

```bash
bun run cli info
```

**Expected Output:**
```
📋 Contract Information

Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Name:     ChainEquity Demo Token
Symbol:   CEQDEMO
Decimals: 18
Total Supply: 0
Owner:    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

---

### Test 3.3: Approve Addresses

Test with Anvil's default test accounts:

```bash
# Approve Account #1
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Expected Output:**
```
✅ Approving address for allowlist...

Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Network: anvil (31337)

⏳ Sending transaction...
✅ Transaction confirmed: 0x123...abc
✅ Address approved successfully!
```

**Repeat for more addresses:**
```bash
# Account #2
bun run cli approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Account #3
bun run cli approve 0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

---

### Test 3.4: Check Allowlist Status

```bash
bun run cli status 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Expected Output:**
```
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Allowlisted: ✅ Yes
Balance: 0 tokens
```

---

### Test 3.5: Mint Tokens

```bash
# Mint 1000 tokens to Account #1
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
```

**Expected Output:**
```
🪙  Minting tokens...

To: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Amount: 1000 tokens
Current balance: 0

⏳ Sending transaction...
✅ Transaction confirmed: 0x456...def
✅ Tokens minted successfully!

New balance: 1000
```

**Mint to other accounts:**
```bash
bun run cli mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 500
bun run cli mint 0x90F79bf6EB2c4f870365E785982E1f101E93b906 250
```

---

### Test 3.6: View Cap Table

```bash
bun run cli captable
```

**Expected Output:**
```
📊 Current Cap Table
═══════════════════════════════════════════════════════════════

Address                                     Balance  Ownership
──────────────────────────────────────────────────────────────
0x70997970C51812dc3A010C7d01b50e0d17dc79C8    1000     57.14%
0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC     500     28.57%
0x90F79bf6EB2c4f870365E785982E1f101E93b906     250     14.29%
──────────────────────────────────────────────────────────────
Total                                        1750    100.00%
```

---

### Test 3.7: Export Cap Table (JSON)

```bash
bun run cli captable --format json
```

**Expected Output:**
```json
{
  "totalSupply": "1750",
  "holders": 3,
  "timestamp": "2025-11-09T...",
  "capTable": [
    {
      "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "balance": "1000",
      "ownership": "57.14%",
      "isAllowlisted": true
    },
    ...
  ]
}
```

---

### Test 3.8: Export Cap Table (CSV)

```bash
bun run cli captable --format csv > captable.csv
cat captable.csv
```

**Expected Output:**
```csv
address,balance,ownership_percentage
0x70997970C51812dc3A010C7d01b50e0d17dc79C8,1000,57.14
0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,500,28.57
0x90F79bf6EB2c4f870365E785982E1f101E93b906,250,14.29
```

---

### Test 3.9: Stock Split

```bash
# Execute a 2-for-1 stock split
bun run cli split 2
```

**Expected Output:**
```
📊 Executing stock split...

Multiplier: 2x
Holders: 3
Current supply: 1750
New supply: 3500

⏳ Sending transaction...
✅ Transaction confirmed: 0x789...ghi
✅ Stock split executed successfully!

Final supply: 3500
```

**Verify Split:**
```bash
bun run cli captable
```

**Expected: All balances doubled, ownership % unchanged**

---

### Test 3.10: Change Metadata

```bash
bun run cli metadata "ChainEquity Updated" "CEQV2"
```

**Expected Output:**
```
📝 Changing token metadata...

Current name: ChainEquity Demo Token
Current symbol: CEQDEMO
New name: ChainEquity Updated
New symbol: CEQV2

⏳ Sending transaction...
✅ Transaction confirmed: 0xabc...123
✅ Metadata changed successfully!

Confirmed name: ChainEquity Updated
Confirmed symbol: CEQV2
```

---

### Test 3.11: Buyback Shares

```bash
# Buy back 100 tokens from Account #1
bun run cli buyback 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100
```

**Expected Output:**
```
💰 Executing share buyback...

Buying back from: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Amount: 100 tokens
Current balance: 2000

⏳ Sending transaction...
✅ Transaction confirmed: 0xdef...456
✅ Shares bought back successfully!

Holder's new balance: 1900
New total supply: 3400

Note: Off-chain payment must be completed separately via wire/stablecoin
```

---

### Test 3.12: Revoke Allowlist

```bash
# Remove Account #3 from allowlist
bun run cli revoke 0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

**Expected Output:**
```
❌ Revoking address from allowlist...

Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906

⏳ Sending transaction...
✅ Transaction confirmed: 0x987...654
✅ Address revoked successfully!
```

**Verify:**
```bash
bun run cli status 0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

**Expected:**
```
Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
Allowlisted: ❌ No
Balance: 500 tokens
```

---

## Part 4: Event Indexer Testing

### Test 4.1: Start Indexer

**Terminal 4: Start the Indexer**
```bash
bun run indexer
```

**Expected Output:**
```
🚀 ChainEquity Indexer Starting...
📍 Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
🔗 RPC URL: http://127.0.0.1:8545
🗄️  Database: chain_equity

Testing database connection...
✅ Database connection successful

📦 Current block: 15
📊 Last processed block: 0

🔄 Syncing historical events from block 1 to 15...

Processing Transfer event: 0x000...000 → 0x709...9C8 (1000 tokens)
Processing Transfer event: 0x000...000 → 0x3C4...3BC (500 tokens)
Processing Transfer event: 0x000...000 → 0x90F...906 (250 tokens)
Processing StockSplit event: 2x multiplier
...

📋 Contract Info:
   Name: ChainEquity Updated
   Symbol: CEQV2
   Total Supply: 3400000000000000000000

✅ Indexer is running and listening for events...
```

**Leave this running!**

---

### Test 4.2: Verify Indexer Synced Data

**Terminal 3: Query Database**
```bash
psql -U postgres -d chain_equity -c "SELECT * FROM transfers ORDER BY block_number DESC LIMIT 5;"
```

**Expected Output:**
```
 id | transaction_hash | block_number |   from_address   |    to_address    | amount | timestamp
----+------------------+--------------+------------------+------------------+--------+-----------
  5 | 0x789...         |           10 | 0x709...         | 0x000...         |    100 | 2025-...
  4 | 0x456...         |            8 | 0x000...         | 0x90F...         |    250 | 2025-...
  3 | 0x456...         |            7 | 0x000...         | 0x3C4...         |    500 | 2025-...
  2 | 0x123...         |            6 | 0x000...         | 0x709...         |   1000 | 2025-...
```

---

### Test 4.3: Test Real-Time Event Listening

With the indexer still running, execute a new transaction:

**Terminal 3:**
```bash
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100
```

**Watch Terminal 4 (Indexer):**

**Expected to see:**
```
📥 New Transfer event detected
   From: 0x0000000000000000000000000000000000000000
   To:   0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Amount: 100
   Block: 16
✅ Event processed and saved to database
```

---

### Test 4.4: Verify Database Updated

```bash
psql -U postgres -d chain_equity -c "SELECT * FROM balances;"
```

**Expected Output:**
```
 id |       address        | balance | last_updated
----+----------------------+---------+--------------
  1 | 0x709...9C8          |    2100 |       16
  2 | 0x3C4...3BC          |    1000 |       10
  3 | 0x90F...906          |     500 |        8
```

---

### Test 4.5: Check Indexer State

```bash
psql -U postgres -d chain_equity -c "SELECT * FROM indexer_state;"
```

**Expected Output:**
```
 id | last_processed_block
----+---------------------
  1 |                  16
```

---

### Test 4.6: View Recent Activity

```bash
psql -U postgres -d chain_equity -c "SELECT * FROM recent_activity LIMIT 5;"
```

**Expected Output:**
```
 event_type |   address    | amount | block_number |    timestamp
------------+--------------+--------+--------------+-----------------
 transfer   | 0x709...9C8  |    100 |           16 | 2025-11-09...
 transfer   | 0x709...9C8  | -  100 |           10 | 2025-11-09...
 split      | NULL         |      2 |            9 | 2025-11-09...
 metadata   | NULL         |   NULL |            9 | 2025-11-09...
```

---

### Test 4.7: Stop Indexer Gracefully

**Terminal 4: Press `Ctrl+C`**

**Expected Output:**
```
📡 Received SIGINT, shutting down gracefully...
🛑 Stopping event listener...
🛑 Closing database connection...
✅ Shutdown complete
```

---

## Part 5: Integration Testing

### Test 5.1: Historical Cap Table Query

```bash
# Get current block number
cast block-number --rpc-url http://127.0.0.1:8545

# Query cap table at block 8 (before split)
bun run cli captable --block 8
```

**Expected Output:**
```
📊 Historical Cap Table (Block 8)
═══════════════════════════════════════════════════════════

Address                                     Balance  Ownership
────────────────────────────────────────────────────────────
0x70997970C51812dc3A010C7d01b50e0d17dc79C8    1000     57.14%
0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC     500     28.57%
0x90F79bf6EB2c4f870365E785982E1f101E93b906     250     14.29%
────────────────────────────────────────────────────────────
Total                                        1750    100.00%
```

---

### Test 5.2: Full Workflow End-to-End

**Run the automated demo script:**
```bash
bun backend/demo.ts
```

**What it does:**
1. Deploys fresh contract
2. Initializes database
3. Approves 3 addresses
4. Mints tokens
5. Starts indexer
6. Generates cap tables (table, JSON, CSV)
7. Executes stock split
8. Changes metadata

**Expected: All steps complete with ✅ checkmarks**

---

### Test 5.3: Error Handling Tests

**Test 1: Try to mint to non-allowlisted address**
```bash
# This should work (minting bypasses allowlist)
bun run cli mint 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 100
```

**Test 2: Approve zero address (should fail)**
```bash
bun run cli approve 0x0000000000000000000000000000000000000000
```

**Expected:**
```
❌ Error: InvalidAddress()
```

**Test 3: Invalid split multiplier**
```bash
bun run cli split 1
```

**Expected:**
```
❌ Error: InvalidMultiplier()
```

**Test 4: Empty metadata**
```bash
bun run cli metadata "" ""
```

**Expected:**
```
❌ Error: InvalidMetadata()
```

---

## Part 6: Logs and Monitoring

### Test 6.1: Check Application Logs

```bash
# View error logs
tail -f backend/logs/error.log

# View all logs
tail -f backend/logs/combined.log

# View indexer logs (if saved)
tail -f backend/logs/indexer.log
```

---

### Test 6.2: Monitor Anvil Logs

**Terminal 1: Check Anvil output**

You should see transaction logs for each CLI command:
```
eth_sendRawTransaction
eth_getTransactionReceipt
eth_blockNumber
```

---

### Test 6.3: Database Connection Monitoring

```bash
# Check active connections
psql -U postgres -d chain_equity -c "SELECT count(*) FROM pg_stat_activity WHERE datname='chain_equity';"
```

---

## Part 7: Required Test Scenarios (Project Spec)

The following test scenarios are **required** per the project specification. Use this as a checklist.

### Scenario 7.1: Approve → Mint → Verify

```bash
# Approve wallet
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Mint tokens
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000

# Verify balance
bun run cli status 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Expected:** Balance shows 1000 tokens

---

### Scenario 7.2: Transfer Between Approved Wallets → SUCCESS

**Setup:**
```bash
# Approve both wallets
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
bun run cli approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Mint to first wallet
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
```

**Test Transfer Using Cast:**
```bash
# Transfer tokens from Account #1 to Account #2
# Need to use cast send with Account #1's private key
cast send <CONTRACT_ADDRESS> \
  "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  100000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:** Transaction succeeds, both wallets allowlisted

---

### Scenario 7.3: Transfer Approved → Non-Approved → FAIL

**Setup:**
```bash
# Approve sender only
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Mint tokens
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
```

**Test:**
```bash
# Try to transfer to non-approved wallet (Account #4)
cast send <CONTRACT_ADDRESS> \
  "transfer(address,uint256)" \
  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 \
  100000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:**
```
Error: TransferNotAllowed
Transaction reverts
```

**Success Criteria:** False-positive transfers = 0

---

### Scenario 7.4: Transfer Non-Approved → Approved → FAIL

**Setup:**
```bash
# Approve recipient only
bun run cli approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Mint directly to non-approved wallet (minting bypasses allowlist)
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
```

**Test:**
```bash
# Try to transfer from non-approved sender to approved recipient
cast send <CONTRACT_ADDRESS> \
  "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  100000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:** Transaction reverts with TransferNotAllowed

**Success Criteria:** False-negative blocks = 0

---

### Scenario 7.5: Revoke → Previously Approved Can't Receive

**Setup:**
```bash
# Approve and mint
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
bun run cli approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000

# Verify transfer works
cast send <CONTRACT_ADDRESS> "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 100000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Revoke:**
```bash
bun run cli revoke 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

**Test:**
```bash
# Try to transfer again (should now fail)
cast send <CONTRACT_ADDRESS> "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 100000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:** Transaction reverts, Address can no longer receive

---

### Scenario 7.6: Execute 7-for-1 Split

**Setup:**
```bash
# Setup cap table
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
bun run cli approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
bun run cli approve 0x90F79bf6EB2c4f870365E785982E1f101E93b906

bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
bun run cli mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 500
bun run cli mint 0x90F79bf6EB2c4f870365E785982E1f101E93b906 250

# Record before state
bun run cli captable
```

**Execute Split:**
```bash
# 7-for-1 split
bun run cli split 7
```

**Verify:**
```bash
bun run cli captable
```

**Expected:**
- Account #1: 7,000 tokens (1000 × 7)
- Account #2: 3,500 tokens (500 × 7)
- Account #3: 1,750 tokens (250 × 7)
- Total Supply: 12,250 tokens (1750 × 7)
- Ownership percentages: **UNCHANGED** (57.14%, 28.57%, 14.29%)

**Success Criteria:** All balances multiply by 7, total supply updates correctly

---

### Scenario 7.7: Change Symbol → Metadata Updates

**Before:**
```bash
bun run cli info
# Note current name and symbol
```

**Execute:**
```bash
bun run cli metadata "ChainEquity V2" "CEQV2"
```

**Verify:**
```bash
bun run cli info

# Also verify on-chain directly
cast call <CONTRACT_ADDRESS> "name()(string)" --rpc-url http://127.0.0.1:8545
cast call <CONTRACT_ADDRESS> "symbol()(string)" --rpc-url http://127.0.0.1:8545

# Verify balances unchanged
bun run cli captable
```

**Expected:**
- Name: "ChainEquity V2"
- Symbol: "CEQV2"
- All balances unchanged
- Ownership percentages unchanged

---

### Scenario 7.8: Export Cap-Table at Block N

**Setup:**
```bash
# Get current block
export BLOCK_N=$(cast block-number --rpc-url http://127.0.0.1:8545)
echo "Current block: $BLOCK_N"

# Create some transactions
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100
```

**Test:**
```bash
# Export at earlier block
bun run cli captable --block $BLOCK_N

# Compare to current
bun run cli captable
```

**Verify:**
- Historical cap table shows state at block N
- Current cap table shows latest state
- Data accuracy: balances match blockchain state

---

### Scenario 7.9: Export Cap-Table at Block N+10

**Setup:**
```bash
# Record starting block
export START_BLOCK=$(cast block-number --rpc-url http://127.0.0.1:8545)

# Execute multiple transactions
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100
bun run cli mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 50
bun run cli mint 0x90F79bf6EB2c4f870365E785982E1f101E93b906 25

# Get new block
export END_BLOCK=$(cast block-number --rpc-url http://127.0.0.1:8545)
echo "Start: $START_BLOCK, End: $END_BLOCK"
```

**Test:**
```bash
# Compare cap tables
bun run cli captable --block $START_BLOCK > cap_start.txt
bun run cli captable --block $END_BLOCK > cap_end.txt

# View differences
diff cap_start.txt cap_end.txt
```

**Expected:** Changes reflected accurately between blocks

---

### Scenario 7.10: Unauthorized Admin Action → FAIL

**Test:**
```bash
# Try to approve using non-owner account (Account #1)
cast send <CONTRACT_ADDRESS> \
  "addToAllowlist(address)" \
  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:**
```
Error: OwnableUnauthorizedAccount
Transaction reverts
```

**Also Test:**
```bash
# Try to mint using non-owner
cast send <CONTRACT_ADDRESS> \
  "mint(address,uint256)" \
  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 \
  1000000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:** Transaction reverts with ownership error

---

## Part 8: Gas Benchmarks

### Test 8.1: Run Foundry Gas Report

```bash
forge test --gas-report
```

**Expected Output:**
```
╭──────────────────────────┬─────────┬────────┬────────┬─────────╮
│ Function                 │ Min     │ Avg    │ Median │ Max     │
├──────────────────────────┼─────────┼────────┼────────┼─────────┤
│ addToAllowlist           │ 45,123  │ 46,234 │ 46,234 │ 48,234  │
│ removeFromAllowlist      │ 27,345  │ 28,456 │ 28,456 │ 30,456  │
│ mint                     │ 73,456  │ 75,678 │ 75,678 │ 78,678  │
│ transfer (gated)         │ 85,234  │ 87,345 │ 87,345 │ 90,345  │
│ buyback                  │ 68,123  │ 70,234 │ 70,234 │ 73,234  │
│ executeSplit             │ varies by holders                     │
│ changeMetadata           │ 35,678  │ 37,789 │ 37,789 │ 40,789  │
╰──────────────────────────┴─────────┴────────┴────────┴─────────╯
```

### Test 8.2: Benchmark Stock Split Gas Cost

```bash
# Test with different holder counts
forge test --match-test testSplit -vvv
```

**Document:**
- Gas per holder
- Total gas for 3 holders
- Total gas for 10 holders
- Total gas for 100 holders (if tested)

---

### Gas Benchmark Targets (from spec)

| Operation | Target Gas | Status |
|-----------|-----------|--------|
| Mint tokens | <100k gas | ✅ / ❌ |
| Approve wallet | <50k gas | ✅ / ❌ |
| Transfer (gated) | <100k gas | ✅ / ❌ |
| Revoke approval | <50k gas | ✅ / ❌ |
| Stock split (per holder) | Document actual | ___ gas |
| Symbol change | <50k gas | ✅ / ❌ |

**If any exceed targets:** Document why and propose optimizations

---

## Part 9: Performance Testing

### Test 9.1: Transfer Confirmation Time

```bash
# Measure time for transfer
time cast send <CONTRACT_ADDRESS> \
  "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  100000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:** Within testnet norms (Anvil: <1 second)

---

### Test 9.2: Indexer Cap-Table Generation Time

**Setup:**
```bash
# Stop indexer if running
pkill -f "bun.*indexer"

# Reset to simulate behind state
psql -U postgres -d chain_equity -c "UPDATE indexer_state SET last_processed_block = 0;"

# Execute several transactions
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
bun run cli mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 500
bun run cli mint 0x90F79bf6EB2c4f870365E785982E1f101E93b906 250
```

**Test:**
```bash
# Start indexer and measure sync time
time bun run indexer &

# Wait for "Indexer is up to date"
# Should be <10 seconds after finality
```

**Expected:** Cap table available within 10 seconds of block finality

---

## Part 10: Success Criteria Checklist

### Correctness

- [ ] **False-positive transfers = 0**
  - Non-allowlisted addresses CANNOT receive tokens
  - Test scenario 7.3 passes

- [ ] **False-negative blocks = 0**
  - Allowlisted addresses CAN transfer freely
  - Test scenario 7.2 passes

---

### Operability

- [ ] **"As-of block" cap-table export works**
  - Historical queries return accurate data
  - Test scenarios 7.8 and 7.9 pass
  - Can export at any past block height

---

### Corporate Actions

- [ ] **Stock split works correctly**
  - All balances multiply by specified ratio
  - Total supply updates correctly
  - Ownership percentages remain unchanged
  - Test scenario 7.6 passes (7-for-1 split)

- [ ] **Symbol change works correctly**
  - Metadata updates on-chain
  - Balances remain unchanged
  - Test scenario 7.7 passes

---

### Performance

- [ ] **Transfer confirmation time: Within testnet norms**
  - Anvil: <1 second
  - Public testnet: <30 seconds
  - Test 9.1 passes

- [ ] **Indexer produces cap-table: <10s after finality**
  - Sync time measured
  - Real-time event processing works
  - Test 9.2 passes

---

### Documentation

- [ ] **Chain/standard rationale documented**
  - Why Anvil/local development?
  - Why ERC-20 standard?
  - Why this approach to corporate actions?

---

### Additional Requirements

- [ ] **Admin safety controls**
  - Only owner can approve/mint/revoke
  - Test scenario 7.10 passes
  - Unauthorized actions revert

- [ ] **Gas report provided**
  - All operations benchmarked
  - Test 8.1 and 8.2 complete
  - Targets met or optimizations documented

- [ ] **Test coverage complete**
  - All 10 required scenarios tested
  - Happy path and failure cases covered
  - All tests documented with results

- [ ] **Reproducible setup**
  - README includes setup instructions
  - One-command setup works
  - Anyone can run the demo

- [ ] **Risks/limitations documented**
  - Disclaimer present (NOT regulatory-compliant)
  - Known limitations listed
  - No false compliance claims

---

## Part 11: Cleanup and Reset

### Test 11.1: Stop All Services

```bash
# Stop indexer (if running)
pkill -f "bun.*indexer"

# Stop Anvil (Ctrl+C in Terminal 1)

# Stop PostgreSQL (optional)
brew services stop postgresql  # macOS
```

---

### Test 11.2: Reset Database

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS chain_equity;"
bun run db:init
```

---

### Test 11.3: Clean Blockchain State

**Restart Anvil (Terminal 1):**
```bash
anvil --port 8545
```

This creates a fresh blockchain state.

---

## Troubleshooting Guide

### Issue: "Cannot connect to database"

**Check:**
```bash
pg_isready -h localhost -p 5432
brew services list  # macOS - check postgresql status
```

**Fix:**
```bash
brew services start postgresql
```

---

### Issue: "Contract address not set"

**Check:**
```bash
cat backend/.env | grep CONTRACT_ADDRESS
```

**Fix:**
```bash
# Deploy contract again and update .env
```

---

### Issue: "RPC connection failed"

**Check:**
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545
```

**Expected:**
```json
{"jsonrpc":"2.0","id":1,"result":"0x10"}
```

**Fix:** Start Anvil

---

### Issue: "Indexer not syncing"

**Check logs:**
```bash
tail -20 backend/logs/combined.log
```

**Common causes:**
- Wrong CONTRACT_ADDRESS in .env
- Anvil not running
- Database connection failed

---

### Issue: CLI command hangs

**Check:**
- Is Anvil running?
- Is the RPC_URL correct in backend/.env?
- Try with `-vvv` flag for verbose output

---

## Demo Presentation Flow

### Quick Demo (5 minutes)

1. **Show contract deployment** (30 sec)
   ```bash
   forge script script/DeployGatedEquity.s.sol:DeployGatedEquity --rpc-url http://127.0.0.1:8545 --broadcast
   ```

2. **Initialize database** (30 sec)
   ```bash
   bun run db:init
   ```

3. **Show CLI operations** (2 min)
   ```bash
   bun run cli info
   bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
   bun run cli captable
   ```

4. **Start indexer** (30 sec)
   ```bash
   bun run indexer
   ```

5. **Show real-time sync** (1 min)
   - Mint more tokens while indexer is running
   - Show database updates

---

### Full Demo (15 minutes)

Run the automated demo:
```bash
bun backend/demo.ts
```

Then show:
1. Cap table in multiple formats
2. Historical queries
3. Database contents
4. Indexer logs

---

## Success Criteria

You've successfully tested everything when:

- ✅ All Foundry tests pass
- ✅ Contract deploys to Anvil
- ✅ Database schema creates successfully
- ✅ All CLI commands work without errors
- ✅ Indexer syncs historical events
- ✅ Indexer listens for new events in real-time
- ✅ Cap tables generate in all formats
- ✅ Corporate actions (split, metadata) work
- ✅ Database queries return correct data
- ✅ Graceful shutdown works

---

## Next Steps

After testing:

1. **Document any issues found**
2. **Create a bug list** if needed
3. **Test on different networks** (testnet)
4. **Add authentication** for production
5. **Set up monitoring** and alerts
6. **Implement rate limiting**

---

## Quick Reference

### Useful Commands

```bash
# Check Anvil block number
cast block-number --rpc-url http://127.0.0.1:8545

# Get transaction receipt
cast receipt <TX_HASH> --rpc-url http://127.0.0.1:8545

# Call contract directly
cast call <CONTRACT_ADDRESS> "totalSupply()" --rpc-url http://127.0.0.1:8545

# Query specific address balance
cast call <CONTRACT_ADDRESS> "balanceOf(address)(uint256)" <ADDRESS> --rpc-url http://127.0.0.1:8545

# Check if address is allowlisted
cast call <CONTRACT_ADDRESS> "isAllowlisted(address)(bool)" <ADDRESS> --rpc-url http://127.0.0.1:8545
```

### Database Queries

```bash
# View all tables
psql -U postgres -d chain_equity -c "\dt"

# View cap table
psql -U postgres -d chain_equity -c "SELECT * FROM current_cap_table;"

# View transfers
psql -U postgres -d chain_equity -c "SELECT * FROM transfers ORDER BY block_number DESC LIMIT 10;"

# View stock splits
psql -U postgres -d chain_equity -c "SELECT * FROM stock_splits;"

# View allowlist
psql -U postgres -d chain_equity -c "SELECT * FROM allowlist;"
```

---

## Anvil Test Accounts Reference

### Default Accounts (for testing)

**Account #0 (Owner/Admin):**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Use: Contract deployer, admin operations

**Account #1:**
- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Use: Primary test holder

**Account #2:**
- Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- Private Key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- Use: Secondary test holder

**Account #3:**
- Address: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
- Private Key: `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6`
- Use: Tertiary test holder

**Account #4 (Non-Approved):**
- Address: `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`
- Private Key: `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a`
- Use: Testing unauthorized transfers

---

## Testing Checklist Summary

Print this checklist to track your testing progress:

### Core Functionality
- [ ] Contract compiles successfully
- [ ] Contract deploys to Anvil
- [ ] Database initializes with schema
- [ ] CLI commands execute without errors
- [ ] Indexer syncs historical events
- [ ] Indexer listens for new events in real-time

### Required Test Scenarios (10/10)
- [ ] 7.1: Approve → Mint → Verify
- [ ] 7.2: Transfer between approved → SUCCESS
- [ ] 7.3: Transfer approved → non-approved → FAIL
- [ ] 7.4: Transfer non-approved → approved → FAIL
- [ ] 7.5: Revoke → Can't receive
- [ ] 7.6: Execute 7-for-1 split
- [ ] 7.7: Change symbol/metadata
- [ ] 7.8: Export cap-table at block N
- [ ] 7.9: Export cap-table at block N+10
- [ ] 7.10: Unauthorized admin action → FAIL

### Gas Benchmarks (6/6)
- [ ] Mint tokens (<100k gas)
- [ ] Approve wallet (<50k gas)
- [ ] Transfer gated (<100k gas)
- [ ] Revoke approval (<50k gas)
- [ ] Stock split (documented)
- [ ] Symbol change (<50k gas)

### Performance
- [ ] Transfer confirmation time measured
- [ ] Indexer cap-table generation <10s

### Success Criteria
- [ ] False-positive transfers = 0
- [ ] False-negative blocks = 0
- [ ] As-of block cap-table works
- [ ] Corporate actions demonstrated
- [ ] Admin safety controls verified
- [ ] Documentation complete

---

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| `Cannot connect to database` | `brew services start postgresql` |
| `RPC connection failed` | Start Anvil: `anvil --port 8545` |
| `Contract address not set` | Update `backend/.env` with deployed address |
| `Transaction reverts` | Check if addresses are allowlisted |
| `Indexer not syncing` | Check logs: `tail -f backend/logs/combined.log` |
| CLI command hangs | Verify Anvil is running and RPC_URL is correct |
| Split fails | Ensure addresses in database match actual holders |

---

**Happy Testing! 🚀**

**Questions or Issues?** Check the troubleshooting section or contact Bryce Harris at bharris@peak6.com
