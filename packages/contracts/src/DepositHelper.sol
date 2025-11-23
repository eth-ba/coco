// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAqua} from "./interfaces/IAqua.sol";
import {FlashLoan} from "./FlashLoan.sol";

/**
 * @title DepositHelper
 * @notice Helper contract to atomically register strategy, approve tokens, and ship to Aqua
 * @dev Enables one-transaction deposits for better UX
 */
contract DepositHelper {
    IAqua public immutable aqua;
    FlashLoan public immutable flashLoan;
    
    event StrategyDeposited(
        address indexed maker,
        address indexed token,
        bytes32 indexed strategyHash,
        uint256 amount
    );
    
    error TransferFailed();
    
    constructor(IAqua _aqua, FlashLoan _flashLoan) {
        aqua = _aqua;
        flashLoan = _flashLoan;
    }
    
    /**
     * @notice Deposit tokens to Aqua with a flash loan strategy in one transaction
     * @dev User must approve this contract for the deposit amount first
     * @param strategy The flash loan strategy to register and fund (includes feeBps)
     * @param amount The amount of tokens to deposit
     */
    function depositToFlashLoan(
        FlashLoan.Strategy calldata strategy,
        uint256 amount
    ) external returns (bytes32 strategyHash) {
        require(strategy.maker == msg.sender, "Maker must be sender");
        require(amount > 0, "Amount must be > 0");
        require(strategy.feeBps <= 1000, "Fee too high (max 1%)");
        
        // Step 1: Pull tokens from user
        bool transferred = IERC20(strategy.token).transferFrom(msg.sender, address(this), amount);
        if (!transferred) revert TransferFailed();
        
        // Step 2: Register strategy (idempotent - won't fail if already registered)
        flashLoan.registerStrategy(strategy);
        
        // Step 3: Approve Aqua to spend tokens
        IERC20(strategy.token).approve(address(aqua), amount);
        
        // Step 4: Ship tokens to Aqua
        address[] memory tokens = new address[](1);
        tokens[0] = strategy.token;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        bytes memory encodedStrategy = abi.encode(strategy);
        strategyHash = aqua.ship(address(flashLoan), encodedStrategy, tokens, amounts);
        
        emit StrategyDeposited(strategy.maker, strategy.token, strategyHash, amount);
        
        return strategyHash;
    }
    
    /**
     * @notice Batch deposit multiple amounts to the same strategy
     * @dev Useful for adding more liquidity to an existing strategy
     * @param strategy The flash loan strategy
     * @param amounts Array of amounts to deposit (must match length of strategy tokens)
     */
    function batchDeposit(
        FlashLoan.Strategy calldata strategy,
        uint256[] calldata amounts
    ) external returns (bytes32 strategyHash) {
        require(strategy.maker == msg.sender, "Maker must be sender");
        require(amounts.length == 1, "Single token strategy only");
        require(amounts[0] > 0, "Amount must be > 0");
        
        // Pull tokens
        bool transferred = IERC20(strategy.token).transferFrom(
            msg.sender, 
            address(this), 
            amounts[0]
        );
        if (!transferred) revert TransferFailed();
        
        // Register strategy
        flashLoan.registerStrategy(strategy);
        
        // Approve and ship
        IERC20(strategy.token).approve(address(aqua), amounts[0]);
        
        address[] memory tokens = new address[](1);
        tokens[0] = strategy.token;
        
        bytes memory encodedStrategy = abi.encode(strategy);
        strategyHash = aqua.ship(address(flashLoan), encodedStrategy, tokens, amounts);
        
        emit StrategyDeposited(strategy.maker, strategy.token, strategyHash, amounts[0]);
        
        return strategyHash;
    }
}

