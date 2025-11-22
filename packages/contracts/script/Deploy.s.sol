// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/YieldAutomator.sol";

/**
 * @title DeployYieldAutomator
 * @notice Deployment script for YieldAutomator contract
 */
contract DeployYieldAutomator is Script {
    // Base Sepolia Chainlink Functions Router
    address constant FUNCTIONS_ROUTER = 0xf9B8fc078197181C841c296C876945aaa425B278;
    
    // Aqua Protocol address (placeholder - update with actual address)
    address constant AQUA_PROTOCOL = address(0); // TODO: Update with actual Aqua address

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        YieldAutomator automator = new YieldAutomator(
            FUNCTIONS_ROUTER,
            AQUA_PROTOCOL
        );

        console.log("YieldAutomator deployed at:", address(automator));
        console.log("Chainlink Functions Router:", FUNCTIONS_ROUTER);
        console.log("Aqua Protocol:", AQUA_PROTOCOL);

        vm.stopBroadcast();
    }
}

