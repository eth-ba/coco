// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/YieldAutomator.sol";

contract YieldAutomatorTest is Test {
    YieldAutomator public automator;
    address public functionsRouter = address(0x1);
    address public aquaProtocol = address(0x2);
    address public user = address(0x3);

    function setUp() public {
        automator = new YieldAutomator(functionsRouter, aquaProtocol);
    }

    function testConstructor() public {
        assertEq(automator.aquaProtocol(), aquaProtocol);
    }

    function testSetUserStrategy() public {
        uint256 strategyId = 1;
        automator.setUserStrategy(user, strategyId);
        
        assertEq(automator.userCurrentStrategy(user), strategyId);
        assertEq(automator.lastRebalance(user), block.timestamp);
    }

    function testUpdateStrategyAPY() public {
        uint256 strategyId = 1;
        uint256 newAPY = 500; // 5%
        
        automator.updateStrategyAPY(strategyId, newAPY);
        
        assertEq(automator.strategyAPY(strategyId), newAPY);
    }

    function testCheckUpkeep() public {
        (bool upkeepNeeded, bytes memory performData) = automator.checkUpkeep("");
        
        assertFalse(upkeepNeeded);
        assertEq(performData.length, 0);
    }

    function testPerformUpkeepRevertsWhenTooSoon() public {
        uint256 oldStrategy = 1;
        uint256 newStrategy = 2;
        
        // Set initial strategy
        automator.setUserStrategy(user, oldStrategy);
        automator.updateStrategyAPY(oldStrategy, 400); // 4%
        automator.updateStrategyAPY(newStrategy, 500); // 5%
        
        // Try to rebalance immediately
        bytes memory performData = abi.encode(user, newStrategy);
        
        vm.expectRevert("Rebalance too soon");
        automator.performUpkeep(performData);
    }

    function testPerformUpkeepSuccess() public {
        uint256 oldStrategy = 1;
        uint256 newStrategy = 2;
        
        // Set initial strategy
        automator.setUserStrategy(user, oldStrategy);
        automator.updateStrategyAPY(oldStrategy, 400); // 4%
        automator.updateStrategyAPY(newStrategy, 500); // 5%
        
        // Fast forward time
        vm.warp(block.timestamp + 1 hours + 1);
        
        // Perform rebalance
        bytes memory performData = abi.encode(user, newStrategy);
        automator.performUpkeep(performData);
        
        assertEq(automator.userCurrentStrategy(user), newStrategy);
    }
}

