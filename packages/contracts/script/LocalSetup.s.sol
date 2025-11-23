// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Test} from "forge-std/Test.sol";
import {FlashLoan} from "../src/FlashLoan.sol";
import {FlashLoanBorrower} from "../src/FlashLoanBorrower.sol";
import {IAqua} from "../src/interfaces/IAqua.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LocalSetup
 * @notice Deploy flash loan contracts on forked Aqua
 * 
 * Usage:
 * 1. Start Anvil with fork:
 *    anvil --fork-url $RPC_URL
 * 
 * 2. Run script:
 *    forge script script/LocalSetup.s.sol:LocalSetup --rpc-url http://localhost:8545 --broadcast
 */
contract LocalSetup is Script, Test {
    address constant AQUA_ADDRESS = 0x499943E74FB0cE105688beeE8Ef2ABec5D936d31;
    
    function getUSDCAddress() internal view returns (address) {
        if (block.chainid == 1) return 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // Ethereum mainnet
        if (block.chainid == 11155111) return 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // Ethereum Sepolia
        if (block.chainid == 8453) return 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Base mainnet
        if (block.chainid == 84532) return 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia
        if (block.chainid == 42161) return 0xaf88d065e77c8cC2239327C5EDb3A432268e5831; // Arbitrum
        if (block.chainid == 10) return 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85; // Optimism
        if (block.chainid == 137) return 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359; // Polygon
        if (block.chainid == 5042002) return address(0); // Arc Testnet
        revert("Unsupported chain");
    }
    
    function run() external returns (
        IAqua aqua,
        IERC20 usdc,
        FlashLoan flashLoan,
        FlashLoanBorrower borrower
    ) {
        uint256 deployerKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerKey);
        
        uint256 lenderKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address lender = vm.addr(lenderKey);
        
        uint256 borrowerKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
        address borrowerAddr = vm.addr(borrowerKey);
        
        uint256 initialLiquidity = 10_000 * 1e6; // 10,000 USDC
        
        console.log("\n=== Local Foundry Setup ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Lender:", lender);
        console.log("Borrower:", borrowerAddr);
        console.log("Initial Liquidity:", initialLiquidity / 1e6, "USDC");
        
        aqua = IAqua(AQUA_ADDRESS);
        usdc = IERC20(getUSDCAddress());
        
        console.log("\n--- Contracts ---");
        console.log("Aqua Protocol:", address(aqua));
        console.log("USDC Token:", address(usdc));
        
        vm.startBroadcast(deployerKey);
        
        console.log("\n--- Deploying FlashLoan Contract ---");
        flashLoan = new FlashLoan(aqua);
        console.log("FlashLoan deployed at:", address(flashLoan));
        
        console.log("\n--- Deploying FlashLoanBorrower ---");
        borrower = new FlashLoanBorrower(flashLoan);
        console.log("FlashLoanBorrower deployed at:", address(borrower));
        
        vm.stopBroadcast();
        
        console.log("\n--- Setting up test liquidity ---");
        
        deal(address(usdc), lender, initialLiquidity * 10);
        console.log("Gave lender", (initialLiquidity * 10) / 1e6, "USDC");
        
        deal(address(usdc), borrowerAddr, 100 * 1e6);
        deal(address(usdc), address(borrower), 100 * 1e6);
        console.log("Gave borrower 100 USDC for fees");
        
        vm.startPrank(lender);
        
        usdc.approve(address(aqua), type(uint256).max);
        console.log("Lender approved Aqua for USDC");
        
        FlashLoan.Strategy memory strategy = FlashLoan.Strategy({
            maker: lender,
            token: address(usdc),
            salt: bytes32(uint256(1))
        });
        
        address[] memory tokens = new address[](1);
        tokens[0] = address(usdc);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = initialLiquidity;

        aqua.ship(
            address(flashLoan),
            abi.encode(strategy),
            tokens,
            amounts
        );
        
        console.log("Lender shipped", initialLiquidity / 1e6, "USDC to Aqua");
        
        // Register strategy for EIP-3156 discovery
        flashLoan.registerStrategy(strategy);
        console.log("Strategy registered for EIP-3156");
        
        vm.stopPrank();
        
        console.log("\n=== Deployment Complete ===");
        console.log("AQUA_ADDRESS=%s", address(aqua));
        console.log("USDC_ADDRESS=%s", address(usdc));
        console.log("FLASH_LOAN_ADDRESS=%s", address(flashLoan));
        console.log("BORROWER_CONTRACT_ADDRESS=%s", address(borrower));
        console.log("\n[READY] Ready to test flash loans with Aqua Protocol");
    }
}

