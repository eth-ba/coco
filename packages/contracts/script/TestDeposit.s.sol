// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/YieldAutomator.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestDepositScript is Script {
    function run() external {
        address yieldAutomator = 0x67566E669137185f932f380283F8CA40bC1CEc8F;
        address usdc = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        uint256 amount = 1000000; // 1 USDC
        
        vm.startBroadcast();
        
        // Approve
        IERC20(usdc).approve(yieldAutomator, amount);
        console.log("Approved YieldAutomator to spend", amount, "USDC");
        
        // Try deposit
        try YieldAutomator(yieldAutomator).deposit(amount, 0) {
            console.log("Deposit successful!");
        } catch Error(string memory reason) {
            console.log("Deposit failed with reason:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("Deposit failed with low-level error");
            console.logBytes(lowLevelData);
        }
        
        vm.stopBroadcast();
    }
}

