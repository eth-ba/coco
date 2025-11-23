import { useState } from "react";
import { useBalancesByAddress } from "@/hooks/useBalances";
import { base, arbitrum, optimism } from "viem/chains";
import { parseUnits, createWalletClient, http, custom } from "viem";
import { supportedChains } from "@/lib/chains";
import { type ConnectedWallet } from "@privy-io/react-auth";

const CHAIN_OPTIONS = [
  { id: base.id, name: "Base" },
  { id: arbitrum.id, name: "Arbitrum" },
  { id: optimism.id, name: "Optimism" },
];

interface BridgeFormProps {
  smartAccount?: ConnectedWallet;
}

export function BridgeForm({ smartAccount: propSmartAccount }: BridgeFormProps) {
  const [sourceChainId, setSourceChainId] = useState<number>(base.id);
  const [destinationChainId, setDestinationChainId] = useState<number>(arbitrum.id);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Use prop if available
  const smartAccount = propSmartAccount;
  
  const { balances } = useBalancesByAddress(smartAccount?.address);

  // Get balance for selected source chain
  const sourceBalance = balances.find((b) => b.chainId === sourceChainId);
  const availableBalance = sourceBalance ? parseFloat(sourceBalance.balance) : 0;

  const handleBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🌉 === BRIDGE FLOW STARTED ===");
    console.log("Source Chain ID:", sourceChainId);
    console.log("Destination Chain ID:", destinationChainId);
    console.log("Amount:", amount);
    
    if (!smartAccount?.address) {
      setError("Please connect your wallet");
      console.error("❌ No smart account address");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      console.error("❌ Invalid amount");
      return;
    }

    if (parseFloat(amount) > availableBalance) {
      setError("Insufficient balance");
      console.error("❌ Insufficient balance. Available:", availableBalance, "Requested:", amount);
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus("Initializing bridge...");
    setTxHash(null);

    try {
      // Create wallet client with custom RPC
      const selectedChain = supportedChains.find((c) => c.id === sourceChainId);
      if (!selectedChain) throw new Error(`Chain ${sourceChainId} not supported`);

      const customRpcUrl = selectedChain.rpcUrls.default.http[0];
      console.log("🔗 Using RPC URL:", customRpcUrl);
      
      const provider = await smartAccount.getEthereumProvider();
      const walletClient = createWalletClient({
        account: smartAccount.address as `0x${string}`,
        chain: selectedChain,
        transport: custom(provider),
      });
      console.log("✅ Wallet client created");

      // Create PrivyMultiChainAccount for EIL SDK
      const eilModule = await import("@/lib/eil");
      console.log('🔧 eil module loaded:', eilModule);
      const account = eilModule.createPrivyAccount(walletClient, smartAccount.address as `0x${string}`);
      if (!account) {
        throw new Error('🔧 createPrivyAccount returned undefined');
      }
      console.log("✅ Created PrivyMultiChainAccount via factory");

      const amountInUnits = parseUnits(amount, 6);
      console.log("💰 Amount in units (6 decimals):", amountInUnits.toString());
      
      // Create EIL service
      const { EILService } = await import("@/lib/eil");
      const eilService = new EILService();
      
      // Execute real EIL bridge with status callback
      console.log("⚡ Executing real EIL bridge...");
      const txHash = await eilService.createAndExecuteBridge(
        sourceChainId,
        destinationChainId,
        amountInUnits,
        smartAccount.address,
        account,
        (statusUpdate) => {
          console.log("📊 Status update:", statusUpdate);
          setStatus(statusUpdate);
        }
      );
      
      console.log("✅ Bridge executed! TX Hash:", txHash);

      setStatus("Bridge completed!");
      setTxHash(txHash);
      
      console.log("🎉 === BRIDGE FLOW COMPLETED ===");
      console.log("✅ Real EIL transaction executed!");
      
      // Reset form
      setTimeout(() => {
        setAmount("");
        setStatus(null);
      }, 5000);
    } catch (err) {
      console.error("❌ === BRIDGE FLOW FAILED ===");
      console.error("Error details:", err);
      
      // Check for specific EIL errors
      let errorMessage = "Bridge failed";
      if (err instanceof Error) {
        if (err.message.includes("XLP")) {
          errorMessage = "No XLP available to fulfill bridge. XLP infrastructure may not be running.";
        } else if (err.message.includes("insufficient")) {
          errorMessage = "Insufficient balance or gas";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxClick = () => {
    if (sourceBalance) {
      setAmount(sourceBalance.balance);
    }
  };

  const handleSwapChains = () => {
    const temp = sourceChainId;
    setSourceChainId(destinationChainId);
    setDestinationChainId(temp);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleBridge} className="space-y-6 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bridge USDC</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Cross-chain transfer powered by EIL
          </p>
        </div>

        {/* EIL Implementation Warning */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">ℹ️ Real EIL Integration</p>
              <p className="mt-1 text-xs">
                This uses the real EIL SDK. Requires XLP (Cross-chain Liquidity Providers) infrastructure. Check console for detailed logs.
              </p>
            </div>
          </div>
        </div>

        {/* Source Chain */}
        <div>
          <label htmlFor="sourceChain" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            From Chain
          </label>
          <select
            id="sourceChain"
            value={sourceChainId}
            onChange={(e) => setSourceChainId(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
            disabled={isLoading}
          >
            {CHAIN_OPTIONS.map((chain) => (
              <option key={chain.id} value={chain.id} disabled={chain.id === destinationChainId}>
                {chain.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Available: {availableBalance.toFixed(2)} USDC
          </p>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSwapChains}
            className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
            disabled={isLoading}
          >
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Destination Chain */}
        <div>
          <label htmlFor="destinationChain" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            To Chain
          </label>
          <select
            id="destinationChain"
            value={destinationChainId}
            onChange={(e) => setDestinationChainId(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
            disabled={isLoading}
          >
            {CHAIN_OPTIONS.map((chain) => (
              <option key={chain.id} value={chain.id} disabled={chain.id === sourceChainId}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="amount" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Amount
            </label>
            <button
              type="button"
              onClick={handleMaxClick}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              disabled={isLoading}
            >
              MAX
            </button>
          </div>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
            disabled={isLoading}
          />
        </div>

        {/* Status Message */}
        {status && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              🚀 {status}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {txHash && !status && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Bridge successful!
            </p>
          </div>
        )}

        {/* Bridge Button */}
        <button
          type="submit"
          disabled={isLoading || !amount || parseFloat(amount) <= 0 || sourceChainId === destinationChainId}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Bridging...
            </span>
          ) : (
            "Bridge USDC"
          )}
        </button>
      </form>
    </div>
  );
}
