// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import {FlashLoan} from "./FlashLoan.sol";

/**
 * @title FlashLoanBorrower
 * @notice Demo contract for borrowing flash loans
 * @dev Pulls fees directly from initiator during callback - no pre-funding needed
 */
contract FlashLoanBorrower is IERC3156FlashBorrower {
    FlashLoan public immutable flashLoan;
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");
    
    event LoanReceived(address indexed initiator, address token, uint256 amount, uint256 fee);
    event LoanRepaid(address token, uint256 totalRepaid);
    
    error OnlyFlashLoan();
    error InsufficientLoanAmount();
    error InsufficientFeeBalance();
    error FeeTransferFailed();
    
    constructor(FlashLoan _flashLoan) {
        flashLoan = _flashLoan;
    }
    
    /**
     * @notice Initiate a flash loan
     * @dev Caller must have approved this contract for at least the fee amount
     * @param strategy The strategy to borrow from
     * @param amount The amount to borrow
     */
    function borrow(
        FlashLoan.Strategy calldata strategy,
        uint256 amount
    ) external {
        IERC20(strategy.token).approve(address(flashLoan), type(uint256).max);
        
        bytes memory data = abi.encode(msg.sender);
        
        flashLoan.flashLoanWithStrategy(this, strategy, amount, data);
    }
    
    /**
     * @notice Callback function called by flash loan contract
     * @dev Pulls fees from the initiator to complete repayment
     */
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        if (msg.sender != address(flashLoan)) revert OnlyFlashLoan();
        
        emit LoanReceived(initiator, token, amount, fee);
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientLoanAmount();
        
        address feeProvider = abi.decode(data, (address));
        
        uint256 initiatorBalance = IERC20(token).balanceOf(feeProvider);
        if (initiatorBalance < fee) revert InsufficientFeeBalance();
        
        bool feeTransferred = IERC20(token).transferFrom(feeProvider, address(this), fee);
        if (!feeTransferred) revert FeeTransferFailed();
        
        uint256 totalRepayment = amount + fee;
        require(
            IERC20(token).balanceOf(address(this)) >= totalRepayment,
            "Insufficient balance to repay"
        );
        
        emit LoanRepaid(token, totalRepayment);
        
        return CALLBACK_SUCCESS;
    }
    
    /**
     * @notice Withdraw tokens from this contract (for cleanup/recovery)
     */
    function withdraw(address token, uint256 amount, address to) external {
        IERC20(token).transfer(to, amount);
    }
}
