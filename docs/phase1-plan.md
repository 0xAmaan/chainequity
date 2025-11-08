
  Phase 1: Smart Contract Foundation - Detailed Plan

  🎯 Clear Goals & Success Criteria

  What We're Building

  A gated ERC-20 token contract with:
  1. Standard ERC-20 functionality (transfer, balance, totalSupply)
  2. Allowlist system (only approved addresses can send/receive)
  3. Admin controls (add/remove from allowlist, mint tokens)
  4. Corporate actions (7-for-1 split, symbol change)
  5. Proper events for all state changes

  Success Criteria (From PDF)

  - ✅ Zero false-positive transfers (non-allowlisted can't transfer)
  - ✅ Zero false-negative blocks (allowlisted CAN transfer)
  - ✅ Admin-only controls work correctly
  - ✅ Gas costs within targets (<100k for transfers, <50k for approvals)
  - ✅ All test scenarios pass
  - ✅ 7-for-1 split works correctly
  - ✅ Symbol change works correctly

  ---
  🤔 Critical Design Decisions We Need to Make

  Decision 1: Base Contract Architecture

  Options:

  Option A: Pure Custom Implementation
  - Extend OpenZeppelin ERC20, override _beforeTokenTransfer
  - Pros: Full control, easier to understand
  - Cons: More code to maintain
  - Gas: Standard

  Option B: ERC1404 (Restricted Token Standard)
  - Use existing standard for transfer restrictions
  - Pros: Standardized interface, clear error codes
  - Cons: Less commonly used, more complexity
  - Gas: Slightly higher due to error codes

  Option C: Simple ERC20 + Modifier Pattern
  - Add onlyAllowlisted modifier to transfers
  - Pros: Simplest, most transparent
  - Cons: Non-standard approach
  - Gas: Most efficient

  My Recommendation: Option A (Custom with OpenZeppelin override)
  - Why: Balances standardization (ERC-20) with custom logic, clear pattern for security token use cases,
  well-understood by reviewers

  Decision 2: Stock Split Implementation

  Options from PDF:

  Option A: On-chain iteration (multiply all balances by 7)
  - Pros: Atomic operation, clean state
  - Cons: EXTREMELY gas-intensive with many holders (could fail)
  - Gas: ~50k per holder (10 holders = 500k gas)

  Option B: Deploy new contract, migrate balances
  - Pros: No gas limits, clean implementation
  - Cons: Requires coordination, two contracts exist temporarily
  - Gas: Two-step process (deploy + migrate)

  Option C: Virtual split (multiplier in view functions)
  - Pros: Near-zero gas, elegant
  - Cons: Breaks ERC-20 standard expectations, confusing
  - Gas: ~50k one-time

  My Recommendation: Option A for demo (document Option C as production alternative)
  - Why: For a demo with few test addresses, on-chain iteration shows you understand the mechanism. Document that
  production would use a multiplier or migration approach.

  Decision 3: Symbol Change Implementation

  Options from PDF:

  Option A: Mutable metadata (string storage variables)
  - Pros: Simple, gas-efficient
  - Cons: Non-standard (most ERC-20s have immutable symbols)
  - Gas: ~50k

  Option B: Deploy new contract with new symbol
  - Pros: Clean, standard approach
  - Cons: Overkill for just symbol change
  - Gas: High (new deployment)

  Option C: Proxy pattern
  - Pros: Most flexible
  - Cons: Adds complexity, upgradeable contracts have risks
  - Gas: Initial setup expensive

  My Recommendation: Option A (mutable string variables)
  - Why: Demo-friendly, shows you understand state mutability, document that this is non-standard but acceptable
  for private securities

  ---
  📋 Execution Plan with Checkpoints

  Checkpoint 1: Design & Architecture Document

  Before writing any code, let's create a design doc answering:

  1. Contract Architecture
    - What's the inheritance chain? (ERC20 -> GatedToken)
    - What state variables do we need?
    - What events do we emit?
    - What are the admin functions?
  2. Access Control Pattern
    - Simple onlyOwner modifier (Ownable)?
    - Role-based (AccessControl)?
    - Custom admin address?
  3. Data Structures
    - How do we store the allowlist? mapping(address => bool)?
    - Do we track allowlist history? (Probably not for MVP)

  Checkpoint Success: Clear architecture diagram, state variables defined, function signatures outlined

  ---
  Checkpoint 2: Core Token + Allowlist (Minimal Viable Contract)

  Goal: Get basic allowlist working

  What to build:
  // Pseudo-code structure
  contract GatedEquityToken is ERC20, Ownable {
      mapping(address => bool) public allowlist;

      function addToAllowlist(address) external onlyOwner
      function removeFromAllowlist(address) external onlyOwner
      function mint(address, uint256) external onlyOwner
      function _beforeTokenTransfer() internal override // check allowlist
  }

  Test scenarios:
  1. Deploy contract
  2. Add address A to allowlist
  3. Mint tokens to A → SUCCESS
  4. Try transfer A → B (B not allowlisted) → FAIL
  5. Add B to allowlist
  6. Transfer A → B → SUCCESS

  Checkpoint Success:
  - ✅ Minting works
  - ✅ Allowlist blocks unauthorized transfers
  - ✅ Allowlist allows authorized transfers
  - ✅ Gas report shows costs within targets

  ---
  Checkpoint 3: Corporate Actions - Stock Split

  Goal: Implement 7-for-1 split

  What to build:
  function executeSplit(uint256 multiplier) external onlyOwner {
      // Iterate through holders
      // Multiply each balance by 7
      // Update total supply
      // Emit StockSplit event
  }

  Design question: How do we track holders?
  - Option 1: Maintain array of holders (add on first mint, never remove)
  - Option 2: Pass array of holders as parameter (gas-efficient, requires off-chain tracking)

  My recommendation: Option 2 for demo (pass addresses array)

  Test scenarios:
  1. Mint 100 tokens each to 3 addresses
  2. Execute 7-for-1 split passing [addr1, addr2, addr3]
  3. Verify each now has 700 tokens
  4. Verify totalSupply is 2100
  5. Verify StockSplit event emitted

  Checkpoint Success:
  - ✅ Balances multiply correctly
  - ✅ Total supply updates
  - ✅ Ownership percentages unchanged
  - ✅ Gas costs documented (acceptable even if high)

  ---
  Checkpoint 4: Corporate Actions - Symbol Change

  Goal: Allow admin to change token symbol/name

  What to build:
  string private _name;
  string private _symbol;

  function changeSymbol(string memory newSymbol) external onlyOwner {
      string memory oldSymbol = _symbol;
      _symbol = newSymbol;
      emit SymbolChanged(oldSymbol, newSymbol);
  }

  function name() public view override returns (string memory) {
      return _name;
  }

  function symbol() public view override returns (string memory) {
      return _symbol;
  }

  Test scenarios:
  1. Deploy token with symbol "ACME"
  2. Verify symbol() returns "ACME"
  3. Change symbol to "ACMEX"
  4. Verify symbol() returns "ACMEX"
  5. Verify balances unchanged
  6. Verify SymbolChanged event emitted

  Checkpoint Success:
  - ✅ Symbol changes correctly
  - ✅ Balances preserved
  - ✅ Events emitted
  - ✅ Gas under 50k

  ---
  Checkpoint 5: Comprehensive Testing

  Goal: Cover all required test scenarios from PDF

  Test suite must include:
  1. ✅ Approve wallet → Mint tokens → Verify balance
  2. ✅ Transfer between two approved wallets → SUCCESS
  3. ✅ Transfer from approved to non-approved → FAIL
  4. ✅ Transfer from non-approved to approved → FAIL
  5. ✅ Revoke approval → Can no longer receive
  6. ✅ Execute 7-for-1 split → All balances multiply by 7
  7. ✅ Change symbol → Metadata updates, balances unchanged
  8. ✅ Unauthorized wallet attempts admin action → FAIL

  Additional edge cases:
  - Approve address(0) → should fail
  - Mint to non-approved address → should work (minting bypasses allowlist)
  - Split with no holders → should handle gracefully
  - Self-transfer (A→A) when approved → should work

  Checkpoint Success:
  - ✅ All 8 required scenarios pass
  - ✅ Edge cases covered
  - ✅ Gas report generated (forge snapshot)
  - ✅ Test coverage >90%

  ---
  Checkpoint 6: Documentation & Rationale

  Goal: Write the technical decisions document

  What to document:
  1. Chain Selection: Anvil local testnet → Arbitrum later
    - Why: Local development speed, Arbitrum for low fees
  2. Token Standard: ERC-20 with custom transfer hooks
    - Why: Standard interface, custom compliance layer
  3. Allowlist Design: Simple mapping, admin-controlled
    - Why: Sufficient for demo, production would add multi-sig
  4. Stock Split: On-chain iteration with address array parameter
    - Why: Demonstrates mechanism, document gas concerns for production
  5. Symbol Change: Mutable string storage
    - Why: Simple, effective, note non-standard nature
  6. Access Control: OpenZeppelin Ownable
    - Why: Simple, sufficient for demo, production would use multi-sig

  Checkpoint Success:
  - ✅ 1-2 page technical writeup complete
  - ✅ All design decisions justified
  - ✅ Limitations documented
  - ✅ Production considerations noted

  ---
  📚 Documentation & Research Needed

  Before Starting

  1. OpenZeppelin Contracts Documentation
    - ERC20 implementation details
    - Ownable/AccessControl patterns
    - Best practices for overriding _beforeTokenTransfer
  2. ERC-20 Standard
    - Required functions
    - Event requirements
    - Edge cases (approve, transferFrom)
  3. Security Token Research
    - ERC-1404 standard (for reference, even if not using)
    - How real security tokens handle compliance
    - Common patterns and anti-patterns
  4. Foundry Testing
    - Test structure best practices
    - Fuzzing for edge cases
    - Gas reporting (forge snapshot)
    - Coverage reports

  Questions to Research

  1. Should minting bypass allowlist checks? (My answer: YES - admin can mint to any address, transfers are gated)
  2. Should transfer and transferFrom both be gated? (YES)
  3. Should admin address itself be on allowlist? (OPTIONAL - doesn't hurt)
  4. What happens to allowlist after split? (UNCHANGED - same addresses)

  ---
  🎯 Proposed Approach

  Step 1: Let's Design Together (30 min)

  Before writing code, let's sketch out:
  - Complete contract interface (all functions)
  - State variables
  - Events
  - Access control approach

  Step 2: Build Incrementally (Checkpoints 1-6)

  - After each checkpoint, we TEST before moving on
  - No moving forward with broken code
  - Gas report at each stage

  Step 3: Document as We Go

  - Write down each decision and why
  - Note gas costs at each checkpoint
  - Track any issues or surprises

  ---
  ❓ Questions for You

  1. Testing approach: Should we write tests FIRST (TDD style) or alongside implementation?
  2. Admin controls: Simple Ownable (single owner) or more complex? For a demo, simple is probably fine.
  3. How many test addresses? For stock split demo, maybe 3-5 holders? Keeps gas reasonable.
  4. Symbol change scope: Just symbol, or name too? PDF says "symbol/ticker" so probably both?
  5. Events: Beyond Transfer, what events do we need?
    - AddressAllowlisted(address)
    - AddressRemovedFromAllowlist(address)
    - StockSplit(uint256 multiplier, uint256 newTotalSupply)
    - SymbolChanged(string oldSymbol, string newSymbol)

  ---
  What do you think?

  Does this level of planning make sense? Should we:
  1. Start by reviewing the design decisions together and finalizing the approach?
  2. Look up any OpenZeppelin documentation we need?
  3. Then proceed with Checkpoint 1 (minimal contract)?

  Also - any concerns about the approach or things you'd like to change?