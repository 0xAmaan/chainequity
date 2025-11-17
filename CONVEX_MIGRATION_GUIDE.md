# Convex Migration Guide for ChainEquity

## ✅ What's Been Completed

### Phase 1: Convex Backend Infrastructure (DONE)
- ✅ **Schema Definition** (`convex/schema.ts`)
  - 8 tables: contracts, indexerState, allowlist, transfers, balances, stockSplits, metadataChanges, buybacks
  - All indexes configured for efficient queries

- ✅ **Mutation Functions** (for indexer writes)
  - `convex/mutations/contracts.ts` - Create/update contracts
  - `convex/mutations/indexer.ts` - Update indexer state
  - `convex/mutations/allowlist.ts` - Add/remove from allowlist
  - `convex/mutations/transfers.ts` - Insert transfers, update balances
  - `convex/mutations/events.ts` - Stock splits, buybacks, metadata changes

- ✅ **Query Functions** (for frontend reads)
  - `convex/contracts.ts` - List and get contracts
  - `convex/captable.ts` - Get cap table (current + historical)
  - `convex/activity.ts` - Get recent activity feed
  - `convex/dashboard.ts` - Get dashboard stats

### Phase 2: Indexer Integration (PARTIAL)
- ✅ **Convex Client Wrapper** (`backend/src/lib/convex-client.ts`)
  - ConvexHttpClient setup
  - All mutation/query methods wrapped

- ✅ **Indexer Updates** (`backend/src/indexer/multi-contract-listener.ts`)
  - Added Convex imports and client
  - Added `getConvexContractId()` helper with caching
  - **Updated event handlers (dual-write mode):**
    - ✅ Transfer events → Convex
    - ✅ AddressAllowlisted → Convex
    - ✅ AddressRemovedFromAllowlist → Convex
    - ⚠️ Stock Split, Buyback, Metadata Change → NOT YET UPDATED (still PostgreSQL only)

- ✅ **Contract Sync Script** (`backend/src/scripts/sync-contracts-to-convex.ts`)
  - Syncs existing contracts from PostgreSQL to Convex
  - Run with: `bun run convex:sync`

### Phase 4: Development Workflow (DONE)
- ✅ **Concurrently Package** - Installed
- ✅ **Updated Scripts** (`package.json`)
  - `bun dev` - Runs both Next.js + Convex dev servers concurrently
  - `bun run convex:sync` - Sync contracts to Convex

---

## 🚧 What's Left To Do

### Phase 2: Complete Indexer Integration (30 min)

**Remaining event handlers to update in `multi-contract-listener.ts`:**

1. **Stock Split Handler** (`handleStockSplitEvent`)
   - Add Convex write after PostgreSQL write
   - Call `convexIndexer.insertStockSplit()`

2. **Buyback Handler** (`handleBuybackEvent`)
   - Add Convex write after PostgreSQL write
   - Call `convexIndexer.insertBuyback()`

3. **Metadata Change Handler** (`handleMetadataChangeEvent`)
   - Add Convex write after PostgreSQL write
   - Call `convexIndexer.insertMetadataChange()`

**Pattern to follow** (same as Transfer/Allowlist):
```typescript
// After PostgreSQL writes...

const convexContractId = await this.getConvexContractId(contractId, contractAddress);
if (convexContractId) {
  try {
    const client = this.contractManager.getClient();
    const block = await client.getBlock({ blockNumber });
    const blockTimestamp = Number(block.timestamp) * 1000;

    await convexIndexer.insertStockSplit({ // or insertBuyback, insertMetadataChange
      contractId: convexContractId,
      // ... event data
    });

    await convexIndexer.updateIndexerState(convexContractId, blockNumber.toString());
    logger.debug(`✅ Synced {EventType} to Convex at block ${blockNumber}`);
  } catch (convexError) {
    logger.error("Error syncing {EventType} to Convex:", convexError);
  }
}
```

### Phase 3: Frontend Integration (1-2 hours)

#### 3.1 Add ConvexProvider to Next.js Layout
**File**: `app/layout.tsx`

Add Convex provider:
```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }: { children: React.Node }) {
  return (
    <html lang="en">
      <body>
        <ConvexProvider client={convex}>
          {/* existing providers */}
          {children}
        </ConvexProvider>
      </body>
    </html>
  );
}
```

#### 3.2 Update Frontend Pages to Use useQuery

**Files to update:**

