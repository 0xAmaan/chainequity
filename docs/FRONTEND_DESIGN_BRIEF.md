# Front-End Design Brief: ChainEquity Cap Table Management System

## Executive Summary

Design a comprehensive web-based front-end application for managing a gated equity token system (ChainEquity). This application will replace the current CLI-based interface and provide a user-friendly dashboard for viewing and managing all aspects of the cap table, including token holders, transfers, corporate actions, and compliance controls.

---

## System Overview

### What is ChainEquity?

ChainEquity is a blockchain-based equity tokenization system that:
- Manages tokenized equity (company shares) as ERC20 tokens on Ethereum-compatible chains
- Enforces compliance through an allowlist system (only approved addresses can hold/transfer tokens)
- Supports corporate actions (stock splits, buybacks, metadata changes)
- Maintains a complete historical record of all transactions and events
- Provides real-time cap table visualization and historical snapshots

### Architecture

- **Smart Contract**: `GatedEquityToken.sol` - ERC20 token with transfer restrictions
- **Backend**: TypeScript/Bun application with:
  - Event indexer (syncs blockchain events to PostgreSQL)
  - CLI tool (current interface being replaced)
  - PostgreSQL database (stores all events, balances, allowlist status)
- **Frontend**: **TO BE DESIGNED** - Web application to replace CLI

---

## Core Functionality & CLI Commands

The front-end must replicate and enhance all CLI command functionality:

### 1. **Contract Information (`info`)**
**Purpose**: Display contract metadata and configuration

**Data to Display**:
- Contract address
- Token name and symbol
- Decimals (typically 18)
- Total supply (formatted and raw)
- Contract owner address
- Current connected wallet address
- Whether current wallet is the owner
- RPC URL and Chain ID

**UI Requirements**:
- Dashboard overview card/section
- Clear visual distinction between owner and non-owner users
- Copy-to-clipboard for addresses

---

### 2. **Address Status (`status [address]`)**
**Purpose**: Check allowlist status and token balance for any address

**Data to Display**:
- Address being checked
- Allowlist status (✓ Approved / ✗ Not Approved)
- Token balance (formatted with symbol)
- Raw balance (for technical users)
- Ownership percentage (balance / total supply)
- Total supply (for context)
- Warning if address holds tokens but is not allowlisted

**UI Requirements**:
- Search/input field for address
- Status badge (green for approved, red for blocked)
- Balance display with token symbol
- Ownership percentage with visual indicator (progress bar or pie chart segment)
- Warning alerts for compliance issues

---

### 3. **Cap Table (`captable [--block N] [--format json|csv|table]`)**
**Purpose**: Display complete capitalization table showing all token holders

