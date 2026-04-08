// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Test-only mock of USDC with 6 decimals.
 * @dev mint() is restricted to the contract owner so that tests cannot
 *      accidentally exercise unrestricted minting paths that do not exist
 *      in production. Call mint() from the owner signer in test fixtures.
 *      DO NOT deploy this contract to any public network.
 */
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens. Only callable by the contract owner (deployer in tests).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
