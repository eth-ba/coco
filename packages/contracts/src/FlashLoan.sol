// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAqua} from "./interfaces/IAqua.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FlashLoan
 * @notice Simple flash loan implementation using Aqua Protocol
 * @dev Charges 0.01% fee (10 basis points) on flash loans
 */
contract FlashLoan {
    IAqua public immutable AQUA;
    
    uint256 public constant FEE_BASIS_POINTS = 10;
    uint256 public constant BASIS_POINTS_DIVISOR = 100000;
    
    struct Strategy {
        address maker;      // Lender address
        address token;      // Token available for flash loans
        bytes32 salt;       // Unique identifier
    }
    
    mapping(bytes32 => bool) private _locked;
    
    event LoanExecuted(
        address indexed borrower,
        address indexed maker,
        address token,
        uint256 amount,
        uint256 fee,
        bytes32 strategyHash
    );
    
    error ReentrancyGuard();
    error InsufficientLiquidity();
    error FlashLoanNotRepaid();
    error InvalidStrategy();
    
    constructor(IAqua aqua) {
        AQUA = aqua;
    }
    
    modifier nonReentrant(bytes32 strategyHash) {
        if (_locked[strategyHash]) revert ReentrancyGuard();
        _locked[strategyHash] = true;
        _;
        _locked[strategyHash] = false;
    }
    
    /**
     * @notice Execute a flash loan
     * @param strategy The lending strategy
     * @param amount Amount to borrow
     * @param data Arbitrary data to pass to borrower callback
     */
    function flashLoan(
        Strategy calldata strategy,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant(keccak256(abi.encode(strategy))) {
        bytes32 strategyHash = keccak256(abi.encode(strategy));
        
        (uint248 balance,) = AQUA.rawBalances(
            strategy.maker,
            address(this),
            strategyHash,
            strategy.token
        );
        
        if (balance < amount) revert InsufficientLiquidity();
        
        uint256 fee = (amount * FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR;
        uint256 amountPlusFee = amount + fee;
        
        AQUA.pull(
            strategy.maker,
            strategyHash,
            strategy.token,
            amount,
            msg.sender
        );
        
        IFlashLoanReceiver(msg.sender).onFlashLoan(
            strategy.token,
            amount,
            fee,
            data
        );
        
        uint256 balanceBefore = IERC20(strategy.token).balanceOf(address(this));
        IERC20(strategy.token).transferFrom(msg.sender, address(this), amountPlusFee);
        uint256 balanceAfter = IERC20(strategy.token).balanceOf(address(this));
        
        if (balanceAfter - balanceBefore != amountPlusFee) {
            revert FlashLoanNotRepaid();
        }
        
        IERC20(strategy.token).approve(address(AQUA), amountPlusFee);
        
        AQUA.push(
            strategy.maker,
            address(this),
            strategyHash,
            strategy.token,
            amountPlusFee
        );
        
        emit LoanExecuted(
            msg.sender,
            strategy.maker,
            strategy.token,
            amount,
            fee,
            strategyHash
        );
    }
    
    /**
     * @notice Calculate fee for a given loan amount
     * @param amount Loan amount
     * @return fee Fee amount (0.01% of loan)
     */
    function calculateFee(uint256 amount) external pure returns (uint256 fee) {
        fee = (amount * FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR;
    }
}

/**
 * @title IFlashLoanReceiver
 * @notice Interface that borrowers must implement
 */
interface IFlashLoanReceiver {
    /**
     * @notice Called during flash loan execution
     * @param token Token being borrowed
     * @param amount Amount borrowed
     * @param fee Fee to be paid
     * @param data Arbitrary data passed from borrower
     */
    function onFlashLoan(
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external;
}

