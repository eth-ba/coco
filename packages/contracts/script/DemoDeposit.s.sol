// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {FlashLoan} from "../src/FlashLoan.sol";
import {DepositHelper} from "../src/DepositHelper.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DemoDeposit
 * @notice Demo script showing atomic deposit (approve + register + ship) in ONE transaction
 * 
 * Environment Variables:
 * - PRIVATE_KEY: Your wallet private key
 * - DEPOSIT_AMOUNT: Amount to deposit in token decimals (default: 1000e6 = 1000 USDC)
 * - TOKEN_ADDRESS: Token to deposit (default: Arc USDC)
 * - FEE_BPS: Your fee in basis points (default: 10 = 0.01%)
 * - MAKER_SALT: Optional unique identifier for your strategy
 * 
 * Usage:
 * forge script script/DemoDeposit.s.sol:DemoDeposit \
 *   --rpc-url arc_testnet \
 *   --broadcast -vvv
 */
contract DemoDeposit is Script {
    address constant DEPOSIT_HELPER = 0x0000000000000000000000000000000000000000; // TODO: Update after deployment
    address constant FLASH_LOAN = 0x6c86812F1a5aeb738951B6f8A0b3b3FB4C856f82;
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    
    uint256 constant BASIS_POINTS_DIVISOR = 100000;
    uint256 constant MAX_FEE_BPS = 1000; // 1%
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        uint256 depositAmount = vm.envOr("DEPOSIT_AMOUNT", uint256(1000e6));
        address tokenAddress = vm.envOr("TOKEN_ADDRESS", ARC_USDC);
        uint256 feeBps = vm.envOr("FEE_BPS", uint256(10)); // Default 0.01%
        bytes32 makerSalt = vm.envOr("MAKER_SALT", bytes32(uint256(block.timestamp)));
        
        require(feeBps <= MAX_FEE_BPS, "Fee too high (max 1%)");
        
        console.log("\n=== Atomic Deposit Demo ===");
        console.log("Depositor:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        
        console.log("\n--- Contract Addresses ---");
        console.log("DepositHelper:", DEPOSIT_HELPER);
        console.log("FlashLoan:", FLASH_LOAN);
        
        console.log("\n--- Deposit Parameters ---");
        console.log("Token:", tokenAddress);
        console.log("Amount:", depositAmount);
        console.log("Fee (basis points):", feeBps);
        console.log("Salt:", vm.toString(makerSalt));
        
        FlashLoan.Strategy memory strategy = FlashLoan.Strategy({
            maker: deployer,
            token: tokenAddress,
            salt: makerSalt,
            feeBps: feeBps
        });
        
        bytes32 strategyHash = keccak256(abi.encode(strategy));
        console.log("Strategy Hash:", vm.toString(strategyHash));
        
        vm.startBroadcast(deployerKey);
        
        IERC20 token = IERC20(tokenAddress);
        DepositHelper helper = DepositHelper(DEPOSIT_HELPER);
        
        console.log("\n--- Checking Balance ---");
        uint256 balance = token.balanceOf(deployer);
        console.log("Wallet balance:", balance);
        require(balance >= depositAmount, "Insufficient balance");
        
        console.log("\n--- Executing Atomic Deposit ---");
        console.log("This will:");
        console.log("1. Pull tokens from your wallet");
        console.log("2. Register strategy with FlashLoan");
        console.log("3. Approve Aqua to spend tokens");
        console.log("4. Ship tokens to Aqua");
        console.log("All in ONE transaction!");
        
        // Approve DepositHelper
        token.approve(DEPOSIT_HELPER, depositAmount);
        console.log("\nApproved DepositHelper for", depositAmount, "tokens");
        
        // Execute atomic deposit
        bytes32 resultHash = helper.depositToFlashLoan(strategy, depositAmount);
        
        console.log("\n=== Deposit Successful! ===");
        console.log("");
        console.log("Your liquidity is now available for flash loans!");
        console.log("- Deposited:", depositAmount, "tokens");
        console.log("- Your fee:", feeBps, "basis points");
        console.log("- Strategy hash:", vm.toString(resultHash));
        console.log("- You earn fees on every borrow!");
        console.log("");
        console.log("To withdraw later:");
        console.log("  aqua.dock(FLASH_LOAN, strategyHash, [token])");
        console.log("");
        
        vm.stopBroadcast();
    }
}

