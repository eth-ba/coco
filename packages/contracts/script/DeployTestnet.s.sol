// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {FlashLoan} from "../src/FlashLoan.sol";
import {FlashLoanBorrower} from "../src/FlashLoanBorrower.sol";
import {DepositHelper} from "../src/DepositHelper.sol";
import {IAqua} from "../src/interfaces/IAqua.sol";

/**
 * @title DeployTestnet
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
 * - Flare Mainnet (14)
 * - Flare Testnet Coston2 (114)
 * 
 * Arc Testnet (5042002) - Requires separate Aqua deployment
 * 
 * Usage:
 * forge script script/DeployTestnet.s.sol:DeployTestnet \
 *   --rpc-url flare_coston2 \
 *   --broadcast \
 *   --verify
 */
contract DeployTestnet is Script {
    address constant DEFAULT_AQUA = 0x499943E74FB0cE105688beeE8Ef2ABec5D936d31;
    address constant ARC_AQUA = 0x33Fb47472D03Ce0174830A6bD21e39F65d6d5425;
    
    function getAquaAddress() internal view returns (address) {
        if (block.chainid == 5042002) {
            return ARC_AQUA;
        }
        if (block.chainid == 14) {
            return 0x2FB8F337215c8547B53F20C0b47FC2C4f92433F3;
        }
        if (block.chainid == 114) {
            return DEFAULT_AQUA;
        }
        return DEFAULT_AQUA;
    }
    
    function run() external returns (
        FlashLoan flashLoan,
        FlashLoanBorrower borrower,
        DepositHelper depositHelper
    ) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address aquaAddress = getAquaAddress();
        
        console.log("\n=== Deploying ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Using Aqua at:", aquaAddress);
        
        vm.startBroadcast(deployerKey);
        
        console.log("\n--- Deploying FlashLoan Contract ---");
        flashLoan = new FlashLoan(IAqua(aquaAddress));
        console.log("FlashLoan deployed at:", address(flashLoan));
        
        console.log("\n--- Deploying FlashLoanBorrower ---");
        borrower = new FlashLoanBorrower(flashLoan);
        console.log("FlashLoanBorrower deployed at:", address(borrower));
        
        console.log("\n--- Deploying DepositHelper ---");
        depositHelper = new DepositHelper(IAqua(aquaAddress), flashLoan);
        console.log("DepositHelper deployed at:", address(depositHelper));
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Complete ===");
        console.log("Add to your .env:");
        console.log("AQUA_ADDRESS=%s", aquaAddress);
        console.log("FLASH_LOAN_ADDRESS=%s", address(flashLoan));
        console.log("BORROWER_CONTRACT_ADDRESS=%s", address(borrower));
        console.log("DEPOSIT_HELPER_ADDRESS=%s", address(depositHelper));
        
        console.log("\n=== Next Steps ===");
        console.log("Option A - Use DepositHelper (ONE TRANSACTION):");
        console.log("1. Approve USDC to DepositHelper:");
        console.log("   IERC20(token).approve(%s, amount)", address(depositHelper));
        console.log("2. Deposit atomically:");
        console.log("   depositHelper.depositToFlashLoan(strategy, amount)");
        console.log("");
        console.log("Option B - Manual (THREE TRANSACTIONS):");
        console.log("1. Register strategy:");
        console.log("   flashLoan.registerStrategy(strategy)");
        console.log("2. Approve USDC to Aqua:");
        console.log("   IERC20(token).approve(%s, amount)", aquaAddress);
        console.log("3. Ship liquidity:");
        console.log("   aqua.ship(%s, strategy, [token], [amount])", address(flashLoan));
        console.log("");
        console.log("To borrow (NO PRE-FUNDING NEEDED):");
        console.log("1. Approve borrower for fee:");
        console.log("   IERC20(token).approve(%s, fee)", address(borrower));
        console.log("2. Borrow:");
        console.log("   borrower.borrow(strategy, amount)");
    }
}
