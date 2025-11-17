# ChainEquity Backend

Off-chain infrastructure for the ChainEquity gated equity token system.

## Quick Start

### Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Convex account and project setup (`npx convex dev`)
- Anvil running (`anvil --port 8545`)

### Setup

```bash
# 1. Install dependencies (from project root)
bun install

# 2. Start Convex development server
npx convex dev

# 3. Deploy contract (from project root)
forge script script/DeployGatedEquity.s.sol:DeployGatedEquity \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 4. Update CONTRACT_ADDRESS in .env with deployed address

# 5. Start indexer (in separate terminal)
bun run indexer
```

### Usage

```bash
# View contract info
bun run cli info

# Approve an address
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Mint tokens
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000

# View cap table
bun run cli captable

# Get help
bun run cli --help
bun run cli <command> --help
```

### Demo

The indexer continuously syncs blockchain events to Convex in real-time. Use the CLI commands to interact with the contract and view the cap table.

## Architecture

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Anvil   │◄────────│ Indexer  │────────►│  Convex  │
│ (Chain)  │  Events │  Daemon  │  Write  │    DB    │
└──────────┘         └──────────┘         └──────────┘
     │                     │                     │
     │ Transactions        │ Sync                │ Query
     │                     ▼                     │
     │               ┌──────────┐               │
     └───────────────│   CLI    │◄──────────────┘
                     │   Tool   │
                     └──────────┘
```

## Components

### 1. Database (Convex)
- Cloud-hosted real-time database
- Tracks allowlist, transfers, balances, corporate actions
- Supports historical queries at any block

### 2. Event Indexer (`src/indexer/`)
- Real-time blockchain event listener
- Syncs historical events on startup
- Maintains cap table in database
- Graceful shutdown with SIGINT/SIGTERM

### 3. CLI Tool (`src/cli/`)
- Admin operations: approve, revoke, mint, split, metadata
- Cap table queries with multiple formats (table, JSON, CSV)
- Historical cap table snapshots
- Colored terminal output

### 4. Contract Interface (`src/lib/contract.ts`)
- viem-based wrapper for GatedEquityToken
- Type-safe contract interactions
- Event listening and querying

## CLI Commands

### `approve <address>`
Add address to allowlist
```bash
bun run cli approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

### `revoke <address>`
Remove address from allowlist
```bash
bun run cli revoke 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

### `mint <address> <amount>`
Mint tokens to an address
```bash
bun run cli mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
```

### `split <multiplier>`
Execute stock split
```bash
bun run cli split 7  # 7-for-1 split
```

### `metadata <name> <symbol>`
Change token name and symbol
```bash
bun run cli metadata "ChainEquity V2" "CEQ2"
```

### `captable [--block <n>] [--format <type>]`
Display cap table
```bash
bun run cli captable                    # Current
bun run cli captable --block 100        # Historical
bun run cli captable --format json      # JSON output
bun run cli captable --format csv       # CSV output
```

### `status [address]`
Check address status and balance
```bash
bun run cli status 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
bun run cli status  # Defaults to signer
```

### `info`
Display contract information
```bash
bun run cli info
```

## Configuration

Edit `.env` and `.env.local`:

```bash
# Blockchain
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
CONTRACT_ADDRESS=<your_deployed_address>

# Admin wallet
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Convex
CONVEX_DEPLOYMENT=<your_convex_deployment>
NEXT_PUBLIC_CONVEX_URL=<your_convex_url>

# Logging
LOG_LEVEL=info
```

## Logs

Logs are stored in `backend/logs/`:
- `error.log` - Error logs only
- `combined.log` - All logs
- `indexer.log` - Indexer output (if redirected)

## Database Schema (Convex)

Key tables:
- `allowlist` - Approved addresses
- `transfers` - All Transfer events
- `balances` - Current token balances
- `stock_splits` - Corporate actions
- `metadata_changes` - Name/symbol updates
- `indexer_state` - Sync progress

## Troubleshooting

### Convex connection failed
```bash
# Check Convex deployment status
npx convex dev

# Verify CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL in .env.local
```

### Contract address not set
```bash
# Update .env with deployed address
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Indexer not syncing
```bash
# Check logs
tail -f backend/logs/combined.log

# Restart indexer
pkill -f "bun.*indexer"
bun run indexer
```

### Anvil not running
```bash
# Start Anvil
anvil --port 8545
```

## Development

### Adding a new CLI command

1. Create `src/cli/commands/mycommand.ts`:
```typescript
export async function myCommand(options: any) {
  // Implementation
}
```

2. Register in `src/cli/index.ts`:
```typescript
import { myCommand } from './commands/mycommand';

program
  .command('mycommand')
  .description('Description')
  .action(myCommand);
```

### Adding a new event type

1. Add to `src/indexer/event-listener.ts`:
```typescript
private async handleMyEvent(log: any): Promise<void> {
  // Process event
  // Update database
}
```

2. Register in `start()` method:
```typescript
const unwatchMyEvent = this.contract.watchEvents(
  'MyEvent',
  async (logs) => {
    for (const log of logs) {
      await this.handleMyEvent(log);
    }
  }
);
```

## Testing

```bash
# Manual testing
npx convex dev              # Start Convex
bun run indexer &           # Start indexer
bun run cli approve 0x...   # Test command
bun run cli captable        # Verify
```

## Production Deployment

For production:
1. Use environment-specific RPC URLs
2. Secure private key management (KMS, Vault)
3. Add authentication to CLI
4. Convex automatically handles backups and scaling
5. Monitor indexer uptime
6. Add rate limiting
7. Implement reorg handling

---

**See CONVEX_MIGRATION_GUIDE.md for migration details**
