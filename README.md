# ChainEquity

Tokenized cap table management with gated token transfers. Deploy equity tokens on-chain with allowlist-based transfer restrictions and corporate action support.

> **⚠️ Demo Only**: This is a technical prototype. Not regulatory-compliant. Do not use for real securities without legal review.

## What It Does

- Deploy ERC20 equity tokens with transfer restrictions (allowlist)
- Manage cap tables on-chain with real-time indexing
- Execute corporate actions: stock splits, buybacks, metadata changes
- Export cap tables as of any historical block

## Stack

- **Contracts**: Solidity + Foundry
- **Backend**: Bun + TypeScript (CLI tools)
- **Frontend**: Next.js 16 + React 19 + Tailwind
- **Database**: Convex (real-time event indexing)
- **Web3**: thirdweb + viem

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
cp .env.example .env.local
# Edit both files with your config

# Start Convex (first time)
npx convex dev

# Start local blockchain
anvil --port 8545

# Deploy contract
forge script script/DeployGatedEquity.s.sol:DeployGatedEquity \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Start frontend + Convex
bun run dev
```

Visit `http://localhost:3000`

## Key Commands

### Development
```bash
bun run dev          # Start Next.js + Convex
bun run build        # Build for production
bun run cli          # CLI for contract operations
```

### Smart Contracts
```bash
forge build          # Compile contracts
forge test -vvv      # Run tests
anvil --port 8545    # Local blockchain
```

## Architecture

```
┌─────────────────┐
│  GatedEquity    │  Smart contract with allowlist + corporate actions
│  Token (ERC20)  │
└────────┬────────┘
         │
         │ Events indexed via frontend listeners
         ↓
┌─────────────────┐
│     Convex      │  Real-time database (indexed events)
│    Database     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Next.js UI    │  Dashboard, admin operations, cap table
└─────────────────┘

Backend CLI ──────► Blockchain (direct RPC interaction)
```

## Contract Features

**Transfer Restrictions**
- Only allowlisted addresses can send/receive tokens
- Minting/burning bypass allowlist (admin-only)

**Corporate Actions**
- Stock splits (multiply all balances)
- Metadata changes (rename token/symbol)
- Share buybacks (burn tokens)

**Admin Operations**
- Add/remove addresses from allowlist
- Mint new tokens
- Execute corporate actions

## Supported Chains

- **Anvil Local** (Chain ID 31337) - Development
- **Base Sepolia** (Chain ID 84532) - Testnet
- **Arbitrum Sepolia** (Chain ID 421614) - Alternative testnet

## Project Structure

```
chain-equity/
├── src/                        # Solidity contracts
│   └── GatedEquityToken.sol
├── script/                     # Deployment scripts
├── test/                       # Contract tests
├── backend/src/                # TypeScript backend
│   ├── cli/                   # Admin CLI
│   ├── lib/                   # Shared utilities
│   ├── scripts/               # Utility scripts
│   └── types/                 # Type definitions
├── app/                        # Next.js pages
├── components/                 # React components
├── convex/                     # Convex schema + queries
└── lib/                        # Frontend utilities
```

## Testing

Full testing guide: [`TESTING_GUIDE.md`](./TESTING_GUIDE.md)

Quick test:
```bash
# Compile and test contracts
forge test -vvv

# Test full workflow
# 1. Start anvil
# 2. Deploy contract
# 3. Use CLI or frontend to test operations
```

## CLI Usage

All commands support optional flags: `-r <rpc-url>`, `-c <contract-address>`, `-k <private-key>`

### Query Commands (Read-Only)
```bash
bun run cli info                    # Display contract information
bun run cli status [address]        # Check allowlist status and balance
bun run cli captable                # View current cap table
bun run cli captable -b 12345       # Historical cap table at block
bun run cli captable -f json        # Output format: table, json, csv
```

### Transaction Commands (Require Private Key)
```bash
bun run cli approve <address>           # Add to allowlist
bun run cli revoke <address>            # Remove from allowlist
bun run cli mint <address> <amount>     # Mint tokens
bun run cli buyback <address> <amount>  # Buy back shares (burns)
bun run cli split <multiplier>          # Stock split (e.g., 2 = 2-for-1)
bun run cli metadata <name> <symbol>    # Change token metadata
```

### Utility Scripts
```bash
bun backend/src/scripts/sync-contracts-to-convex.ts           # Sync contracts to Convex
bun backend/src/scripts/register-base-sepolia-contract.ts     # Register Base Sepolia contract
```

## Environment Variables

**Backend** (`.env`):
```bash
RPC_URL=http://127.0.0.1:8545           # Anvil local or https://sepolia.base.org
CHAIN_ID=31337                          # 31337=Anvil, 84532=Base Sepolia
CONTRACT_ADDRESS=                       # Optional: can be specified via -c flag
PRIVATE_KEY=your_private_key            # Required for transaction commands
LOG_LEVEL=info                          # Optional: info, debug, error
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_deployment_name
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
```

## License

MIT

## Disclaimer

This is a technical prototype for educational purposes. It is NOT regulatory-compliant and should NOT be used to manage real securities. No KYC/AML, no regulatory reporting, no legal compliance. Consult legal counsel before using blockchain technology for equity management.
