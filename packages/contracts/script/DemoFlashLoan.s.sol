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
 * - LOAN_AMOUNT: Amount to borrow in token decimals
 * - TOKEN_ADDRESS: Token to borrow
 * - MAKER_SALT: Strategy identifier
 * 
 */
contract DemoFlashLoan is Script {
    address constant FLASH_LOAN = 0x6c86812F1a5aeb738951B6f8A0b3b3FB4C856f82;
    address constant BORROWER = 0x524902FA5e3535117E24e9D6826e5950bfbEF94E;
    address constant AQUA = 0x33Fb47472D03Ce0174830A6bD21e39F65d6d5425;
    
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000; 
    
    function run(address makerAddress) external {
        require(makerAddress != address(0), "Maker address cannot be zero");
        
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        uint256 loanAmount = vm.envOr("LOAN_AMOUNT", uint256(100e6));
        address tokenAddress = vm.envOr("TOKEN_ADDRESS", ARC_USDC);
        bytes32 makerSalt = vm.envOr("MAKER_SALT", bytes32(0));
        
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
        
        uint256 fee = (loanAmount * 10) / 100000;
        console.log("Fee (0.01%):", fee);
        console.log("Total Repayment:", loanAmount + fee);
        
        FlashLoan.Strategy memory strategy = FlashLoan.Strategy({
            maker: makerAddress,
            token: tokenAddress,
            salt: makerSalt
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
        
        console.log("\n--- Funding Fee Payment ---");
        console.log("Borrower will pay fee:", fee);
        
        IERC20 token = IERC20(tokenAddress);
        uint256 deployerBalance = token.balanceOf(deployer);
        console.log("Wallet balance:", deployerBalance);
        require(deployerBalance >= fee, "Insufficient balance to pay fee");
        
        token.approve(BORROWER, fee);
        borrower.fundForFees(tokenAddress, fee);
        console.log("Sent", fee, "tokens to borrower for fee");
        
        console.log("\n--- Executing Flash Loan ---");
        
        borrower.borrow(strategy, loanAmount);
        
        console.log("\n=== Flash Loan Executed Successfully! ===");
        console.log("");
        console.log("Transaction Summary:");
        console.log("- Borrowed:", loanAmount, "tokens from", makerAddress);
        console.log("- Fee paid:", fee, "(0.01%)");
        console.log("- Total repaid:", loanAmount + fee);
        console.log("- Borrower contract:", BORROWER);
        console.log("- Strategy hash:", vm.toString(strategyHash));
        console.log("");
        
        vm.stopBroadcast();
    }
}

