// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleAquaApp
 * @notice A minimal AquaApp implementation for testing/demo purposes
 * @dev This is a simple "vault" strategy that just holds tokens
 */
contract SimpleAquaApp {
    /// @notice Name of this strategy
    string public constant name = "Simple USDC Vault";
    
    /// @notice Version
    string public constant version = "1.0.0";
    
    /// @notice Strategy struct for this app
    struct Strategy {
        address maker;      // User who created the strategy
        address token0;     // Primary token (USDC)
        address token1;     // Secondary token (can be same as token0)
        uint256 feeBps;     // Fee in basis points (0 for simple vault)
        bytes32 salt;       // Unique salt per user
    }
    
    /**
     * @notice Constructor
     */
    constructor() {}
    
    /**
     * @notice Get strategy hash
     * @param strategy The strategy struct
     * @return The keccak256 hash of the strategy
     */
    function getStrategyHash(Strategy calldata strategy) external pure returns (bytes32) {
        return keccak256(abi.encode(strategy));
    }
    
    /**
     * @notice Validate strategy parameters
     * @param strategy The strategy to validate
     * @return isValid Whether the strategy is valid
     */
    function validateStrategy(Strategy calldata strategy) external pure returns (bool isValid) {
        // Simple validation: maker must not be zero address
        return strategy.maker != address(0) && strategy.token0 != address(0);
    }
}

