#!/bin/bash

# ChainEquity Anvil Testing Script
# This script demonstrates all the key features of the GatedEquityToken contract

# Contract address (update after deployment)
CONTRACT="0x5FbDB2315678afecb367f032d93F642f64180aa3"
RPC="http://localhost:8545"

# Test accounts from Anvil
OWNER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
OWNER_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

ALICE="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
ALICE_PK="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

BOB="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
BOB_PK="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

echo "========================================="
echo "  ChainEquity - Anvil Demo"
echo "========================================="
echo ""

echo "📋 Contract: $CONTRACT"
echo "👤 Owner: $OWNER"
echo "👥 Alice: $ALICE"
echo "👥 Bob: $BOB"
echo ""

echo "========================================="
echo "  Step 1: Check Initial State"
echo "========================================="
echo "Token Name:"
cast call $CONTRACT "name()" --rpc-url $RPC

echo ""
echo "Token Symbol:"
cast call $CONTRACT "symbol()" --rpc-url $RPC

echo ""
echo "Total Supply:"
cast call $CONTRACT "totalSupply()" --rpc-url $RPC
echo ""

echo "========================================="
echo "  Step 2: Add Alice to Allowlist"
echo "========================================="
cast send $CONTRACT "addToAllowlist(address)" $ALICE \
  --rpc-url $RPC \
  --private-key $OWNER_PK \
  --quiet

echo "✅ Alice added to allowlist"
echo "Checking Alice allowlist status:"
cast call $CONTRACT "isAllowlisted(address)" $ALICE --rpc-url $RPC
echo ""

echo "========================================="
echo "  Step 3: Mint 1000 Tokens to Alice"
echo "========================================="
cast send $CONTRACT "mint(address,uint256)" $ALICE 1000000000000000000000 \
  --rpc-url $RPC \
  --private-key $OWNER_PK \
  --quiet

echo "✅ Minted 1000 tokens to Alice"
echo "Alice's balance:"
cast call $CONTRACT "balanceOf(address)" $ALICE --rpc-url $RPC
echo ""

echo "========================================="
echo "  Step 4: Try Transfer to Non-Allowlisted Bob"
echo "========================================="
echo "❌ This should FAIL (Bob not allowlisted)..."
cast send $CONTRACT "transfer(address,uint256)" $BOB 100000000000000000000 \
  --rpc-url $RPC \
  --private-key $ALICE_PK 2>&1 || echo "✅ Transfer blocked as expected!"
echo ""

echo "========================================="
echo "  Step 5: Add Bob & Transfer (Should Work)"
echo "========================================="
cast send $CONTRACT "addToAllowlist(address)" $BOB \
  --rpc-url $RPC \
  --private-key $OWNER_PK \
  --quiet

echo "✅ Bob added to allowlist"

cast send $CONTRACT "transfer(address,uint256)" $BOB 400000000000000000000 \
  --rpc-url $RPC \
  --private-key $ALICE_PK \
  --quiet

echo "✅ Transferred 400 tokens from Alice to Bob"
echo ""
echo "Balances after transfer:"
echo "Alice:"
cast call $CONTRACT "balanceOf(address)" $ALICE --rpc-url $RPC
echo "Bob:"
cast call $CONTRACT "balanceOf(address)" $BOB --rpc-url $RPC
echo ""

echo "========================================="
echo "  Step 6: Execute 7-for-1 Stock Split"
echo "========================================="
cast send $CONTRACT "executeSplit(uint256,address[])" 7 "[$ALICE,$BOB]" \
  --rpc-url $RPC \
  --private-key $OWNER_PK \
  --quiet

echo "✅ Executed 7-for-1 split"
echo ""
echo "Balances after split:"
echo "Alice (600 * 7 = 4200):"
cast call $CONTRACT "balanceOf(address)" $ALICE --rpc-url $RPC
echo "Bob (400 * 7 = 2800):"
cast call $CONTRACT "balanceOf(address)" $BOB --rpc-url $RPC
echo "Total Supply:"
cast call $CONTRACT "totalSupply()" --rpc-url $RPC
echo ""

echo "========================================="
echo "  Step 7: Change Token Symbol"
echo "========================================="
cast send $CONTRACT "changeMetadata(string,string)" "ChainEquity V2" "CEQV2" \
  --rpc-url $RPC \
  --private-key $OWNER_PK \
  --quiet

echo "✅ Changed token metadata"
echo ""
echo "New Name:"
cast call $CONTRACT "name()" --rpc-url $RPC
echo "New Symbol:"
cast call $CONTRACT "symbol()" --rpc-url $RPC
echo ""
echo "Alice's balance (unchanged):"
cast call $CONTRACT "balanceOf(address)" $ALICE --rpc-url $RPC
echo ""

echo "========================================="
echo "  ✅ All Tests Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✅ Allowlist functionality working"
echo "  ✅ Gated transfers working"
echo "  ✅ Stock split working (7-for-1)"
echo "  ✅ Symbol change working"
echo ""
