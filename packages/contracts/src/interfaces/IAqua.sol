// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAqua
 * @notice Interface for Aqua Protocol contract
 * @dev Based on Aqua Protocol documentation
 */
interface IAqua {
    /**
     * @notice Ship new strategy with initial balances
     * @param app Address of the AquaApp contract
     * @param strategy Encoded strategy bytes
     * @param tokens Array of token addresses
     * @param amounts Array of token amounts
     * @return strategyHash The keccak256 hash of the strategy
     */
    function ship(
        address app,
        bytes calldata strategy,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external returns (bytes32 strategyHash);

    /**
     * @notice Deactivate strategy and withdraw all balances
     * @param app Address of the AquaApp contract
     * @param strategyHash Hash of the strategy to dock
     * @param tokens Array of token addresses to withdraw
     */
    function dock(
        address app,
        bytes32 strategyHash,
        address[] calldata tokens
    ) external;

    /**
     * @notice Query virtual balance for a specific token
     * @param maker Address of the liquidity provider
     * @param app Address of the AquaApp contract
     * @param strategyHash Hash of the strategy
     * @param token Address of the token
     * @return balance The virtual balance
     * @return tokensCount Number of tokens in the strategy
     */
    function rawBalances(
        address maker,
        address app,
        bytes32 strategyHash,
        address token
    ) external view returns (uint248 balance, uint8 tokensCount);

    /**
     * @notice Query multiple token balances with active strategy validation
     * @param maker Address of the liquidity provider
     * @param app Address of the AquaApp contract
     * @param strategyHash Hash of the strategy
     * @param token0 First token address
     * @param token1 Second token address
     * @return balance0 Balance of first token
     * @return balance1 Balance of second token
     */
    function safeBalances(
        address maker,
        address app,
        bytes32 strategyHash,
        address token0,
        address token1
    ) external view returns (uint256 balance0, uint256 balance1);

    /**
     * @notice Pull tokens from maker during swap
     * @param maker Address of the liquidity provider
     * @param strategyHash Hash of the strategy
     * @param token Token address
     * @param amount Amount to pull
     * @param to Recipient address
     */
    function pull(
        address maker,
        bytes32 strategyHash,
        address token,
        uint256 amount,
        address to
    ) external;

    /**
     * @notice Push tokens to maker's strategy balance
     * @param maker Address of the liquidity provider
     * @param app Address of the AquaApp contract
     * @param strategyHash Hash of the strategy
     * @param token Token address
     * @param amount Amount to push
     */
    function push(
        address maker,
        address app,
        bytes32 strategyHash,
        address token,
        uint256 amount
    ) external;
}

