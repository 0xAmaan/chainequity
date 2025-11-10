# ChainEquity Demo Script - Copy & Paste Commands

**Contract Address:** `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`

---

## Setup (If needed)
```bash
# Terminal 1: Start Anvil
anvil --port 8545

# Terminal 2: Start Indexer (keep running)
bun run indexer

# Terminal 3: Use for all commands below
```

---

## 1. Approve Wallet → Mint Tokens → Verify Balance

```bash
# Approve wallet (Account #1)
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Mint 1000 tokens
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000

# Verify balance
bun run cli status 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Expected:** Balance shows 1000 tokens, allowlisted status = ✅

---

## 2. Transfer Between Two Approved Wallets → SUCCESS

```bash
# Approve second wallet (Account #2)
bun run cli approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Transfer 100 tokens from Account #1 to Account #2 (SHOULD SUCCEED)
cast send 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  100000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Verify both balances
bun run cli status 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
bun run cli status 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

**Expected:** Transaction succeeds, Account #1 has 900, Account #2 has 100

---

## 3. Transfer from Approved to Non-Approved → FAIL

```bash
# Try to transfer to non-approved wallet (Account #4) - SHOULD FAIL
cast send 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "transfer(address,uint256)" \
  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 \
  50000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:** ❌ Transaction reverts with "TransferNotAllowed"

---

## 4. Transfer from Non-Approved to Approved → FAIL

```bash
# Mint to non-approved wallet (Account #3 - not yet approved)
bun run cli mint 0x90F79bf6EB2c4f870365E785982E1f101E93b906 500

# Try to transfer from non-approved sender to approved recipient - SHOULD FAIL
cast send 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  100000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
```

**Expected:** ❌ Transaction reverts with "TransferNotAllowed"

---

## 5. Revoke Approval → Previously Approved Can No Longer Receive

```bash
# First, verify transfer works (Account #1 to Account #2)
cast send 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  50000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Revoke Account #2
bun run cli revoke 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Try transfer again - SHOULD NOW FAIL
cast send 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  50000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Verify revoked status
bun run cli status 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

**Expected:** First transfer succeeds, second transfer fails, status shows ❌ Not allowlisted

---

## 6. Execute 7-for-1 Split → All Balances Multiply by 7

```bash
# Re-approve Account #2 and #3 for clean slate
bun run cli approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
bun run cli approve 0x90F79bf6EB2c4f870365E785982E1f101E93b906

# View cap table BEFORE split
bun run cli captable

# Execute 7-for-1 stock split
bun run cli split 7

# View cap table AFTER split
bun run cli captable

# Verify specific balances
bun run cli status 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
bun run cli status 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
bun run cli status 0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

**Expected:** All balances multiply by 7, ownership percentages unchanged

---

## 7. Change Symbol → Metadata Updates, Balances Unchanged

```bash
# View current metadata
bun run cli info

# Record current balances
bun run cli captable

# Change metadata
bun run cli metadata "ChainEquity V2" "CEQV2"

# Verify metadata changed
bun run cli info

# Verify balances unchanged
bun run cli captable

# Also verify on-chain
cast call 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 "name()(string)" --rpc-url http://127.0.0.1:8545
cast call 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 "symbol()(string)" --rpc-url http://127.0.0.1:8545
```

**Expected:** Name/symbol update, all balances remain the same

---

## 8. Export Cap-Table at Block N → Verify Accuracy

```bash
# Note: Assuming fresh Anvil start, contract deployed at block 1
# Previous scenarios created blocks 2-15 approximately

# Check current block
cast block-number --rpc-url http://127.0.0.1:8545

# Export cap table at a known historical block (e.g., block 5 - after first few operations)
bun run cli captable --block 5

# Make a change (mint more tokens) - this will create a new block
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100

# Export current cap table (latest state)
bun run cli captable

# Compare: Export historical cap table at block 5 (before the mint)
bun run cli captable --block 5

