// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GatedEquityToken} from "../src/GatedEquityToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GatedEquityTokenTest is Test {
    GatedEquityToken public token;

    address public owner;
    address public alice;
    address public bob;
    address public carol;
    address public unauthorized;

    // Events from the contract for testing
    event AddressAllowlisted(address indexed account);
    event AddressRemovedFromAllowlist(address indexed account);
    event StockSplit(uint256 multiplier, uint256 newTotalSupply, uint256 timestamp);
    event MetadataChanged(
        string oldName,
        string newName,
        string oldSymbol,
        string newSymbol
    );
    event SharesBoughtBack(address indexed holder, uint256 amount, uint256 timestamp);

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");
        unauthorized = makeAddr("unauthorized");

        token = new GatedEquityToken("Test Equity", "TESTEQ");
    }

    // ============ Test Group 1: Deployment & Basic Setup ============

    function test_Deployment() public view {
        assertEq(token.name(), "Test Equity");
        assertEq(token.symbol(), "TESTEQ");
        assertEq(token.totalSupply(), 0);
        assertEq(token.owner(), owner);
    }

    function test_InitialAllowlistEmpty() public view {
        assertFalse(token.isAllowlisted(alice));
        assertFalse(token.isAllowlisted(bob));
        assertFalse(token.isAllowlisted(owner));
    }

    // ============ Test Group 2: Allowlist Management ============

    function test_AddToAllowlist() public {
        vm.expectEmit(true, false, false, false);
        emit AddressAllowlisted(alice);

        token.addToAllowlist(alice);

        assertTrue(token.isAllowlisted(alice));
    }

    function test_AddMultipleToAllowlist() public {
        token.addToAllowlist(alice);
        token.addToAllowlist(bob);
        token.addToAllowlist(carol);

        assertTrue(token.isAllowlisted(alice));
        assertTrue(token.isAllowlisted(bob));
        assertTrue(token.isAllowlisted(carol));
    }

    function test_RemoveFromAllowlist() public {
        token.addToAllowlist(alice);
        assertTrue(token.isAllowlisted(alice));

        vm.expectEmit(true, false, false, false);
        emit AddressRemovedFromAllowlist(alice);

        token.removeFromAllowlist(alice);

        assertFalse(token.isAllowlisted(alice));
    }

    function test_RevertWhen_AddZeroAddress() public {
        vm.expectRevert(GatedEquityToken.InvalidAddress.selector);
        token.addToAllowlist(address(0));
    }

    function test_RevertWhen_UnauthorizedAddsToAllowlist() public {
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                unauthorized
            )
        );
        token.addToAllowlist(alice);
    }

    function test_RevertWhen_UnauthorizedRemovesFromAllowlist() public {
        token.addToAllowlist(alice);

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                unauthorized
            )
        );
        token.removeFromAllowlist(alice);
    }

    // ============ Test Group 3: Minting ============

    function test_MintToAllowlistedAddress() public {
        token.addToAllowlist(alice);
        token.mint(alice, 1000);

        assertEq(token.balanceOf(alice), 1000);
        assertEq(token.totalSupply(), 1000);
    }

    function test_MintToNonAllowlistedAddress() public {
        // Minting should work even if address is not allowlisted
        // Only transfers are gated
        token.mint(bob, 500);

        assertEq(token.balanceOf(bob), 500);
        assertEq(token.totalSupply(), 500);
    }

    function test_RevertWhen_UnauthorizedMints() public {
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                unauthorized
            )
        );
        token.mint(alice, 1000);
    }

    // ============ Test Group 4: Gated Transfers (CORE FEATURE) ============

    // Transfer between two approved wallets → SUCCESS
    function test_TransferBetweenAllowlistedAddresses() public {
        // Setup: Add both to allowlist and mint to alice
        token.addToAllowlist(alice);
        token.addToAllowlist(bob);
        token.mint(alice, 1000);

        // Transfer from alice to bob
        vm.prank(alice);
        bool success = token.transfer(bob, 400);
        assertTrue(success);

        assertEq(token.balanceOf(alice), 600);
        assertEq(token.balanceOf(bob), 400);
    }

    // Transfer from approved to non-approved → FAIL
    function test_RevertWhen_TransferToNonAllowlisted() public {
        token.addToAllowlist(alice);
        token.mint(alice, 1000);

        // Bob is NOT on allowlist
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                GatedEquityToken.TransferNotAllowed.selector,
                alice,
                bob
            )
        );
        bool success = token.transfer(bob, 400);
        // This line won't execute due to revert, but silences warning
        assertFalse(success);
    }

    // Transfer from non-approved to approved → FAIL
    function test_RevertWhen_TransferFromNonAllowlisted() public {
        token.addToAllowlist(bob);
        token.mint(alice, 1000); // Alice has tokens but is NOT allowlisted

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                GatedEquityToken.TransferNotAllowed.selector,
                alice,
                bob
            )
        );
        bool success = token.transfer(bob, 400);
        // This line won't execute due to revert, but silences warning
        assertFalse(success);
    }

    // Revoke approval → Previously approved wallet can no longer receive
    function test_RevokeApproval_BlocksTransfers() public {
        // Setup: Both allowlisted, alice has tokens
        token.addToAllowlist(alice);
        token.addToAllowlist(bob);
        token.mint(alice, 1000);

        // First transfer works
        vm.prank(alice);
        bool success = token.transfer(bob, 200);
        assertTrue(success);
        assertEq(token.balanceOf(bob), 200);

        // Revoke bob's approval
        token.removeFromAllowlist(bob);

        // Now transfer should fail
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                GatedEquityToken.TransferNotAllowed.selector,
                alice,
                bob
            )
        );
        success = token.transfer(bob, 200);
        // This line won't execute due to revert, but silences warning
        assertFalse(success);
    }

    function test_TransferFrom_RequiresBothAllowlisted() public {
        token.addToAllowlist(alice);
        token.addToAllowlist(bob);
        token.mint(alice, 1000);

        // Alice approves bob to spend
        vm.prank(alice);
        token.approve(bob, 500);

        // Bob transfers from alice to himself
        vm.prank(bob);
        bool success = token.transferFrom(alice, bob, 300);
        assertTrue(success);

        assertEq(token.balanceOf(alice), 700);
        assertEq(token.balanceOf(bob), 300);
    }

    function test_SelfTransfer_WhenAllowlisted() public {
        token.addToAllowlist(alice);
        token.mint(alice, 1000);

        vm.prank(alice);
        bool success = token.transfer(alice, 100);
        assertTrue(success);

        assertEq(token.balanceOf(alice), 1000); // Balance unchanged
    }

    // ============ Test Group 5: Corporate Actions - Stock Split ============

    // Execute 7-for-1 split → All balances multiply by 7
    function test_ExecuteStockSplit() public {
        // Setup: Mint to 3 allowlisted addresses
        token.addToAllowlist(alice);
        token.addToAllowlist(bob);
        token.addToAllowlist(carol);

        token.mint(alice, 100);
        token.mint(bob, 200);
        token.mint(carol, 300);

        uint256 initialSupply = token.totalSupply();
        assertEq(initialSupply, 600);

        // Execute 7-for-1 split
        address[] memory holders = new address[](3);
        holders[0] = alice;
        holders[1] = bob;
        holders[2] = carol;

        vm.expectEmit(false, false, false, true);
        emit StockSplit(7, initialSupply * 7, block.timestamp);

        token.executeSplit(7, holders);

        // Verify balances multiplied by 7
        assertEq(token.balanceOf(alice), 700);
        assertEq(token.balanceOf(bob), 1400);
        assertEq(token.balanceOf(carol), 2100);
        assertEq(token.totalSupply(), 4200);
    }

    function test_StockSplit_MaintainsOwnershipPercentages() public {
        token.addToAllowlist(alice);
        token.addToAllowlist(bob);

        token.mint(alice, 50); // 50%
        token.mint(bob, 50); // 50%

        address[] memory holders = new address[](2);
        holders[0] = alice;
        holders[1] = bob;

        token.executeSplit(7, holders);

        // Ownership percentages should remain the same
        uint256 aliceBalance = token.balanceOf(alice);
        uint256 bobBalance = token.balanceOf(bob);
        uint256 total = token.totalSupply();

        assertEq((aliceBalance * 100) / total, 50);
        assertEq((bobBalance * 100) / total, 50);
    }

    function test_RevertWhen_SplitWithInvalidMultiplier() public {
        address[] memory holders = new address[](1);
        holders[0] = alice;

        vm.expectRevert(GatedEquityToken.InvalidMultiplier.selector);
        token.executeSplit(1, holders); // Multiplier must be > 1
    }

    function test_RevertWhen_SplitWithNoHolders() public {
        address[] memory holders = new address[](0);

        vm.expectRevert(GatedEquityToken.NoHolders.selector);
        token.executeSplit(7, holders);
    }

    function test_RevertWhen_UnauthorizedExecutesSplit() public {
        address[] memory holders = new address[](1);
        holders[0] = alice;

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                unauthorized
            )
        );
        token.executeSplit(7, holders);
    }

    // ============ Test Group 6: Corporate Actions - Symbol Change ============

    // Change symbol → Metadata updates, balances unchanged
    function test_ChangeMetadata() public {
        token.addToAllowlist(alice);
        token.mint(alice, 1000);

        vm.expectEmit(false, false, false, true);
        emit MetadataChanged("Test Equity", "New Equity", "TESTEQ", "NEWEQ");

        token.changeMetadata("New Equity", "NEWEQ");

        assertEq(token.name(), "New Equity");
        assertEq(token.symbol(), "NEWEQ");
        assertEq(token.balanceOf(alice), 1000); // Balance unchanged
        assertEq(token.totalSupply(), 1000);
    }

    function test_ChangeMetadata_MultipleChanges() public {
        token.changeMetadata("Name1", "SYM1");
        assertEq(token.name(), "Name1");
        assertEq(token.symbol(), "SYM1");

        token.changeMetadata("Name2", "SYM2");
        assertEq(token.name(), "Name2");
        assertEq(token.symbol(), "SYM2");
    }

    function test_RevertWhen_UnauthorizedChangesMetadata() public {
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                unauthorized
            )
        );
        token.changeMetadata("Hacked", "HACK");
    }

    function test_RevertWhen_ChangeMetadata_EmptyName() public {
        vm.expectRevert(GatedEquityToken.InvalidMetadata.selector);
        token.changeMetadata("", "SYMBOL");
    }

    function test_RevertWhen_ChangeMetadata_EmptySymbol() public {
        vm.expectRevert(GatedEquityToken.InvalidMetadata.selector);
        token.changeMetadata("Name", "");
    }

    function test_RevertWhen_ChangeMetadata_BothEmpty() public {
        vm.expectRevert(GatedEquityToken.InvalidMetadata.selector);
        token.changeMetadata("", "");
    }

    // ============ Test Group 7: Buyback (Share Repurchase) ============

    function test_Buyback() public {
        token.addToAllowlist(alice);
        token.mint(alice, 1000);

        vm.expectEmit(true, false, false, true);
        emit SharesBoughtBack(alice, 300, block.timestamp);

        token.buyback(alice, 300);

        assertEq(token.balanceOf(alice), 700);
        assertEq(token.totalSupply(), 700);
    }

    function test_Buyback_FromNonAllowlistedAddress() public {
        // Mint to non-allowlisted address (admin can mint to anyone)
        token.mint(bob, 500);

        // Admin can buy back from anyone (simulates off-chain payment settlement)
        token.buyback(bob, 200);

        assertEq(token.balanceOf(bob), 300);
        assertEq(token.totalSupply(), 300);
    }

    function test_Buyback_ReducesTotalSupply() public {
        token.addToAllowlist(alice);
        token.addToAllowlist(bob);
        token.mint(alice, 1000);
        token.mint(bob, 500);

        assertEq(token.totalSupply(), 1500);

        // Company buys back 400 from alice
        token.buyback(alice, 400);

        assertEq(token.totalSupply(), 1100);
        assertEq(token.balanceOf(alice), 600);
        assertEq(token.balanceOf(bob), 500);
    }

    function test_RevertWhen_UnauthorizedCallsBuyback() public {
        token.mint(alice, 1000);

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                unauthorized
            )
        );
        token.buyback(alice, 300);
    }

    // ============ Test Group 8: Integration Scenarios ============

    // Full workflow demonstration
    function test_FullWorkflow() public {
        // 1. Approve wallet
        token.addToAllowlist(alice);
        assertTrue(token.isAllowlisted(alice));

        // 2. Mint tokens
        token.mint(alice, 1000);
        assertEq(token.balanceOf(alice), 1000);

        // 3. Approve another wallet
        token.addToAllowlist(bob);

        // 4. Transfer between approved wallets → SUCCESS
        vm.prank(alice);
        bool success = token.transfer(bob, 400);
        assertTrue(success);
        assertEq(token.balanceOf(alice), 600);
        assertEq(token.balanceOf(bob), 400);

        // 5. Try transfer to non-approved wallet → BLOCKED
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                GatedEquityToken.TransferNotAllowed.selector,
                alice,
                carol
            )
        );
        success = token.transfer(carol, 100);
        // This line won't execute due to revert, but silences warning
        assertFalse(success);

        // 6. Approve new wallet
        token.addToAllowlist(carol);

        // 7. Transfer now succeeds
        vm.prank(alice);
        success = token.transfer(carol, 100);
        assertTrue(success);
        assertEq(token.balanceOf(carol), 100);

        // 8. Execute 7-for-1 split
        address[] memory holders = new address[](3);
        holders[0] = alice;
        holders[1] = bob;
        holders[2] = carol;

        token.executeSplit(7, holders);

        assertEq(token.balanceOf(alice), 3500); // 500 * 7
        assertEq(token.balanceOf(bob), 2800); // 400 * 7
        assertEq(token.balanceOf(carol), 700); // 100 * 7

        // 9. Change ticker symbol
        token.changeMetadata("Test Equity Rebranded", "TESTEQX");
        assertEq(token.symbol(), "TESTEQX");

        // Balances unchanged after symbol change
        assertEq(token.balanceOf(alice), 3500);
    }

    // ============ Test Group 9: Edge Cases ============

    function test_AllowlistSameAddressTwice() public {
        token.addToAllowlist(alice);
        token.addToAllowlist(alice); // Should not revert

        assertTrue(token.isAllowlisted(alice));
    }

    function test_RemoveNonAllowlistedAddress() public {
        assertFalse(token.isAllowlisted(bob));
        token.removeFromAllowlist(bob); // Should not revert

        assertFalse(token.isAllowlisted(bob));
    }

    function test_SplitWithZeroBalanceHolder() public {
        token.addToAllowlist(alice);
        token.mint(alice, 1000);

        address[] memory holders = new address[](2);
        holders[0] = alice;
        holders[1] = bob; // Bob has 0 balance

        token.executeSplit(7, holders);

        assertEq(token.balanceOf(alice), 7000);
        assertEq(token.balanceOf(bob), 0); // Still 0
    }

    // ============ Test Group 10: Fuzz Testing ============

    function testFuzz_MintAmount(uint256 amount) public {
        vm.assume(amount > 0 && amount < type(uint256).max / 2);

        token.mint(alice, amount);
        assertEq(token.balanceOf(alice), amount);
    }

    function testFuzz_TransferAmount(
        uint256 mintAmount,
        uint256 transferAmount
    ) public {
        vm.assume(mintAmount > 0 && mintAmount < type(uint256).max / 2);
        vm.assume(transferAmount > 0 && transferAmount <= mintAmount);

        token.addToAllowlist(alice);
        token.addToAllowlist(bob);
        token.mint(alice, mintAmount);

        vm.prank(alice);
        bool success = token.transfer(bob, transferAmount);
        assertTrue(success);

        assertEq(token.balanceOf(alice), mintAmount - transferAmount);
        assertEq(token.balanceOf(bob), transferAmount);
    }

    function testFuzz_SplitMultiplier(uint8 multiplier) public {
        vm.assume(multiplier > 1 && multiplier <= 20); // Limit to prevent overflow

        uint256 initialAmount = 1000;
        token.mint(alice, initialAmount);

        address[] memory holders = new address[](1);
        holders[0] = alice;

        token.executeSplit(multiplier, holders);

        assertEq(token.balanceOf(alice), initialAmount * multiplier);
    }
}
