/**
 * Hook to create a new flash loan strategy
 * 1. Register strategy with FlashLoan contract
 * 2. Approve USDC to Aqua Protocol
 * 3. Ship liquidity to Aqua Protocol
 */

import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { parseUnits, encodeFunctionData, keccak256, encodeAbiParameters } from 'viem';
import { 
  FLASH_LOAN_ADDRESS,
  AQUA_PROTOCOL_ADDRESS,
  USDC_ADDRESS
} from '@/lib/constants';
import flashLoanAbi from '@/abis/FlashLoan.json';
import aquaAbi from '@/abis/Aqua.json';

// ERC20 ABI for approve
const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

export interface Strategy {
  maker: string;
  token: string;
  salt: string;
  feeBps: number; // Fee in basis points (e.g., 10 = 0.01%)
}

export function useCreateStrategy() {
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const smartAccount = wallets.find((w) => w.walletClientType === 'privy');

  const createStrategy = async (amountUSDC: string, feeDisplay: string) => {
    if (!smartAccount || !smartAccount.address) {
      setError('No smart account found. Please log in.');
      return { success: false, error: 'No smart account' };
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);
    setCurrentStep(0);

    try {
      const provider = await smartAccount.getEthereumProvider();
      const amount = parseUnits(amountUSDC, 6); // USDC has 6 decimals

      console.log('💰 Creating Flash Loan Strategy');
      console.log('📊 Amount:', amountUSDC, 'USDC');
      console.log('💵 Fee (display only):', feeDisplay, '% (using contract hardcoded 0.01%)');
      
      // Verify network connection
      console.log('🌐 Verifying network connection...');
      try {
        const chainId = await provider.request({ method: 'eth_chainId' });
        const blockNumber = await provider.request({ method: 'eth_blockNumber' });
        console.log('✅ Connected to Chain ID:', parseInt(chainId, 16));
        console.log('✅ Current Block Number:', parseInt(blockNumber, 16));
        
        if (parseInt(chainId, 16) !== 14) {
          throw new Error(`Wrong network! Expected Flare Mainnet (14), got ${parseInt(chainId, 16)}`);
        }
      } catch (netError: any) {
        console.error('❌ Network verification failed:', netError);
        throw new Error(`Network connection failed: ${netError.message || 'Cannot connect to Arc Testnet RPC'}`);
      }
      
      // Generate unique salt for this strategy
      const salt = `0x${Date.now().toString(16).padStart(64, '0')}`;

      // Create strategy object
      // Note: feeDisplay is just for UI - contract uses hardcoded or configurable fees
      const feeBps = 10; // Default 0.01% fee
      
      const strategy: Strategy = {
        maker: smartAccount.address,
        token: USDC_ADDRESS,
        salt,
        feeBps
      };

      console.log('📝 Strategy:', strategy);

      // Calculate strategy hash
      const encodedStrategy = encodeAbiParameters(
        [
          {
            name: 'strategy',
            type: 'tuple',
            components: [
              { name: 'maker', type: 'address' },
              { name: 'token', type: 'address' },
              { name: 'salt', type: 'bytes32' },
              { name: 'feeBps', type: 'uint256' }
            ]
          }
        ],
        [strategy]
      );
      const strategyHash = keccak256(encodedStrategy);
      console.log('🔑 Strategy Hash:', strategyHash);
      console.log('💰 Fee:', feeBps, 'basis points (0.01%)');

      // Step 1: Register Strategy with FlashLoan contract
      setCurrentStep(1);
      console.log('🔄 Step 1/3: Registering strategy with FlashLoan contract...');
      const registerData = encodeFunctionData({
        abi: flashLoanAbi,
        functionName: 'registerStrategy',
        args: [strategy]
      });

      console.log('📤 Preparing registerStrategy transaction...');
      console.log('   From:', smartAccount.address);
      console.log('   To:', FLASH_LOAN_ADDRESS);
      console.log('   Data length:', registerData.length, 'bytes');
      console.log('📤 Sending transaction to RPC...');
      
      let registerTxHash: string;
      try {
        const txHashResult = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: smartAccount.address,
            to: FLASH_LOAN_ADDRESS,
            data: registerData
          }]
        });
        registerTxHash = txHashResult as string;
        console.log('✅ Transaction sent! Hash:', registerTxHash);
        console.log('🔗 View on Flare Explorer:', `https://flare-explorer.flare.network/tx/${registerTxHash}`);
      } catch (txError: any) {
        console.error('❌ Transaction failed:', txError);
        console.error('   Error code:', txError.code);
        console.error('   Error message:', txError.message);
        console.error('   Full error:', JSON.stringify(txError, null, 2));
        
        if (txError.code === 4001 || txError.message?.includes('User rejected')) {
          throw new Error('Transaction rejected by user');
        }
        throw new Error(`Failed to send transaction: ${txError.message || 'Unknown error'}`);
      }

      console.log('⏳ Waiting for confirmation...');
      await waitForTransaction(provider, registerTxHash);
      console.log('✅ Step 1/3 Complete!');

      // Step 2: Approve USDC to Aqua Protocol
      setCurrentStep(2);
      console.log('🔄 Step 2/3: Approving USDC to Aqua Protocol...');
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [AQUA_PROTOCOL_ADDRESS as `0x${string}`, amount]
      });

      console.log('📤 Sending approve transaction...');
      let approveTxHash: string;
      try {
        const txHashResult = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: smartAccount.address,
            to: USDC_ADDRESS,
            data: approveData
          }]
        });
        approveTxHash = txHashResult as string;
        console.log('✅ Transaction sent! Hash:', approveTxHash);
      } catch (txError: any) {
        console.error('❌ Transaction failed:', txError);
        if (txError.code === 4001 || txError.message?.includes('User rejected')) {
          throw new Error('Transaction rejected by user');
        }
        throw new Error(`Failed to approve USDC: ${txError.message || 'Unknown error'}`);
      }

      console.log('⏳ Waiting for confirmation...');
      await waitForTransaction(provider, approveTxHash);
      console.log('✅ Step 2/3 Complete!');

      // Step 3: Ship liquidity to Aqua Protocol
      setCurrentStep(3);
      console.log('🔄 Step 3/3: Shipping liquidity to Aqua Protocol...');
      const shipData = encodeFunctionData({
        abi: aquaAbi,
        functionName: 'ship',
        args: [
          FLASH_LOAN_ADDRESS,
          encodedStrategy,
          [USDC_ADDRESS],
          [amount]
        ]
      });

      console.log('📤 Sending ship transaction...');
      let shipTxHash: string;
      try {
        const txHashResult = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: smartAccount.address,
            to: AQUA_PROTOCOL_ADDRESS,
            data: shipData
          }]
        });
        shipTxHash = txHashResult as string;
        console.log('✅ Transaction sent! Hash:', shipTxHash);
      } catch (txError: any) {
        console.error('❌ Transaction failed:', txError);
        if (txError.code === 4001 || txError.message?.includes('User rejected')) {
          throw new Error('Transaction rejected by user');
        }
        throw new Error(`Failed to ship liquidity: ${txError.message || 'Unknown error'}`);
      }

      console.log('⏳ Waiting for confirmation...');
      await waitForTransaction(provider, shipTxHash);
      console.log('✅ Step 3/3 Complete!');
      console.log('🎉 Strategy created successfully!');
      console.log('📍 Strategy Hash:', strategyHash);

      setTxHash(shipTxHash);

      return {
        success: true,
        txHash: shipTxHash,
        strategyHash
      };
    } catch (err: any) {
      console.error('❌ Create strategy error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create strategy';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
      setCurrentStep(0);
    }
  };

  return {
    createStrategy,
    isLoading,
    error,
    txHash,
    smartAccount,
    currentStep
  };
}

/**
 * Wait for transaction confirmation
 */
async function waitForTransaction(provider: any, txHash: string): Promise<void> {
  console.log('⏳ Waiting for transaction:', txHash);
  let confirmed = false;
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max wait

  while (!confirmed && attempts < maxAttempts) {
    try {
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      });

      if (receipt && receipt.status === '0x1') {
        confirmed = true;
        console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
      } else if (receipt && receipt.status === '0x0') {
        console.error('❌ Transaction reverted! Receipt:', receipt);
        throw new Error('Transaction failed on-chain (reverted)');
      } else {
        // Not mined yet, wait and retry
        if (attempts % 5 === 0) {
          console.log(`⏳ Still waiting... (${attempts}s elapsed)`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    } catch (err: any) {
      console.error('❌ Error checking transaction receipt:', err);
      if (attempts >= maxAttempts - 1) {
        throw new Error(`Transaction confirmation failed: ${err.message || 'Unknown error'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }

  if (!confirmed) {
    throw new Error('Transaction confirmation timeout after 60 seconds');
  }
}

