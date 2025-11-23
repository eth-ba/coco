// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import {FlashLoan} from "./FlashLoan.sol";

contract FlashLoanBorrower is IERC3156FlashBorrower {
    FlashLoan public immutable flashLoan;
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");
    
    event LoanReceived(address token, uint256 amount, uint256 fee);
    event LoanRepaid(address token, uint256 totalRepaid);
    
    constructor(FlashLoan _flashLoan) {
        flashLoan = _flashLoan;
    }
    
    function borrow(
        FlashLoan.Strategy calldata strategy,
        uint256 amount
    ) external {
        IERC20(strategy.token).approve(address(flashLoan), type(uint256).max);
        
        flashLoan.flashLoanWithStrategy(this, strategy, amount, "");
    }
    
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        initiator; // silence unused warning
        data; // silence unused warning
        
        require(msg.sender == address(flashLoan), "Only flash loan contract");
        
        emit LoanReceived(token, amount, fee);
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance >= amount, "Did not receive loan");
        
        uint256 totalRepayment = amount + fee;
        require(
            IERC20(token).balanceOf(address(this)) >= totalRepayment,
            "Insufficient balance to repay"
        );
        
        emit LoanRepaid(token, totalRepayment);
        
        return CALLBACK_SUCCESS;
    }
    
    function fundForFees(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
    
    function withdraw(address token, uint256 amount, address to) external {
        IERC20(token).transfer(to, amount);
    }
}
