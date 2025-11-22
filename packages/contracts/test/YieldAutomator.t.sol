// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/YieldAutomator.sol";

contract YieldAutomatorTest is Test {
    YieldAutomator public automator;
    address public functionsRouter = address(0x1);
    address public aquaProtocol = address(0x2);
    address public usdcToken = address(0x3);
    address public user = address(0x4);
    address public aquaApp1 = address(0x5);
    address public aquaApp2 = address(0x6);

    function setUp() public {
        automator = new YieldAutomator(functionsRouter, aquaProtocol, usdcToken);
        
        // Add some test strategies
        automator.addStrategy(aquaApp1, 400); // 4% APY
        automator.addStrategy(aquaApp2, 500); // 5% APY
    }

    function testConstructor() public {
        assertEq(address(automator.aquaProtocol()), aquaProtocol);
        assertEq(automator.usdcToken(), usdcToken);
        assertEq(automator.owner(), address(this));
    }

    function testAddStrategy() public {
        address aquaApp3 = address(0x7);
        uint256 apy = 600; // 6% APY
        
        automator.addStrategy(aquaApp3, apy);
        
        assertEq(automator.getStrategyCount(), 3);
        assertEq(automator.strategyAPY(2), apy);
    }

    function testManualUpdateAPY() public {
        uint256 strategyIndex = 0;
        uint256 newAPY = 800; // 8%
        
        automator.manualUpdateAPY(strategyIndex, newAPY);
        
        assertEq(automator.strategyAPY(strategyIndex), newAPY);
    }

    function testCheckUpkeepNoUsers() public {
        address[] memory users = new address[](0);
        bytes memory checkData = abi.encode(users);
        
        (bool upkeepNeeded, bytes memory performData) = automator.checkUpkeep(checkData);
        
        assertFalse(upkeepNeeded);
        assertEq(performData.length, 0);
    }

    function testCheckUpkeepWithUser() public {
        // Simulate user with strategy (would need to mock Aqua contract for full test)
        // For now, just test that it doesn't revert
        address[] memory users = new address[](1);
        users[0] = user;
        bytes memory checkData = abi.encode(users);
        
        (bool upkeepNeeded, ) = automator.checkUpkeep(checkData);
        
        // Should be false since user has no active strategy
        assertFalse(upkeepNeeded);
    }

    function testOnlyOwnerCanAddStrategy() public {
        vm.prank(user);
        vm.expectRevert("Not owner");
        automator.addStrategy(address(0x7), 600);
    }

    function testOnlyOwnerCanManualUpdateAPY() public {
        vm.prank(user);
        vm.expectRevert("Not owner");
        automator.manualUpdateAPY(0, 800);
    }
}