# The difference shows the 100 tokens minted in the last command
```

**Expected:** Historical export (block 5) shows state before mint, current shows after mint

---

## 9. Export Cap-Table at Block N+10 → Verify Changes Reflected

```bash
# Note: Using hardcoded blocks for deterministic testing
# Assuming block 3 = early state, and we'll create transactions through block 13+

# View current block for reference
cast block-number --rpc-url http://127.0.0.1:8545

# Export cap table at an early block (e.g., block 3)
bun run cli captable --block 3 > cap_block3.txt
echo "Cap table at block 3 saved"

# Execute multiple transactions to advance the chain
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100
bun run cli mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 50
bun run cli mint 0x90F79bf6EB2c4f870365E785982E1f101E93b906 25

# Check new block number (should be ~10 blocks later if you ran all previous scenarios)
cast block-number --rpc-url http://127.0.0.1:8545

# Export cap table at a later block (e.g., block 13 or current)
bun run cli captable --block 6 > cap_block6.txt
echo "Cap table at block 6 saved"

# Compare the two states
echo "=== Comparing block 3 vs block 6 ==="
diff cap_block3.txt cap_block6.txt

# Also compare block 3 vs current state
bun run cli captable --block 3
echo "---"
bun run cli captable
```

**Expected:** Changes reflected accurately between blocks (block 3 shows early state, block 13+ shows accumulated mints)

---

## 10. Unauthorized Wallet Attempts Admin Action → FAIL

```bash
# Try to approve using non-owner account (Account #1) - SHOULD FAIL
cast send 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "addToAllowlist(address)" \
  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Try to mint using non-owner - SHOULD FAIL
cast send 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "mint(address,uint256)" \
  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 \
  1000000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Try to execute split using non-owner - SHOULD FAIL
cast send 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "executeSplit(uint256)" \
  2 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Expected:** ❌ All transactions revert with "OwnableUnauthorizedAccount"

---

## Bonus: Export Cap Table in Different Formats

```bash
# View as table (default)
bun run cli captable

# Export as JSON
bun run cli captable --format json

# Export as CSV
bun run cli captable --format csv

# Save CSV to file
bun run cli captable --format csv > captable_export.csv
cat captable_export.csv
```

---

## Quick Database Verification

```bash
# View all balances in database
psql -U postgres -d chain_equity -c "SELECT * FROM current_cap_table;"

# View recent transfers
psql -U postgres -d chain_equity -c "SELECT * FROM transfers ORDER BY block_number DESC LIMIT 10;"

# View stock splits
psql -U postgres -d chain_equity -c "SELECT * FROM stock_splits;"

# View allowlist changes
psql -U postgres -d chain_equity -c "SELECT * FROM allowlist;"

# View metadata changes
psql -U postgres -d chain_equity -c "SELECT * FROM metadata_changes;"
```

---

## Reference: Test Accounts

- **Account #0 (Owner):** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

- **Account #1:** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  - Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

- **Account #2:** `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
  - Private Key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

- **Account #3:** `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
  - Private Key: `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6`

- **Account #4 (Non-Approved):** `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`
  - Private Key: `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a`

---

## Cleanup & Reset (If needed)

```bash
# Stop indexer
pkill -f "bun.*indexer"

# Reset database
psql -U postgres -c "DROP DATABASE IF EXISTS chain_equity;"
bun run db:init

# Restart Anvil (Ctrl+C, then restart)
anvil --port 8545

# Redeploy contract
forge script script/DeployGatedEquity.s.sol:DeployGatedEquity \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Update CONTRACT_ADDRESS in .env with new address
```

---

## Success Criteria Checklist

- [ ] ✅ False-positive transfers = 0 (Scenario 3 fails as expected)
- [ ] ✅ False-negative blocks = 0 (Scenario 2 succeeds as expected)
- [ ] ✅ As-of block cap-table works (Scenarios 8 & 9)
- [ ] ✅ 7-for-1 split works correctly (Scenario 6)
- [ ] ✅ Symbol change works (Scenario 7)
- [ ] ✅ Unauthorized actions fail (Scenario 10)
- [ ] ✅ Revoke prevents transfers (Scenario 5)
