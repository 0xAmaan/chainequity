# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChainEquity is a tokenized cap table management platform that enables companies to manage equity on-chain using gated token transfers. The system consists of:
- **Smart Contracts** (Solidity/Foundry) - GatedEquityToken implementing ERC20 with allowlist-based transfer restrictions
- **Backend Indexer** (Bun/TypeScript) - Multi-contract event listener that indexes blockchain events to Convex
- **Frontend** (Next.js 16 + React 19) - Web UI for deploying contracts and managing equity
- **Database** (Convex) - Real-time database for storing indexed blockchain data

## Development Commands

### Package Management
**CRITICAL**: Always use `bun` (never npm/yarn/pnpm) for all Node.js operations.

### Frontend Development
```bash
# Start development server (Next.js + Convex concurrently)
bun run dev

# Start Next.js only
bun run dev:next

# Start Convex only
bun run dev:convex

# Build for production
bun run build

# Start production server
bun run start
```

### Backend Services
```bash
# Run CLI tool for contract management
bun run cli

# Available CLI commands (see CLI Command Reference section for details)
bun run cli info                              # Contract info
bun run cli status [address]                  # Check allowlist status
bun run cli approve <address>                 # Add to allowlist
bun run cli revoke <address>                  # Remove from allowlist
bun run cli mint <address> <amount>           # Mint tokens
bun run cli captable                          # View cap table
bun run cli split <multiplier>                # Execute stock split
bun run cli buyback <address> <amount>        # Buy back shares
bun run cli metadata <name> <symbol>          # Change token metadata

# Utility scripts (run directly with bun)
bun backend/src/scripts/sync-contracts-to-convex.ts           # Sync contracts to Convex
bun backend/src/scripts/register-base-sepolia-contract.ts     # Register Base Sepolia contract
```

### Smart Contract Development
```bash
# Compile contracts
forge build

# Run tests with verbosity
forge test -vvv

# Deploy to local Anvil
forge script script/DeployGatedEquity.s.sol:DeployGatedEquity \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy to Base Sepolia (requires .env configuration)
forge script script/DeployGatedEquity.s.sol:DeployGatedEquity \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY

# Start local blockchain
anvil --port 8545
```

## Architecture

### Smart Contract Layer (`src/`)
- **GatedEquityToken.sol** - Main contract implementing:
  - ERC20 with allowlist-based transfer restrictions
  - Corporate actions: stock splits, metadata changes, buybacks
  - Admin-only operations: minting, allowlist management
  - Transfer validation: both sender and recipient must be allowlisted

### Backend CLI (`backend/src/`)
The backend provides a CLI tool for interacting with deployed contracts directly via RPC.