**Data to Display**:
- Rank/position (#1, #2, etc.)
- Holder address
- Token balance (formatted)
- Ownership percentage
- Allowlist status (✓ Allowed / ✗ Blocked)
- Total holders count
- Total supply
- Block number (if historical view)

**UI Requirements**:
- **Table View** (default):
  - Sortable columns (by balance, ownership %, address)
  - Search/filter by address
  - Pagination for large cap tables
  - Visual indicators for allowlist status
  - Export buttons (CSV, JSON)
  
- **Historical View**:
  - Block number selector/input
  - Time travel interface (date picker or block slider)
  - Comparison view (side-by-side current vs historical)
  - Visual diff highlighting changes
  
- **Visualizations**:
  - Pie chart of ownership distribution
  - Bar chart of top holders
  - Timeline of ownership changes

---

### 4. **Approve Address (`approve <address>`)**
**Purpose**: Add an address to the allowlist (admin only)

**Inputs**:
- Address to approve (with validation)

**Process**:
- Check if already allowlisted (show warning if yes)
- Display transaction preview (contract, signer, gas estimate)
- Execute transaction
- Show confirmation (transaction hash, block number, gas used)
- Update UI immediately

**UI Requirements**:
- Form with address input and validation
- Address autocomplete/search (if applicable)
- Pre-transaction confirmation dialog
- Transaction status indicator (pending, confirmed, failed)
- Success/error notifications
- Auto-refresh allowlist status after transaction

---

### 5. **Revoke Address (`revoke <address>`)**
**Purpose**: Remove an address from the allowlist (admin only)

**Inputs**:
- Address to revoke (with validation)

**Process**:
- Check if currently allowlisted (show warning if not)
- Display transaction preview
- Execute transaction
- Show confirmation
- Update UI immediately

**UI Requirements**:
- Similar to approve, but with warning about consequences
- Show current balance of address being revoked
- Warning: "This address will no longer be able to transfer tokens"

---

### 6. **Mint Tokens (`mint <address> <amount>`)**
**Purpose**: Create new tokens and assign them to an address (admin only)

**Inputs**:
- Recipient address
- Amount (in human-readable format, e.g., "1000" not wei)

**Process**:
- Validate address and amount
- Show current balance of recipient
- Display transaction preview
- Execute transaction
- Show new balance after mint

**UI Requirements**:
- Form with address and amount inputs
- Amount input with token symbol display
- Current balance display
- Transaction preview showing:
  - Recipient
  - Amount being minted
  - New total supply (after mint)
- Success confirmation with updated balance

---

### 7. **Buyback Shares (`buyback <address> <amount>`)**
**Purpose**: Company buys back shares from a holder (burns tokens) (admin only)

**Inputs**:
- Holder address
- Amount to buy back

**Process**:
- Validate holder has sufficient balance
- Show current balance
- Display transaction preview
- Execute transaction (burns tokens)
- Show new balance and total supply
- Note: Off-chain payment must be completed separately

**UI Requirements**:
- Form similar to mint
- Balance validation (show error if insufficient)
- Warning about off-chain payment requirement
- Display total supply reduction
- Transaction confirmation

---

### 8. **Stock Split (`split <multiplier>`)**
**Purpose**: Execute a stock split (multiply all holder balances) (admin only)

**Inputs**:
- Multiplier (integer >= 2, e.g., 7 for 7-for-1 split)

**Process**:
- Fetch all current token holders from database
- Validate multiplier and that holders exist
- Show preview:
  - Current total supply
  - New total supply (current × multiplier)
  - Number of holders affected
- Execute transaction
- Show final supply

**UI Requirements**:
- Multiplier input with validation
- Pre-transaction preview showing:
  - Current vs new supply
  - Number of holders
  - Visual comparison (before/after)
- Confirmation dialog (this is irreversible)
- Success message with final supply
- Auto-refresh cap table after split

---

### 9. **Change Metadata (`metadata <name> <symbol>`)**
**Purpose**: Update token name and symbol (admin only)

**Inputs**:
- New token name
- New token symbol

**Process**:
- Show current name and symbol
- Validate new values (non-empty)
- Display transaction preview
- Execute transaction
- Show confirmed new values

**UI Requirements**:
- Form with name and symbol inputs
- Current values displayed
- Preview of changes
- Transaction confirmation
- Success message with updated values

---

## Database Schema & Data Structures

### Key Tables

1. **allowlist**
   - `address` (primary key)
   - `is_allowlisted` (boolean)
   - `added_at`, `added_at_block`
   - `removed_at`, `removed_at_block`
   - `tx_hash`

2. **balances**
   - `address` (primary key)
   - `balance` (string, stores uint256)
   - `last_updated_block`, `last_updated_at`

3. **transfers**
   - `from_address`, `to_address`
   - `amount` (string)
   - `block_number`, `block_timestamp`
   - `tx_hash`, `log_index`

4. **stock_splits**
   - `multiplier`
   - `new_total_supply`
   - `block_number`, `block_timestamp`
   - `tx_hash`
   - `affected_holders`

5. **metadata_changes**
   - `old_name`, `new_name`
   - `old_symbol`, `new_symbol`
   - `block_number`, `block_timestamp`
   - `tx_hash`

6. **buybacks**
   - `holder_address`
   - `amount`
   - `block_number`, `block_timestamp`
   - `tx_hash`, `log_index`

7. **indexer_state**
   - `last_processed_block`
   - `is_syncing`
   - `contract_address`

### Views

- **current_cap_table**: Real-time cap table with ownership percentages
- **recent_activity**: Last 100 events across all types

---

## User Roles & Permissions

### Admin/Owner
- Full access to all operations
- Can execute all write operations (approve, revoke, mint, buyback, split, metadata)
- Can view all data
- Must connect wallet that matches contract owner

### Viewer/Read-Only
- Can view all read-only data:
  - Contract info
  - Cap table (current and historical)
  - Address status
  - Transaction history
- Cannot execute any write operations
- No wallet connection required for read-only features

---

## Key User Flows

### Flow 1: View Cap Table
1. User lands on dashboard
2. Cap table is displayed by default (current state)
3. User can:
   - Sort/filter/search
   - View historical snapshot (select block number)
   - Export data (CSV/JSON)
   - View visualizations

### Flow 2: Approve New Holder
1. Admin navigates to "Allowlist Management"
2. Enters address to approve
3. System checks current status
4. Admin reviews transaction preview
5. Connects wallet (if not already)
6. Confirms transaction
7. Transaction executes
8. Success notification + auto-refresh

### Flow 3: Execute Stock Split
1. Admin navigates to "Corporate Actions"
2. Selects "Stock Split"
3. Enters multiplier (e.g., 7)
4. System fetches current holders and shows preview:
   - Current supply: X tokens
   - New supply: X × 7 tokens
   - Affected holders: N addresses
5. Admin reviews and confirms
6. Transaction executes
7. Cap table auto-refreshes showing new balances

### Flow 4: Historical Analysis
1. User navigates to "Historical View"
2. Selects block number or date
3. System displays cap table at that point in time
4. User can compare with current state (side-by-side)
5. User can see what changed between two blocks

### Flow 5: Transfer History
1. User navigates to "Activity" or "Transfers"
2. System displays recent transfers (from `transfers` table)
3. User can:
   - Filter by address (from/to)
   - Filter by date range
   - View transaction details (block, hash, timestamp)
   - Click to view on block explorer

---

## UI/UX Requirements

### Design Principles
- **Professional & Trustworthy**: Financial/corporate aesthetic
- **Clear Information Hierarchy**: Important data (balances, ownership) prominently displayed
- **Real-time Updates**: Auto-refresh when transactions complete
- **Responsive**: Works on desktop, tablet, mobile
- **Accessible**: WCAG 2.1 AA compliance

### Color Scheme Suggestions
- **Primary**: Professional blue (trust, finance)
- **Success**: Green (approved, successful transactions)
- **Warning**: Yellow/Orange (pending, needs attention)
- **Error**: Red (blocked, failed transactions)
- **Neutral**: Gray scale for secondary information

### Key Components Needed

1. **Dashboard**
   - Contract info card
   - Quick stats (total supply, holders, allowlisted addresses)
   - Recent activity feed
   - Quick actions (for admin)

2. **Cap Table View**
   - Data table with sorting/filtering
   - Pagination
   - Export buttons
   - Visualizations (charts)

3. **Address Management**
   - Search/input for addresses
   - Status badges
   - Balance display
   - Action buttons (approve/revoke for admin)

4. **Transaction Forms**
   - Input fields with validation
   - Transaction preview
   - Wallet connection status
   - Transaction status indicator
   - Success/error notifications

5. **Historical View**
   - Block number selector
   - Date picker (if available)
   - Comparison view
   - Timeline visualization

6. **Activity Feed**
   - List of recent events
   - Filter by event type
   - Link to block explorer
   - Event details modal

7. **Admin Panel**
   - All write operations
   - Transaction history
   - System status (indexer sync status)

---

## Technical Considerations

### API/Backend Integration
- The front-end will need to interact with:
  - **Blockchain**: Read contract state, execute transactions
  - **Database**: Query cap table, historical data, events
  - **Indexer**: Check sync status

### Recommended Tech Stack (Suggestions)
- **Frontend Framework**: React, Vue, or Next.js
- **Blockchain Integration**: viem, ethers.js, or wagmi
- **UI Components**: Material-UI, Ant Design, or Tailwind CSS
- **Charts**: Recharts, Chart.js, or D3.js
- **State Management**: React Query/SWR for data fetching, Zustand/Redux for global state

### Data Fetching Strategy
- **Real-time**: WebSocket or polling for new events
- **Historical**: REST API or direct database queries
- **Caching**: Cache cap table data, refresh on transactions

### Wallet Integration
- Support MetaMask, WalletConnect, Coinbase Wallet
- Show connection status
- Handle transaction signing
- Display pending transactions

### Performance Considerations
- Paginate large cap tables (100+ holders)
- Lazy load historical data
- Optimize chart rendering for large datasets
- Cache frequently accessed data

---

## Additional Features to Consider

### 1. **Notifications**
- Toast notifications for transaction status
- Email/alert for important events (large transfers, splits)

### 2. **Analytics**
- Ownership concentration metrics (Gini coefficient)
- Transfer volume over time
- Holder growth trends

### 3. **Export & Reporting**
- PDF reports of cap table
- Excel export with formatting
- Scheduled reports (email)

### 4. **Multi-chain Support**
- Support for different networks (mainnet, testnets)
- Network switcher in UI

### 5. **Audit Trail**
- Complete history of all admin actions
- User activity logs
- Transaction history with filters

---

## Success Metrics

The front-end should enable users to:
- ✅ View complete cap table in < 2 seconds
- ✅ Execute transactions in < 30 seconds (including wallet confirmation)
- ✅ Access historical data at any block number
- ✅ Export data in multiple formats
- ✅ Understand ownership distribution at a glance
- ✅ Track all corporate actions and compliance changes

---

## Deliverables Expected

1. **Design Mockups**
   - Desktop layouts for all major screens
   - Mobile responsive designs
   - Component library/style guide

2. **User Flow Diagrams**
   - Complete user journeys
   - Admin vs viewer flows

3. **Interactive Prototype** (optional but recommended)
   - Clickable prototype in Figma/Framer
   - Demonstrates key interactions

4. **Design System Documentation**
   - Color palette
   - Typography
   - Component specifications
   - Spacing/layout guidelines

---

## Questions for Design Agent

1. How should we handle wallet connection state? (persistent vs per-session)
2. What's the best way to visualize ownership concentration?
3. How should we display historical comparisons? (side-by-side, overlay, diff view)
4. What's the optimal table design for cap tables with 100+ rows?
5. How should admin actions be protected? (2FA, confirmation dialogs, etc.)
6. What's the best way to show transaction status? (progress indicators, notifications)

---

## Reference Materials

- **Current CLI**: See `backend/src/cli/` for command implementations
- **Database Schema**: See `backend/db/schema.sql`
- **Contract**: See `src/GatedEquityToken.sol`
- **Demo Commands**: See `DEMO_COMMANDS.md` for usage examples

---

## Next Steps

1. Review this brief with stakeholders
2. Design agent creates initial mockups
3. Review and iterate on designs
4. Develop front-end application
5. Integrate with backend/blockchain
6. Test and deploy

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Contact**: [Your Contact Information]

