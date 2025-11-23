// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FlashLoan, IFlashLoanReceiver} from "./FlashLoan.sol";

/**
 * @title FlashLoanBorrower
 * @notice Simple borrower contract for testing flash loans
 * @dev Automatically repays loans with fee
 */
contract FlashLoanBorrower is IFlashLoanReceiver {
    FlashLoan public immutable flashLoan;
    
    event LoanReceived(address token, uint256 amount, uint256 fee);
    event LoanRepaid(address token, uint256 totalRepaid);
    
    constructor(FlashLoan _flashLoan) {
        flashLoan = _flashLoan;
    }
    
    /**
     * @notice Initiate a flash loan
     * @param strategy The lending strategy
     * @param amount Amount to borrow
     */
    function borrow(
        FlashLoan.Strategy calldata strategy,
        uint256 amount
    ) external {
        IERC20(strategy.token).approve(address(flashLoan), type(uint256).max);
        
        flashLoan.flashLoan(strategy, amount, "");
    }
    
    /**
     * @notice Callback function called during flash loan
     * @param token Token being borrowed
     * @param amount Amount borrowed
     * @param fee Fee to be paid
     * @param data Arbitrary data (unused in this simple implementation)
     */
    function onFlashLoan(
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override {
        require(msg.sender == address(flashLoan), "Only flash loan contract");
        
        emit LoanReceived(token, amount, fee);
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance >= amount, "Did not receive loan");
        
        // The borrower must have enough tokens to repay the fee
        uint256 totalRepayment = amount + fee;
        require(
            IERC20(token).balanceOf(address(this)) >= totalRepayment,
            "Insufficient balance to repay"
        );
        
        emit LoanRepaid(token, totalRepayment);
    }
    
    /**
     * @notice Fund this contract with tokens (to pay fees)
     * @param token Token to receive
     * @param amount Amount to receive
     */
    function fundForFees(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @notice Withdraw tokens from this contract
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function withdraw(address token, uint256 amount, address to) external {
        IERC20(token).transfer(to, amount);
    }
}

