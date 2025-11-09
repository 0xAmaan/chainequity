// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GatedEquityToken
 * @notice ERC20 token with transfer restrictions (allowlist) for tokenized equity
 * @dev Implements compliance gating, corporate actions (splits, symbol changes)
 *
 * DISCLAIMER: This is a technical prototype for demonstration purposes only.
 * NOT regulatory-compliant and should NOT be used for real securities without legal review.
 */
contract GatedEquityToken is ERC20, Ownable {
    // ============ State Variables ============

    /// @notice Allowlist mapping - only approved addresses can send/receive tokens
    mapping(address => bool) private _allowlist;

    /// @notice Mutable token name for corporate actions
    string private _tokenName;

    /// @notice Mutable token symbol for corporate actions
    string private _tokenSymbol;

    // ============ Events ============

    /// @notice Emitted when an address is added to the allowlist
    event AddressAllowlisted(address indexed account);

    /// @notice Emitted when an address is removed from the allowlist
    event AddressRemovedFromAllowlist(address indexed account);

    /// @notice Emitted when a stock split is executed
    event StockSplit(uint256 multiplier, uint256 newTotalSupply, uint256 timestamp);

    /// @notice Emitted when token metadata (name/symbol) is changed
    event MetadataChanged(
        string oldName,
        string newName,
        string oldSymbol,
        string newSymbol
    );

    /// @notice Emitted when company buys back shares from a holder
    event SharesBoughtBack(address indexed holder, uint256 amount, uint256 timestamp);

    // ============ Errors ============

    /// @notice Thrown when transfer involves non-allowlisted address
    error TransferNotAllowed(address from, address to);

    /// @notice Thrown when trying to add zero address to allowlist
    error InvalidAddress();

    /// @notice Thrown when stock split multiplier is invalid
    error InvalidMultiplier();

    /// @notice Thrown when holders array is empty
    error NoHolders();

    /// @notice Thrown when metadata (name/symbol) is invalid (empty string)
    error InvalidMetadata();

    // ============ Constructor ============

    /**
     * @notice Initializes the gated equity token
     * @param name_ Token name
     * @param symbol_ Token symbol
     */
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20("", "") Ownable(msg.sender) {
        _tokenName = name_;
        _tokenSymbol = symbol_;
    }

    // ============ Allowlist Management ============

    /**
     * @notice Adds an address to the allowlist (admin only)
     * @param account Address to approve for transfers
     */
    function addToAllowlist(address account) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        _allowlist[account] = true;
        emit AddressAllowlisted(account);
    }

    /**
     * @notice Removes an address from the allowlist (admin only)
     * @param account Address to remove from allowlist
     */
    function removeFromAllowlist(address account) external onlyOwner {
        _allowlist[account] = false;
        emit AddressRemovedFromAllowlist(account);
    }

    /**
     * @notice Checks if an address is allowlisted
     * @param account Address to check
     * @return bool True if address is approved for transfers
     */
    function isAllowlisted(address account) public view returns (bool) {
        return _allowlist[account];
    }

    // ============ Token Operations ============

    /**
     * @notice Mints new tokens to a specified address (admin only)
     * @dev Minting bypasses allowlist check - admin can mint to any address
     * @param to Recipient address
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Company buys back shares from a holder (admin only)
     * @dev Simulates stock buyback - assumes off-chain payment already completed
     *      In production, payment would occur via wire transfer, stablecoin, etc.
     *      This function only handles the cap table adjustment (burning tokens)
     * @param holder Address to buy back shares from
     * @param amount Number of shares to buy back and burn
     */
    function buyback(address holder, uint256 amount) external onlyOwner {
        _burn(holder, amount);
        emit SharesBoughtBack(holder, amount, block.timestamp);
    }

    // ============ Corporate Actions ============

    /**
     * @notice Executes a stock split by multiplying all holder balances
     * @dev Admin must provide array of all current token holders
     * @param multiplier The split ratio (e.g., 7 for a 7-for-1 split)
     * @param holders Array of all addresses that currently hold tokens
     */
    function executeSplit(
        uint256 multiplier,
        address[] calldata holders
    ) external onlyOwner {
        if (multiplier <= 1) revert InvalidMultiplier();
        if (holders.length == 0) revert NoHolders();

        // Iterate through all holders and multiply their balances
        for (uint256 i = 0; i < holders.length; i++) {
            address holder = holders[i];
            uint256 currentBalance = balanceOf(holder);

            if (currentBalance > 0) {
                // Calculate additional tokens to mint (multiplier - 1 because they already have 1x)
                uint256 additionalTokens = currentBalance * (multiplier - 1);
                _mint(holder, additionalTokens);
            }
        }

        emit StockSplit(multiplier, totalSupply(), block.timestamp);
    }

    /**
     * @notice Changes the token name and symbol (admin only)
     * @dev Allows corporate rebranding while preserving all balances
     * @param newName New token name (cannot be empty)
     * @param newSymbol New token symbol (cannot be empty)
     */
    function changeMetadata(
        string memory newName,
        string memory newSymbol
    ) external onlyOwner {
        // Validate that neither name nor symbol are empty strings
        if (bytes(newName).length == 0 || bytes(newSymbol).length == 0) {
            revert InvalidMetadata();
        }

        string memory oldName = _tokenName;
        string memory oldSymbol = _tokenSymbol;

        _tokenName = newName;
        _tokenSymbol = newSymbol;

        emit MetadataChanged(oldName, newName, oldSymbol, newSymbol);
    }

    // ============ ERC20 Overrides ============

    /**
     * @notice Returns the token name (overrides ERC20 to use mutable storage)
     */
    function name() public view override returns (string memory) {
        return _tokenName;
    }

    /**
     * @notice Returns the token symbol (overrides ERC20 to use mutable storage)
     */
    function symbol() public view override returns (string memory) {
        return _tokenSymbol;
    }

    /**
     * @notice Hook that validates transfers against allowlist
     * @dev Overrides ERC20._update to add compliance gating
     * @param from Sender address (address(0) for minting)
     * @param to Recipient address (address(0) for burning)
     * @param value Amount being transferred
     */
    function _update(address from, address to, uint256 value) internal override {
        // Allow minting (from == address(0)) and burning (to == address(0))
        // For regular transfers, both sender and recipient must be allowlisted
        if (from != address(0) && to != address(0)) {
            if (!_allowlist[from] || !_allowlist[to]) {
                revert TransferNotAllowed(from, to);
            }
        }

        // Call parent implementation to perform the actual transfer
        super._update(from, to, value);
    }
}
