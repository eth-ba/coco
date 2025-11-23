// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {FlashLoan} from "../src/FlashLoan.sol";
import {FlashLoanBorrower} from "../src/FlashLoanBorrower.sol";
import {IAqua} from "../src/interfaces/IAqua.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FlashLoanTest
 * @notice Test flash loans with REAL Aqua Protocol on forked mainnet
 * @dev Must be run with a forked network
 * 
 * Usage:
 * forge test --fork-url https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_KEY -vv
 * 
 * Or set FORK_URL in foundry.toml and run:
 * forge test -vv
 */
contract FlashLoanTest is Test {
    // Real Aqua Protocol (same address on all mainnets)
    address constant AQUA_ADDRESS = 0x499943E74FB0cE105688beeE8Ef2ABec5D936d31;
    
    // USDC address (auto-detected based on chain ID)
    address public USDC_ADDRESS;
    
    IAqua public aqua;
    IERC20 public usdc;
    FlashLoan public flashLoan;
    FlashLoanBorrower public borrower;
    
    address public lender;
    address public borrowerAddr;
    
    uint256 public constant INITIAL_LIQUIDITY = 10_000 * 1e6; // 10,000 USDC
    uint256 public constant LOAN_AMOUNT = 5_000 * 1e6; // 5,000 USDC
    
    function setUp() public {
        console.log("\n=== Setting up Flash Loan Test ===");
        
        // Auto-detect USDC based on chain ID
        if (block.chainid == 1) {
            USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // Ethereum mainnet
        } else if (block.chainid == 11155111) {
            USDC_ADDRESS = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // Ethereum Sepolia
        } else if (block.chainid == 8453) {
            USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Base mainnet
        } else if (block.chainid == 84532) {
            USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia
        } else if (block.chainid == 42161) {
            USDC_ADDRESS = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831; // Arbitrum
        } else if (block.chainid == 10) {
            USDC_ADDRESS = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85; // Optimism
        } else if (block.chainid == 137) {
            USDC_ADDRESS = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359; // Polygon
        } else {
            revert("Unsupported chain");
        }
        
        // Use REAL contracts
        aqua = IAqua(AQUA_ADDRESS);
        usdc = IERC20(USDC_ADDRESS);
        
        console.log("Using REAL Aqua at:", address(aqua));
        console.log("Using REAL USDC at:", address(usdc));
        console.log("Chain ID:", block.chainid);
        
        // Create test accounts
        lender = makeAddr("lender");
        borrowerAddr = makeAddr("borrower");
        
        console.log("Lender:", lender);
        console.log("Borrower:", borrowerAddr);
        
        // Deploy our contracts
        flashLoan = new FlashLoan(aqua);
        console.log("FlashLoan deployed:", address(flashLoan));
        
        borrower = new FlashLoanBorrower(flashLoan);
        console.log("FlashLoanBorrower deployed:", address(borrower));
        
        // Give lender USDC using forge's deal cheatcode
        deal(address(usdc), lender, INITIAL_LIQUIDITY * 10);
        console.log("Gave lender", (INITIAL_LIQUIDITY * 10) / 1e6, "USDC");
        
        // Give borrower USDC for fees
        deal(address(usdc), borrowerAddr, 100 * 1e6);
        deal(address(usdc), address(borrower), 100 * 1e6);
        console.log("Gave borrower 100 USDC for fees");
        
        // Setup lender's strategy with REAL Aqua
        vm.startPrank(lender);
        
        console.log("\n--- Approving USDC to Aqua ---");
        usdc.approve(address(aqua), type(uint256).max);
        console.log("USDC approved");
        
        FlashLoan.Strategy memory strategy = FlashLoan.Strategy({
            maker: lender,
            token: address(usdc),
            salt: bytes32(uint256(1))
        });
        
        address[] memory tokens = new address[](1);
        tokens[0] = address(usdc);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = INITIAL_LIQUIDITY;
        
        console.log("\n--- Shipping liquidity to Aqua ---");
        console.log("Lender USDC balance before ship:", usdc.balanceOf(lender) / 1e6, "USDC");
        
        // Ship to REAL Aqua Protocol!
        aqua.ship(
            address(flashLoan),
            abi.encode(strategy),
            tokens,
            amounts
        );
        
        console.log("Lender USDC balance after ship:", usdc.balanceOf(lender) / 1e6, "USDC");
        
        vm.stopPrank();
        
        console.log("Lender shipped", INITIAL_LIQUIDITY / 1e6, "USDC to REAL Aqua");
        console.log("\n=== Setup Complete ===\n");
    }
    
    function testFlashLoan() public {
        console.log("=== Testing Flash Loan with REAL Aqua ===");
        
        FlashLoan.Strategy memory strategy = FlashLoan.Strategy({
            maker: lender,
            token: address(usdc),
            salt: bytes32(uint256(1))
        });
        
        bytes32 strategyHash = keccak256(abi.encode(strategy));
        
        // Get initial balance
        (uint248 balanceBefore, ) = aqua.rawBalances(
            lender,
            address(flashLoan),
            strategyHash,
            address(usdc)
        );
        
        console.log("Initial lender balance:", uint256(balanceBefore) / 1e6, "USDC");
        
        // Fund borrower contract with USDC for fees
        vm.prank(borrowerAddr);
        usdc.transfer(address(borrower), 1 * 1e6);
        
        // Execute 10 flash loans
        for (uint256 i = 0; i < 10; i++) {
            console.log("\n--- Loan", i + 1);
            
            vm.prank(borrowerAddr);
            borrower.borrow(strategy, LOAN_AMOUNT);
            
            (uint248 balanceAfter, ) = aqua.rawBalances(
                lender,
                address(flashLoan),
                strategyHash,
                address(usdc)
            );
            
            uint256 profit = uint256(balanceAfter) - uint256(balanceBefore);
            console.log("Balance after loan:", uint256(balanceAfter) / 1e6, "USDC");
            console.log("Profit so far (microUSDC):", profit);
            
            balanceBefore = balanceAfter;
        }
        
        // Final results
        (uint248 finalBalance, ) = aqua.rawBalances(
            lender,
            address(flashLoan),
            strategyHash,
            address(usdc)
        );
        
        uint256 totalProfit = uint256(finalBalance) - INITIAL_LIQUIDITY;
        uint256 expectedFee = ((LOAN_AMOUNT * 10) / 100000) * 10; // 0.01% per loan * 10 loans
        
        console.log("\n=== Final Results ===");
        console.log("Initial liquidity (USDC):", uint256(INITIAL_LIQUIDITY / 1e6));
        console.log("Final balance (USDC):", uint256(finalBalance) / 1e6);
        console.log("Total profit (microUSDC):", totalProfit);
        console.log("Expected fees (microUSDC):", expectedFee);
        
        assertEq(totalProfit, expectedFee, "Profit should match expected fees");
        console.log("\n[PASS] All flash loans successful with REAL Aqua!");
    }
    
    function testInsufficientLiquidity() public {
        console.log("\n=== Testing Insufficient Liquidity with REAL Aqua ===");
        
        FlashLoan.Strategy memory strategy = FlashLoan.Strategy({
            maker: lender,
            token: address(usdc),
            salt: bytes32(uint256(1))
        });
        
        // Try to borrow more than available
        vm.prank(borrowerAddr);
        vm.expectRevert();
        borrower.borrow(strategy, INITIAL_LIQUIDITY + 1);
        
        console.log("[PASS] Correctly reverted on insufficient liquidity");
    }
    
    function testCalculateFee() public view {
        console.log("\n=== Testing Fee Calculation ===");
        
        uint256 fee = flashLoan.calculateFee(LOAN_AMOUNT);
        uint256 expectedFee = (LOAN_AMOUNT * 10) / 100000; // 0.01%
        
        console.log("Loan amount (USDC):", uint256(LOAN_AMOUNT / 1e6));
        console.log("Fee (microUSDC):", fee);
        console.log("Expected (microUSDC):", expectedFee);
        
        assertEq(fee, expectedFee, "Fee calculation should be correct");
        console.log("[PASS] Fee calculation correct");
    }
}


