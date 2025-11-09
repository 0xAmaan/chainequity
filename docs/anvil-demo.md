# Anvil Live Testing Demo

## Contract Deployed

**Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
**Owner**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Account #0)

## Test Accounts

From Anvil:
- **Account 0 (Owner/Admin)**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Alice (Account 1)**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Bob (Account 2)**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Carol (Account 3)**: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`

## Testing Workflow

### Step 1: Check Initial State ✅

```bash
# Check token name
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "name()" --rpc-url http://localhost:8545

# Check token symbol
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "symbol()" --rpc-url http://localhost:8545

# Check total supply (should be 0)
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "totalSupply()" --rpc-url http://localhost:8545
```

### Step 2: Add Alice to Allowlist ✅

```bash
# Add Alice to allowlist (as owner)
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "addToAllowlist(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Verify Alice is allowlisted
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "isAllowlisted(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://localhost:8545
```

### Step 3: Mint Tokens to Alice ✅

```bash
# Mint 1000 tokens to Alice
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "mint(address,uint256)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000000000000000000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Check Alice's balance (should be 1000 tokens = 1000e18)
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://localhost:8545
```

### Step 4: Try Transfer to Non-Allowlisted Bob (Should FAIL) ❌

```bash
# Try to transfer from Alice to Bob (Bob is NOT allowlisted)
# This should FAIL with TransferNotAllowed error
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "transfer(address,uint256)" 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 100000000000000000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

### Step 5: Add Bob to Allowlist, Then Transfer (Should SUCCEED) ✅

```bash
# Add Bob to allowlist
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "addToAllowlist(address)" 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Now transfer from Alice to Bob (should SUCCEED)
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "transfer(address,uint256)" 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 400000000000000000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Check balances
# Alice should have 600 tokens
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://localhost:8545

# Bob should have 400 tokens
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)" 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  --rpc-url http://localhost:8545
```

### Step 6: Execute 7-for-1 Stock Split ✅

```bash
# Add Carol to allowlist first
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "addToAllowlist(address)" 0x90F79bf6EB2c4f870365E785982E1f101E93b906 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Mint some tokens to Carol
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "mint(address,uint256)" 0x90F79bf6EB2c4f870365E785982E1f101E93b906 200000000000000000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Execute 7-for-1 split for all 3 holders
# Note: The holders array needs to be passed correctly
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "executeSplit(uint256,address[])" 7 "[0x70997970C51812dc3A010C7d01b50e0d17dc79C8,0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,0x90F79bf6EB2c4f870365E785982E1f101E93b906]" \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Check balances after split
# Alice: 600 * 7 = 4200
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://localhost:8545

# Bob: 400 * 7 = 2800
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)" 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  --rpc-url http://localhost:8545

# Carol: 200 * 7 = 1400
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)" 0x90F79bf6EB2c4f870365E785982E1f101E93b906 \
  --rpc-url http://localhost:8545

# Check total supply: (600+400+200) * 7 = 8400
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "totalSupply()" \
  --rpc-url http://localhost:8545
```

### Step 7: Change Token Symbol ✅

```bash
# Change symbol from CEQDEMO to CEQV2
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "changeMetadata(string,string)" "ChainEquity V2" "CEQV2" \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Verify new symbol
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "symbol()" --rpc-url http://localhost:8545

# Verify new name
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "name()" --rpc-url http://localhost:8545

# Verify balances are unchanged
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://localhost:8545
```

## Summary of Tests

| Test | Expected Result | Status |
|------|----------------|--------|
| Deploy contract | Success | ✅ |
| Check initial state | name, symbol, supply=0 | ✅ |
| Add Alice to allowlist | AddressAllowlisted event | ✅ |
| Mint to Alice | Balance updated | ✅ |
| Transfer Alice → Bob (not allowlisted) | FAIL (TransferNotAllowed) | ✅ |
| Add Bob to allowlist | AddressAllowlisted event | ✅ |
| Transfer Alice → Bob (both allowlisted) | SUCCESS | ✅ |
| Execute 7-for-1 split | All balances * 7 | ✅ |
| Change symbol | Metadata updated, balances preserved | ✅ |

## Useful Cast Commands

```bash
# Decode hex output to string
cast --to-ascii <hex_output>

# Decode hex to decimal
cast --to-dec <hex_output>

# Get transaction receipt
cast receipt <tx_hash> --rpc-url http://localhost:8545

# Get recent events
cast logs --address 0x5FbDB2315678afecb367f032d93F642f64180aa3 --rpc-url http://localhost:8545
```

## Cleanup

When done testing:
```bash
# Find Anvil process
ps aux | grep anvil

# Kill it
kill <pid>
```
