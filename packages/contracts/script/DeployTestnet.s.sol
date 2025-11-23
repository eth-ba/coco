// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {FlashLoan} from "../src/FlashLoan.sol";
import {FlashLoanBorrower} from "../src/FlashLoanBorrower.sol";
import {IAqua} from "../src/interfaces/IAqua.sol";

/**
 * @title DeployTestnet
 * @notice Deploy to testnet/mainnet using REAL Aqua Protocol
 * @dev Uses deployed Aqua contract at 0x499943e74fb0ce105688beee8ef2abec5d936d31
 * 
 * Supported Networks (all use same address):
 * - Ethereum Mainnet (1)
 * - Base (8453) 
 * - Optimism (10)
 * - Arbitrum (42161)
 * - Polygon (137)
 * - Avalanche (43114)
 * - BSC (56)
 * - Gnosis (100)
 * - zkSync (324)
 * - Linea (59144)
 * - Sonic (146)
 * - Unichain (1301)
 * 
 * Usage:
 * forge script script/DeployTestnet.s.sol:DeployTestnet \
 *   --rpc-url $RPC_URL \
 *   --broadcast \
 *   --verify
 */
contract DeployTestnet is Script {
    address constant AQUA_ADDRESS = 0x499943e74fb0ce105688beee8ef2abec5d936d31;
    
    function run() external returns (
        FlashLoan flashLoan,
        FlashLoanBorrower borrower
    ) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("\n=== Deploying ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Using Real Aqua at:", AQUA_ADDRESS);
        
        vm.startBroadcast(deployerKey);
        
        console.log("\n--- Deploying FlashLoan Contract ---");
        flashLoan = new FlashLoan(IAqua(AQUA_ADDRESS));
        console.log("FlashLoan deployed at:", address(flashLoan));
        
        console.log("\n--- Deploying FlashLoanBorrower ---");
        borrower = new FlashLoanBorrower(flashLoan);
        console.log("FlashLoanBorrower deployed at:", address(borrower));
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Complete ===");
        console.log("Add to your .env:");
        console.log("AQUA_ADDRESS=%s", AQUA_ADDRESS);
        console.log("FLASH_LOAN_ADDRESS=%s", address(flashLoan));
        console.log("BORROWER_CONTRACT_ADDRESS=%s", address(borrower));
        
        console.log("\n=== Next Steps ===");
        console.log("1. Approve USDC (or other token) to Aqua:");
        console.log("   IERC20(token).approve(%s, type(uint256).max)", AQUA_ADDRESS);
        console.log("");
        console.log("2. Ship liquidity to flash loan app:");
        console.log("   aqua.ship(%s, strategy, [token], [amount])", address(flashLoan));
        console.log("");
        console.log("3. Borrowers can now call:");
        console.log("   flashLoan.flashLoan(strategy, amount, data)");
    }
}

