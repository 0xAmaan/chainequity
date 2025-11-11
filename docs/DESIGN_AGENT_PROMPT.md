# Design Agent Prompt: ChainEquity Front-End

## Quick Summary

Design a web-based front-end for a blockchain cap table management system. Replace the CLI interface with a modern, user-friendly dashboard for managing tokenized equity.

---

## Core System

**ChainEquity** = ERC20 token system for tokenized company equity with:
- Allowlist-based compliance (only approved addresses can hold/transfer)
- Corporate actions (stock splits, buybacks, metadata changes)
- Complete historical tracking
- Real-time cap table visualization

---

## 9 CLI Commands to Replicate

### Read Operations (All Users)
1. **`info`** - Contract metadata (name, symbol, supply, owner)
2. **`status <address>`** - Check allowlist status + balance for any address
3. **`captable [--block N]`** - View cap table (current or historical), export CSV/JSON

### Write Operations (Admin Only)
4. **`approve <address>`** - Add address to allowlist
5. **`revoke <address>`** - Remove address from allowlist
6. **`mint <address> <amount>`** - Create new tokens
7. **`buyback <address> <amount>`** - Company buys back shares (burns tokens)
8. **`split <multiplier>`** - Execute stock split (multiply all balances)
9. **`metadata <name> <symbol>`** - Change token name/symbol

---

## Key Data to Display

### Cap Table
- Rank, Address, Balance, Ownership %, Allowlist Status
- Sortable, filterable, paginated
- Historical snapshots at any block number
- Visualizations (pie chart, bar chart)

### Address Status
- Allowlist status (✓/✗)
- Token balance (formatted + raw)
- Ownership percentage
- Warnings for compliance issues

### Activity Feed
- Recent transfers, allowlist changes, splits, buybacks, metadata changes
- Filterable by type, address, date range
- Links to block explorer

---

## User Roles

- **Admin/Owner**: Full access, can execute all write operations (requires wallet connection)
- **Viewer**: Read-only access, no wallet needed

---

## Design Requirements

### Must-Have Features
- ✅ Real-time cap table with sorting/filtering
- ✅ Historical cap table at any block number
- ✅ Transaction forms with validation and preview
- ✅ Wallet connection (MetaMask, WalletConnect)
- ✅ Transaction status indicators
- ✅ Export capabilities (CSV, JSON)
- ✅ Responsive design (desktop, tablet, mobile)

### Visual Style
- Professional, financial/corporate aesthetic
- Clear information hierarchy
- Color coding: Green (approved/success), Red (blocked/error), Yellow (warning)

### Key Screens
1. **Dashboard** - Overview, stats, recent activity
2. **Cap Table** - Main data table with visualizations
3. **Address Management** - Approve/revoke addresses
4. **Corporate Actions** - Split, buyback, metadata forms
5. **Historical View** - Time travel interface
6. **Activity Feed** - Transaction history

---

## Technical Context

- **Backend**: TypeScript/Bun, PostgreSQL database, event indexer
- **Blockchain**: Ethereum-compatible (ERC20 contract)
- **Data Source**: PostgreSQL (indexed blockchain events)
- **Integration**: Read from DB, write via blockchain transactions

---

## Success Criteria

Users should be able to:
- View complete cap table in < 2 seconds
- Execute transactions in < 30 seconds
- Access historical data at any block
- Export data in multiple formats
- Understand ownership at a glance

---

## Deliverables

1. Design mockups (all major screens)
2. User flow diagrams
3. Component library/style guide
4. Interactive prototype (optional)

---

**Full detailed brief**: See `FRONTEND_DESIGN_BRIEF.md` for complete specifications, database schema, and detailed requirements.

