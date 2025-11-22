// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/YieldAutomator.sol";
import "../src/SimpleAquaApp.sol";

/**
 * @title Deploy Script for YieldAutomator and SimpleAquaApp
 * @notice Deploys both contracts to Base Sepolia and sets up initial strategy
 * @dev Run with: forge script script/Deploy.s.sol:DeployScript --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployScript is Script {
    // Base Sepolia addresses
    address constant AQUA_PROTOCOL = 0x499943E74FB0cE105688beeE8Ef2ABec5D936d31;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Chainlink Functions Router on Base Sepolia
    // Using zero address for now - can be updated later for Chainlink Functions
    address constant CHAINLINK_FUNCTIONS_ROUTER = 0x0000000000000000000000000000000000000000;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying contracts to Base Sepolia...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Deploy SimpleAquaApp (our test strategy)
        SimpleAquaApp simpleApp = new SimpleAquaApp();
        console.log("\n1. SimpleAquaApp deployed to:", address(simpleApp));
        
        // Deploy YieldAutomator
        YieldAutomator yieldAutomator = new YieldAutomator(
            CHAINLINK_FUNCTIONS_ROUTER,
            AQUA_PROTOCOL,
            USDC_BASE_SEPOLIA
        );
        
        console.log("\n2. YieldAutomator deployed to:", address(yieldAutomator));
        console.log("   Owner:", yieldAutomator.owner());
        console.log("   Aqua Protocol:", address(yieldAutomator.aquaProtocol()));
        console.log("   USDC Token:", yieldAutomator.usdcToken());
        
        // Add SimpleAquaApp as the first strategy with 8.5% APY
        console.log("\n3. Adding SimpleAquaApp as strategy 0...");
        yieldAutomator.addStrategy(address(simpleApp), 850); // 8.5% APY in basis points
        
        console.log("   Strategy 0 added with APY:", yieldAutomator.strategyAPY(0), "bps (8.5%)");
        console.log("   Total strategies:", yieldAutomator.getStrategyCount());
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("YieldAutomator:", address(yieldAutomator));
        console.log("SimpleAquaApp:", address(simpleApp));
        console.log("\nNext steps:");
        console.log("1. Update frontend with YieldAutomator address");
        console.log("2. Users can now call yieldAutomator.deposit(amount, 0)");
        console.log("3. Add more strategies with addStrategy() if needed");
        
        vm.stopBroadcast();
    }
}