1. **Cap Table Page** (`app/contracts/[address]/captable/page.tsx`)
   ```tsx
   import { useQuery } from "convex/react";
   import { api } from "@/convex/_generated/api";

   // Replace:
   const [capTable, setCapTable] = useState([]);
   useEffect(() => {
     fetch(`/api/captable?address=${contractAddress}`).then(...)
   }, []);

   // With:
   const contract = useQuery(api.contracts.getByAddress, { contractAddress });
   const capTable = useQuery(api.captable.getCurrent, {
     contractId: contract?._id || undefined
   });
   ```

2. **Activity Page** (`app/contracts/[address]/activity/page.tsx`)
   ```tsx
   const events = useQuery(api.activity.getRecent, {
     contractId: contract?._id || undefined,
     limit: 100,
     eventType: eventType === "all" ? undefined : eventType,
   });
   // Remove auto-refresh logic - useQuery auto-updates!
   ```

3. **Dashboard Page** (`app/contracts/[address]/home/page.tsx`)
   ```tsx
   const stats = useQuery(api.dashboard.getStats, {
     contractId: contract?._id || undefined,
   });
   ```

4. **Recent Activity Preview** (`components/dashboard/recent-activity-preview.tsx`)
   - Already updated with contract context!
   - Just replace fetch with useQuery

---

## 🚀 Testing & Deployment Steps

### Step 1: Sync Existing Contracts to Convex
```bash
# Make sure your .env.local has NEXT_PUBLIC_CONVEX_URL set
bun run convex:sync
```

### Step 2: Start Development Servers
```bash
# This runs both Next.js + Convex dev concurrently
bun dev
```

### Step 3: Start Indexer (Dual-Write Mode)
```bash
# In a separate terminal
bun run indexer
```

**What should happen:**
- Indexer writes to BOTH PostgreSQL and Convex
- If Convex write fails, it logs error but continues with PostgreSQL
- You can monitor Convex writes in the logs: look for "✅ Synced {EventType} to Convex"

### Step 4: Test Real-Time Updates
1. Deploy a new contract via UI
2. Add address to allowlist
3. Transfer tokens
4. **Check Convex Dashboard**: https://dashboard.convex.dev
   - Navigate to your deployment
   - Check "Data" tab → see tables populated
   - Check "Logs" tab → see function calls

5. **Frontend should auto-update** (once Phase 3 is complete)
   - No page refresh needed
   - Changes appear within ~100ms

---

## 🐛 Troubleshooting

### Issue: "Contract not found in Convex yet"
**Solution**: Run `bun run convex:sync` to sync contracts from PostgreSQL

### Issue: Convex writes failing in indexer
**Check**:
- `.env.local` has `NEXT_PUBLIC_CONVEX_URL`
- Convex dev server is running (`npx convex dev`)
- Check Convex dashboard logs for errors

### Issue: Frontend shows stale data
**Check**:
- ConvexProvider is wrapping your app in `layout.tsx`
- Using `useQuery` instead of `fetch`
- Contract ID being passed correctly to queries

### Issue: Historical cap table is slow
**Solution**: This is expected for large transfer histories. Consider:
- Adding a loading indicator
- Caching results
- Pre-computing snapshots at regular intervals

---

## 📊 Architecture Comparison

### Before (PostgreSQL Only)
```
Contract Events → Indexer → PostgreSQL → API Routes → Frontend (polling)
```

### After (Convex + PostgreSQL Dual-Write)
```
Contract Events → Indexer → PostgreSQL (backup)
                        ╰→ Convex → Frontend (real-time via useQuery)
```

### Final (Convex Only - After Migration Complete)
```
Contract Events → Indexer → Convex → Frontend (real-time)
```

---

## 🎯 Migration Phases Summary

- **Phase 1**: ✅ Convex backend ready
- **Phase 2**: ⚠️ Indexer dual-write (3/6 event types done)
- **Phase 3**: ❌ Frontend integration (not started)
- **Phase 4**: ✅ Development workflow
- **Phase 5**: ❌ Testing (blocked by Phase 3)

**Estimated Time Remaining**: 2-3 hours
- 30 min: Complete indexer event handlers
- 1-2 hours: Frontend integration
- 30 min: Testing

---

## 💡 Benefits Once Complete

1. **Real-Time Updates** - No more polling, changes appear instantly
2. **Simpler Codebase** - Delete all `/app/api/` routes
3. **Better DX** - TypeScript-first queries, autocomplete
4. **Serverless** - No PostgreSQL server to manage
5. **Built-in Caching** - Convex handles this automatically
6. **Optimistic Updates** - UI feels instant

**Ready to continue?** Next step: Complete the remaining event handlers or jump to frontend integration!
