// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/YieldAutomator.sol";

/**
 * @title Deploy Script for YieldAutomator
 * @notice Deploys YieldAutomator contract to Base Sepolia
 * @dev Run with: forge script script/Deploy.s.sol:DeployScript --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployScript is Script {
    // Base Sepolia addresses
    address constant AQUA_PROTOCOL = 0x499943E74FB0cE105688beeE8Ef2ABec5D936d31;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Chainlink Functions Router on Base Sepolia
    // TODO: Update with actual Base Sepolia Chainlink Functions router
    address constant CHAINLINK_FUNCTIONS_ROUTER = 0x0000000000000000000000000000000000000000;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy YieldAutomator
        YieldAutomator yieldAutomator = new YieldAutomator(
            CHAINLINK_FUNCTIONS_ROUTER,
            AQUA_PROTOCOL,
            USDC_BASE_SEPOLIA
        );
        
        console.log("YieldAutomator deployed to:", address(yieldAutomator));
        console.log("Owner:", yieldAutomator.owner());
        console.log("Aqua Protocol:", address(yieldAutomator.aquaProtocol()));
        console.log("USDC Token:", yieldAutomator.usdcToken());
        
        // TODO: Add initial strategies
        // Example strategy addresses would be added here
        // yieldAutomator.addStrategy(AAVE_AQUA_APP, 850); // 8.5% APY
        // yieldAutomator.addStrategy(COMPOUND_AQUA_APP, 720); // 7.2% APY
        
        vm.stopBroadcast();
    }
}
