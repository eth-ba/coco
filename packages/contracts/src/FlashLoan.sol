// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAqua} from "./interfaces/IAqua.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import {IERC3156FlashLender} from "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";

contract FlashLoan is IERC3156FlashLender {
    IAqua public immutable AQUA;
    
    uint256 public constant BASIS_POINTS_DIVISOR = 100000;
    uint256 public constant MAX_FEE_BPS = 1000; // Max 1% fee
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");
    
    struct Strategy {
        address maker;
        address token;
        bytes32 salt;
        uint256 feeBps; // Fee in basis points (e.g., 10 = 0.01%)
    }
    
    mapping(bytes32 => Strategy) public strategyData;
    mapping(address => bytes32[]) public tokenStrategies;
    mapping(bytes32 => bool) private _locked;
    
    event LoanExecuted(
        address indexed borrower,
        address indexed maker,
        address token,
        uint256 amount,
        uint256 fee,
        bytes32 strategyHash
    );
    
    event StrategyRegistered(
        address indexed maker,
        address indexed token,
        bytes32 strategyHash
    );
    
    error ReentrancyGuard();
    error InsufficientLiquidity();
    error FlashLoanNotRepaid();
    error UnsupportedToken();
    error CallbackFailed();
    error Unauthorized();
    error FeeTooHigh();
    
    constructor(IAqua aqua) {
        AQUA = aqua;
    }
    
    modifier nonReentrant(bytes32 strategyHash) {
        if (_locked[strategyHash]) revert ReentrancyGuard();
        _locked[strategyHash] = true;
        _;
        _locked[strategyHash] = false;
    }
    
    function registerStrategy(Strategy calldata strategy) external {
        if (strategy.maker != msg.sender) revert Unauthorized();
        if (strategy.feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        bytes32 strategyHash = keccak256(abi.encode(strategy));
        
        if (strategyData[strategyHash].maker == address(0)) {
            strategyData[strategyHash] = strategy;
            tokenStrategies[strategy.token].push(strategyHash);
            
            emit StrategyRegistered(strategy.maker, strategy.token, strategyHash);
        }
    }
    
    function maxFlashLoan(address token) external view override returns (uint256) {
        bytes32[] memory hashes = tokenStrategies[token];
        uint256 total = 0;
        
        for (uint256 i = 0; i < hashes.length; i++) {
            Strategy memory strategy = strategyData[hashes[i]];
            (uint248 balance,) = AQUA.rawBalances(
                strategy.maker,
                address(this),
                hashes[i],
                token
            );
            total += balance;
        }
        
        return total;
    }
    
    /**
     * @notice Get flash loan fee for ERC3156 interface
     * @dev Returns the minimum fee across all strategies for this token
     * For specific strategy fees, use getStrategyFee()
     */
    function flashFee(address token, uint256 amount) public view override returns (uint256) {
        bytes32[] memory hashes = tokenStrategies[token];
        if (hashes.length == 0) return 0;
        
        uint256 minFeeBps = type(uint256).max;
        for (uint256 i = 0; i < hashes.length; i++) {
            Strategy memory strategy = strategyData[hashes[i]];
            if (strategy.feeBps < minFeeBps) {
                minFeeBps = strategy.feeBps;
            }
        }
        
        return (amount * minFeeBps) / BASIS_POINTS_DIVISOR;
    }
    
    /**
     * @notice Calculate fee for a specific strategy
     */
    function getStrategyFee(Strategy memory strategy, uint256 amount) public pure returns (uint256) {
        return (amount * strategy.feeBps) / BASIS_POINTS_DIVISOR;
    }
    
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override returns (bool) {
        bytes32[] memory hashes = tokenStrategies[token];
        if (hashes.length == 0) revert UnsupportedToken();
        
        for (uint256 i = 0; i < hashes.length; i++) {
            Strategy memory strategy = strategyData[hashes[i]];
            (uint248 balance,) = AQUA.rawBalances(
                strategy.maker,
                address(this),
                hashes[i],
                token
            );
            
            if (balance >= amount) {
                return _executeLoan(
                    receiver,
                    strategy,
                    hashes[i],
                    amount,
                    data
                );
            }
        }
        
        revert InsufficientLiquidity();
    }
    
    function flashLoanWithStrategy(
        IERC3156FlashBorrower receiver,
        Strategy calldata strategy,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant(keccak256(abi.encode(strategy))) returns (bool) {
        bytes32 strategyHash = keccak256(abi.encode(strategy));
        
        (uint248 balance,) = AQUA.rawBalances(
            strategy.maker,
            address(this),
            strategyHash,
            strategy.token
        );
        
        if (balance < amount) revert InsufficientLiquidity();
        
        return _executeLoanInternal(receiver, strategy, strategyHash, amount, data);
    }
    
    function _executeLoan(
        IERC3156FlashBorrower receiver,
        Strategy memory strategy,
        bytes32 strategyHash,
        uint256 amount,
        bytes calldata data
    ) internal returns (bool) {
        if (_locked[strategyHash]) revert ReentrancyGuard();
        _locked[strategyHash] = true;
        
        bool result = _executeLoanInternal(receiver, strategy, strategyHash, amount, data);
        
        _locked[strategyHash] = false;
        return result;
    }
    
    function _executeLoanInternal(
        IERC3156FlashBorrower receiver,
        Strategy memory strategy,
        bytes32 strategyHash,
        uint256 amount,
        bytes calldata data
    ) internal returns (bool) {
        uint256 fee = getStrategyFee(strategy, amount);
        uint256 amountPlusFee = amount + fee;
        
        AQUA.pull(
            strategy.maker,
            strategyHash,
            strategy.token,
            amount,
            address(receiver)
        );
        
        bytes32 result = receiver.onFlashLoan(
            msg.sender,
            strategy.token,
            amount,
            fee,
            data
        );
        
        if (result != CALLBACK_SUCCESS) revert CallbackFailed();
        
        uint256 balanceBefore = IERC20(strategy.token).balanceOf(address(this));
        IERC20(strategy.token).transferFrom(
            address(receiver),
            address(this),
            amountPlusFee
        );
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
            address(receiver),
            strategy.maker,
            strategy.token,
            amount,
            fee,
            strategyHash
        );
        
        return true;
    }
    
    /**
     * @notice Calculate fee for a given fee basis points and amount
     */
    function calculateFee(uint256 feeBps, uint256 amount) external pure returns (uint256) {
        return (amount * feeBps) / BASIS_POINTS_DIVISOR;
    }
    
    /**
     * @notice Get the hash for a strategy
     */
    function getStrategyHash(Strategy calldata strategy) external pure returns (bytes32) {
        return keccak256(abi.encode(strategy));
    }
}