#### Key Components:
- **cli/index.ts** - Main CLI entry point using Commander.js
- **cli/commands/transactions.ts** - Transaction commands (approve, revoke, mint, buyback, split, metadata)
- **cli/commands/queries.ts** - Query commands (info, status, captable)
- **lib/contract.ts** - Contract interaction utilities using viem
- **lib/config.ts** - Configuration loader (supports Anvil local + Base Sepolia)
- **lib/convex-client.ts** - Convex database client
- **scripts/** - Utility scripts for contract management

#### Contract Events (indexed to Convex via frontend):
- `Transfer` - ERC20 token transfers
- `AddressAllowlisted` - Address added to allowlist
- `AddressRemovedFromAllowlist` - Address removed from allowlist
- `StockSplit` - Stock split executed
- `MetadataChanged` - Token name/symbol updated
- `SharesBoughtBack` - Company buyback executed

### Frontend (`app/`, `components/`)
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **shadcn/ui** components
- **thirdweb** for Web3 wallet integration
- **Convex** for real-time data subscriptions

#### Key Pages:
- `/` - Dashboard with cap table, activity feed, and charts
- `/deploy` - Contract deployment wizard
- `/contracts` - Contract management (future)

#### Key Components:
- `components/admin/` - Admin operations (mint, allowlist, corporate actions)
- `components/captable/` - Cap table visualization
- `components/activity/` - Activity feed
- `components/dashboard/` - Dashboard widgets

### Database (Convex)
**IMPORTANT**: This project migrated from PostgreSQL to Convex. All database operations use Convex.

#### Schema (`convex/schema.ts`):
- `contracts` - Deployed smart contracts
- `indexerState` - Per-contract synchronization state
- `allowlist` - Allowlisted addresses
- `transfers` - ERC20 Transfer events
- `balances` - Current token balances (derived)
- `stockSplits` - Stock split events
- `metadataChanges` - Name/symbol change events
- `buybacks` - Share buyback events

#### Queries/Mutations:
- `convex/dashboard.ts` - Dashboard data queries
- `convex/captable.ts` - Cap table queries
- `convex/activity.ts` - Activity feed queries
- `convex/mutations/` - Data mutations for indexer

## Configuration

### Environment Variables

#### Backend (`.env`)
```bash
# Blockchain Configuration
RPC_URL=http://127.0.0.1:8545  # Anvil local OR https://sepolia.base.org
CHAIN_ID=31337  # 31337=Anvil, 84532=Base Sepolia

# Contract Configuration (for CLI operations)
CONTRACT_ADDRESS=  # Optional: Can be specified via -c flag

# Admin wallet for CLI operations
PRIVATE_KEY=  # Required for transaction commands

# Logging (optional)
LOG_LEVEL=info
```

#### Frontend (`.env.local`)
```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=your-convex-deployment-url
CONVEX_DEPLOYMENT=your-deployment-name

# thirdweb (for wallet connection)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-client-id
```

#### Foundry (`foundry.toml`)
Configured for:
- Anvil local development (chain ID 31337)
- Base Sepolia testnet (chain ID 84532)
- OpenZeppelin contracts remapping

## Development Workflow

### Initial Setup
1. Install dependencies: `bun install`
2. Set up Convex: `npx convex dev` (first time only)
3. Configure `.env` and `.env.local` files
4. Start Anvil: `anvil --port 8545`
5. Deploy contract: Use forge script (see commands above)
6. Start frontend: `bun run dev` (runs Next.js + Convex concurrently)
7. Use CLI for admin operations: `bun run cli <command>`

### Adding New Features

#### Adding Contract Events
1. Update `src/GatedEquityToken.sol` with new event
2. Update `convex/schema.ts` if new table needed
3. Update frontend event listening logic (typically in page components or hooks)
4. Update `convex/mutations/` with new mutation functions for storing event data
5. Recompile: `forge build`
6. Update ABI: `backend/src/lib/GatedEquityToken.abi.json` (if using CLI with new functions)

#### Adding Frontend Features
1. Create component in `components/`
2. Use Convex hooks: `useQuery`, `useMutation` from `convex/react`
3. Follow existing patterns in `components/admin/` for forms
4. Use shadcn/ui components from `components/ui/`
5. Style with Tailwind CSS

## Supported Chains

### Local Development (Anvil)
- Chain ID: 31337
- RPC: http://127.0.0.1:8545
- Default test accounts provided by Anvil

### Base Sepolia Testnet
- Chain ID: 84532
- RPC: https://sepolia.base.org
- Block Explorer: https://sepolia.basescan.org
- Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Arbitrum Sepolia (Configured but not primary)
- Chain ID: 421614
- RPC: https://sepolia-rollup.arbitrum.io/rpc

## Important Technical Details

### Transfer Restrictions
- **Minting**: Bypasses allowlist (admin can mint to any address)
- **Burning**: Bypasses allowlist (for buybacks)
- **Regular Transfers**: BOTH sender AND recipient must be allowlisted
- Validation happens in `_update()` override

### Stock Splits
- Requires passing array of ALL current token holders
- Multiplies all balances by split ratio
- Ownership percentages remain unchanged
- Emits `StockSplit` event with new total supply

### Event Indexing Architecture
- Events are indexed to Convex via frontend real-time listeners (not a separate indexer process)
- Each contract registered in Convex can be monitored independently
- Frontend components subscribe to Convex queries for real-time updates
- Historical data can be queried by block number for point-in-time cap tables

### Data Consistency
- Convex maintains per-contract `indexerState` with `lastProcessedBlock`
- Event data stored includes block numbers and timestamps for historical queries
- Balances derived from Transfer events stored in Convex
- CLI operations interact directly with blockchain via RPC (read contract state on-demand)

## Testing

See `TESTING_GUIDE.md` for comprehensive manual testing procedures.

### Quick Test Commands
```bash
# Run Foundry tests
forge test -vvv

# Test contract deployment locally
forge script script/DeployGatedEquity.s.sol:DeployGatedEquity \
  --rpc-url http://127.0.0.1:8545 --broadcast

# Test CLI operations (requires deployed contract)
bun run cli info
bun run cli approve <address>
bun run cli mint <address> <amount>
bun run cli captable
```

## Common Patterns

### Reading from Convex
```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const data = useQuery(api.dashboard.getCapTable, {
  contractId: "..."
});
```

### Writing to Convex (from Indexer)
```typescript
import { convexIndexer } from "../lib/convex-client";

await convexIndexer.saveTransfer({
  contractId: "...",
  fromAddress: "0x...",
  toAddress: "0x...",
  amount: "1000",
  blockNumber: "123",
  blockTimestamp: Date.now(),
  txHash: "0x...",
  logIndex: 0
});
```

### Contract Interaction (Viem)
```typescript
import { getContract } from "viem";

const contract = getContract({
  address: "0x..." as `0x${string}`,
  abi: GatedEquityTokenABI,
  client: publicClient,
});

const name = await contract.read.name();
```

## CLI Command Reference

All CLI commands support optional flags:
- `-r, --rpc <url>` - Override RPC URL (default from `.env`)
- `-c, --contract <address>` - Override contract address (default from `.env`)
- `-k, --private-key <key>` - Override private key for transactions (default from `.env`)

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

## Migration Notes

**PostgreSQL → Convex Migration (Completed)**
- All database queries migrated to Convex
- Event indexing happens in frontend (no separate indexer process)
- Frontend uses Convex real-time subscriptions
- CLI operations interact directly with blockchain via RPC
- Old PostgreSQL references removed from codebase

## Disclaimers

**CRITICAL**: This is a technical prototype for demonstration purposes only.
- NOT regulatory-compliant
- Should NOT be used for real securities without legal review
- No KYC/AML implementation
- No regulatory reporting
- Educational/demo purposes only
