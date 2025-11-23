// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {FlashLoan} from "../src/FlashLoan.sol";
import {FlashLoanBorrower} from "../src/FlashLoanBorrower.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DemoFlashLoan
 * 
 * Environment Variables:
 * - PRIVATE_KEY: Your wallet private key
 * - LOAN_AMOUNT: Amount to borrow in token decimals (default: 100e6 = 100 USDC)
 * - TOKEN_ADDRESS: Token to borrow (default: Arc USDC)
 * - MAKER_SALT: Strategy identifier (default: 0x0)
 * - FEE_BPS: Fee in basis points (default: 10 = 0.01%)
 * 
 */
contract DemoFlashLoan is Script {
    address constant FLASH_LOAN = 0x1854C0EB9d9b8CABF76B00a0420F43139F0Be51d;
    address constant BORROWER = 0x8062Dc6B0f837524c03A8d90bC8C5d6bBe880E9d;
    address constant AQUA = 0x6c86812F1a5aeb738951B6f8A0b3b3FB4C856f82;
    
    address constant FLARE_USDC = 0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6;
    uint256 constant BASIS_POINTS_DIVISOR = 100000; 
    
    function run(address makerAddress) external {
        require(makerAddress != address(0), "Maker address cannot be zero");
        
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        uint256 loanAmount = vm.envOr("LOAN_AMOUNT", uint256(1000000)); // 1 USDC (6 decimals)
        address tokenAddress = vm.envOr("TOKEN_ADDRESS", FLARE_USDC);
        bytes32 makerSalt = vm.envOr("MAKER_SALT", bytes32(0));
        uint256 feeBps = vm.envOr("FEE_BPS", uint256(10)); // Default 0.01%
        
        console.log("\n=== Flash Loan Demo ===");
        console.log("Executing from:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        
        console.log("\n--- Contract Addresses ---");
        console.log("FlashLoan:", FLASH_LOAN);
        console.log("Borrower:", BORROWER);
        console.log("Aqua:", AQUA);
        
        console.log("\n--- Loan Parameters ---");
        console.log("Token:", tokenAddress);
        console.log("Amount:", loanAmount);
        console.log("Maker:", makerAddress);
        console.log("Salt:", vm.toString(makerSalt));
        console.log("Fee BPS:", feeBps);
        
        uint256 fee = (loanAmount * feeBps) / BASIS_POINTS_DIVISOR;
        uint256 feePercent = (feeBps * 100) / 1000; // Convert to percentage with 2 decimals
        console.log("Fee (%s.%s%%):", feePercent / 100, feePercent % 100);
        console.log("Fee Amount:", fee);
        console.log("Total Repayment:", loanAmount + fee);
        
        FlashLoan.Strategy memory strategy = FlashLoan.Strategy({
            maker: makerAddress,
            token: tokenAddress,
            salt: makerSalt,
            feeBps: feeBps
        });
        
        bytes32 strategyHash = keccak256(abi.encode(strategy));
        console.log("\nStrategy Hash:", vm.toString(strategyHash));
        
        vm.startBroadcast(deployerKey);
        
        FlashLoanBorrower borrower = FlashLoanBorrower(BORROWER);
        FlashLoan flashLoan = FlashLoan(FLASH_LOAN);
        
        console.log("\n--- Checking Liquidity ---");
        uint256 maxLoan = flashLoan.maxFlashLoan(tokenAddress);
        console.log("Max available:", maxLoan);
        require(maxLoan >= loanAmount, "Insufficient liquidity in pool");
        
        console.log("\n--- Preparing Fee Payment ---");
        console.log("Fee will be pulled from:", deployer);
        console.log("Fee amount:", fee);
        
        IERC20 token = IERC20(tokenAddress);
        uint256 deployerBalance = token.balanceOf(deployer);
        console.log("Wallet balance:", deployerBalance);
        require(deployerBalance >= fee, "Insufficient balance to pay fee");
        
        token.approve(BORROWER, fee);
        console.log("Approved borrower to pull", fee, "tokens for fee");
        
        console.log("\n--- Executing Flash Loan ---");
        
        borrower.borrow(strategy, loanAmount);
        
        console.log("\n=== Flash Loan Executed Successfully! ===");
        console.log("");
        console.log("Transaction Summary:");
        console.log("- Borrowed:", loanAmount, "tokens from", makerAddress);
        console.log("- Fee paid:", fee);
        console.log("- Fee rate:", feeBps, "basis points");
        console.log("- Total repaid:", loanAmount + fee);
        console.log("- Borrower contract:", BORROWER);
        console.log("- Strategy hash:", vm.toString(strategyHash));
        console.log("- No pre-funding needed - fees pulled directly!");
        console.log("");
        
        vm.stopBroadcast();
    }
}

