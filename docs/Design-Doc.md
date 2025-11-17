## Summary
ChainEquity is a blockchain-based equity management platform that demonstrates how traditional equity operations (issuance, transfers, buybacks, stock splits) can be implemented on-chain with access control.

**Key Components:**
- **Smart Contract**: ERC20 token with allowlist gating for transfer restrictions
- **Frontend**: Next.js 16 + React 19 UI for contract deployment and equity management
- **Event Indexer**: Frontend-based real-time event listeners storing to Convex
- **CLI Tool**: Backend command-line interface for admin operations
- **Database**: Convex real-time database for indexed blockchain data

**Tech Stack**: Solidity 0.8.20, Bun/TypeScript, Next.js 16, React 19, Viem, Convex, thirdweb, Foundry

## Architecture Overview
```
┌─────────────────────────────────────────────────────┐
│  Smart Contract (GatedEquityToken)                  │
│  - ERC20 with allowlist                            │
│  - Corporate actions (splits, buybacks, metadata)  │
│  - Events: Transfer, Allowlist, StockSplit, etc.   │
└──────────────────┬──────────────────────────────────┘
                   │ Events
                   ↓
┌─────────────────────────────────────────────────────┐
│  Frontend Event Listeners (Next.js)                 │
│  - Real-time blockchain event monitoring           │
│  - Stores events in Convex via mutations           │
└──────────────────┬──────────────────────────────────┘
                   │ Updates
                   ↓
┌─────────────────────────────────────────────────────┐
│  Convex Database                                    │
│  - Tables: contracts, transfers, balances, etc.    │
│  - Real-time subscriptions for UI                  │
└──────────────────┬──────────────────────────────────┘
                   │ Queries
                   ├──────────────────────────────────┐
                   ↓                                  ↓
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  Next.js Frontend            │  │  CLI Tool (Bun)              │
│  - Dashboard & cap table     │  │  - Write: mint, approve      │
│  - Admin operations          │  │  - Read: captable, status    │
│  - Real-time updates         │  │  - Direct RPC interaction    │
└──────────────────────────────┘  └──────────────────────────────┘
```


## Key Design Decisions

### 1. ERC20 with Custom Transfer Hook
Override `_update()` to enforce allowlist checking:
```solidity
function _update(address from, address to, uint256 value) internal override {
    if (from == address(0)) { // Minting bypasses allowlist
        super._update(from, to, value);
        return;
    }
    require(allowlist[from], "Sender not allowlisted");
    require(allowlist[to], "Recipient not allowlisted");
    super._update(from, to, value);
}
```

**Why**: Leverages battle-tested ERC20 standard with O(1) allowlist lookups. Owner can mint without allowlist check.

### 2. Convex for Event Indexing
Frontend-based event listeners store to Convex real-time database (migrated from PostgreSQL).

**Benefits**:
- Real-time subscriptions (no polling lag)
- Serverless scaling
- Sub-100ms query performance
- Automatic UI reactivity

**Trade-off**: Event indexing tied to frontend uptime

### 3. Single Owner (OpenZeppelin Ownable)
Prototype uses single admin. Production upgrade path: Gnosis Safe multi-sig (3-of-5 signers).

### 4. Bun Runtime
3x faster startup, native TypeScript, drop-in Node.js compatibility.

### 5. Next.js 16 + React 19 + thirdweb
Modern stack with App Router, real-time Convex hooks, wallet integration via thirdweb.

## Data Model

### Convex Schema (`convex/schema.ts`)
```typescript
// Core tables
contracts           // Deployed smart contracts (multi-contract support)
indexerState        // Per-contract sync state (lastProcessedBlock)
allowlist           // Address allowlist status
transfers           // ERC20 Transfer events
balances            // Current token balances (derived from transfers)
stockSplits         // StockSplit events
metadataChanges     // MetadataChanged events
buybacks            // SharesBoughtBack events
```

**Why string amounts instead of numbers?**
- JavaScript `Number` loses precision beyond 2^53
- ERC20 uses `uint256` (up to 2^256)
- Convex stores amounts as strings to preserve full precision
- CLI/frontend convert to BigInt for calculations


## Security

- **Access Control**: OpenZeppelin `Ownable` protects all admin functions
- **Overflow Protection**: Solidity 0.8.x built-in checks
- **Events**: All state changes emit events for auditability
- **Web3**: thirdweb for secure wallet connections (keys never in frontend)

### ⚠️ Prototype Disclaimer
Not production-ready. Missing: KYC/AML, SEC compliance, multi-sig, security audit.

## Testing

**Smart Contracts**: 47 Foundry tests with comprehensive coverage
```bash
forge test -vvv     # Run tests
forge coverage      # Coverage report
```

**Manual Testing**: See `TESTING_GUIDE.md`


## Deployment

```bash
bun install
npx convex dev           # First time only
cp .env.example .env     # Configure RPC, keys, etc.
anvil --port 8545        # Local blockchain
forge script script/DeployGatedEquity.s.sol --broadcast  # Deploy contract
bun run dev              # Start frontend + Convex
```

**Production**: Deploy to Base Sepolia/Base (95% lower gas vs. mainnet). Frontend on Vercel, Convex serverless.


## Future Enhancements

### High Priority
- Multi-sig governance (Gnosis Safe integration)
- Vesting schedules (4-year vesting, 1-year cliff for employees)
- REST API for programmatic cap table access
- Dividend distribution mechanism

### Medium Priority
- Transfer restrictions (lock-ups, ROFR, max holdings)
- Notification system (email/webhook on transfers)
- Historical cap table exports (CSV, PDF reports)

### Research
- Cross-chain bridge (LayerZero, Wormhole)
- ZK proofs for privacy (prove ownership % without revealing exact amount)
- On-chain KYC (Polygon ID, Civic)


## Gas Cost Analysis

| Operation | Gas Cost | USD (100 gwei, ETH=$3000) | Base L2 (95% cheaper) |
|-----------|----------|---------------------------|----------------------|
| Deploy contract | 1.2M | $360 | $18 |
| Mint tokens | 50k | $15 | $0.75 |
| Transfer | 65k | $19.50 | $0.98 |
| Add to allowlist | 45k | $13.50 | $0.68 |
| Stock split (10 holders) | 200k | $60 | $3 |

**Recommendation**: Deploy on L2 (Base/Optimism) for production to reduce costs by 95%.


## CLI Commands

**Write** (require private key): `approve`, `revoke`, `mint`, `buyback`, `split`, `metadata`
**Read**: `info`, `status`, `captable` (supports `-b <block>`, `-f json|csv`)

```bash
bun run cli mint <address> <amount>
bun run cli captable --format csv
```

Optional flags: `-r <rpc>`, `-c <contract>`, `-k <key>`


## Conclusion

ChainEquity demonstrates tokenized equity management with:
- ERC20 with allowlist-based transfer restrictions
- Real-time event indexing via Convex
- Next.js frontend + CLI for admin operations
- Comprehensive test coverage

**Next steps**: Security audit → Production deployment → Multi-sig → Vesting schedules

