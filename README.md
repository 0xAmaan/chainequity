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
- **Backend**: Bun + TypeScript (event indexer)
- **Frontend**: Next.js 16 + React 19 + Tailwind
- **Database**: Convex (real-time)
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
         ↓
┌─────────────────┐
│     Convex      │  Real-time database
│    Database     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Next.js UI    │  Dashboard, admin operations, cap table
└─────────────────┘
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
│   └── lib/                   # Shared utilities
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

```bash
bun run cli info                              # Contract info
bun run cli approve <address>                 # Add to allowlist
bun run cli mint <address> <amount>           # Mint tokens
bun run cli captable                          # View cap table
bun run cli split <multiplier>                # Execute stock split
bun run cli buyback <address> <amount>        # Buy back shares
bun run cli metadata <name> <symbol>          # Change token metadata
```

## Environment Variables

**Backend** (`.env`):
```bash
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
PRIVATE_KEY=your_private_key
INDEXER_POLL_INTERVAL=1000
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
```

## License

MIT

## Disclaimer

This is a technical prototype for educational purposes. It is NOT regulatory-compliant and should NOT be used to manage real securities. No KYC/AML, no regulatory reporting, no legal compliance. Consult legal counsel before using blockchain technology for equity management.
