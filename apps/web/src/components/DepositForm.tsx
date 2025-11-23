import { useState, useEffect } from "react";
import { type ConnectedWallet } from "@privy-io/react-auth";
import { useDepositWithAccount } from "@/hooks/useDeposit";
import { useBalancesByAddress } from "@/hooks/useBalances";
import { base } from "viem/chains";
import { parseUnits, createWalletClient, http } from "viem";
import { supportedChains } from "@/lib/chains";

interface DepositFormProps {
  smartAccount?: ConnectedWallet;
}

export function DepositForm({ smartAccount: propSmartAccount }: DepositFormProps) {
  const [amount, setAmount] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<number>(base.id);
  const [isCrossChain, setIsCrossChain] = useState(false);
  const [eilStatus, setEilStatus] = useState<string | null>(null);
  
  // Use prop if available (Dashboard passes it)
  const smartAccount = propSmartAccount;

  const { deposit, isLoading: isDepositLoading, error: depositError, txHash } = useDepositWithAccount(smartAccount);
  const { balances, isLoading: isBalancesLoading } = useBalancesByAddress(smartAccount?.address);

  // Auto-select chain based on balance and amount
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      // Default to Base if no amount
      setSelectedChainId(base.id);
      setIsCrossChain(false);
      return;
    }

    const amountBN = parseUnits(amount, 6);
    
    // Check if we have enough on Base first (cheapest/fastest)
    const baseBalance = balances.find(b => b.chainId === base.id);
    if (baseBalance && baseBalance.rawBalance >= amountBN) {
      setSelectedChainId(base.id);
      setIsCrossChain(false);
      return;
    }

    // Otherwise, look for other chains with enough balance
    const otherChain = balances.find(b => b.chainId !== base.id && b.rawBalance >= amountBN);
    if (otherChain) {
      setSelectedChainId(otherChain.chainId);
      setIsCrossChain(true);
    } else {
      // If no chain has enough, stay on Base (will show insufficient funds error later)
      setSelectedChainId(base.id);
      setIsCrossChain(false);
    }
  }, [amount, balances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    if (isCrossChain) {
      try {
        setEilStatus("Initializing EIL Bridge...");
        if (!smartAccount?.address) throw new Error("Smart account not ready");

        // Dynamically import EIL service to avoid SSR issues
        const eilModule = await import("@/lib/eil");
        const eilService = new eilModule.EILService();

        // Create adapter
        const selectedChain = supportedChains.find(c => c.id === selectedChainId);
        if (!selectedChain) throw new Error(`Chain ${selectedChainId} not supported`);
        
        const customRpcUrl = selectedChain.rpcUrls.default.http[0];
        const walletClient = createWalletClient({
          account: smartAccount.address as `0x${string}`,
          chain: selectedChain,
          transport: http(customRpcUrl)
        });

        const accountAdapter = eilModule.createPrivyAccount(walletClient, smartAccount.address as `0x${string}`);

        setEilStatus("Bridging funds...");
        
        await eilService.createAndExecuteBridge(
          selectedChainId,
          base.id,
          parseUnits(amount, 6),
          smartAccount.address,
          accountAdapter,
          (status) => setEilStatus(status)
        );
        
        setEilStatus("Deposit initiated! Waiting for arrival...");
        // In a real app, we'd poll for completion here
      } catch (err) {
        console.error(err);
        setEilStatus("Failed: " + (err as Error).message);
      }
    } else {
      await deposit(amount);
    }
  };

  const handleMaxClick = () => {
    // Find the chain with the highest balance
    if (balances.length === 0) return;
    
    const maxBalanceChain = balances.reduce((prev, current) => 
      (prev.rawBalance > current.rawBalance) ? prev : current
    );
    
    setAmount(maxBalanceChain.balance);
  };

  const isLoading = isDepositLoading || isBalancesLoading;
  const error = depositError;

  // Get current chain name for display
  const currentChainName = balances.find(b => b.chainId === selectedChainId)?.chainId === base.id ? 'Base' : 
                          balances.find(b => b.chainId === selectedChainId)?.chainId === 42161 ? 'Arbitrum' : 
                          balances.find(b => b.chainId === selectedChainId)?.chainId === 10 ? 'Optimism' : 'Unknown Chain';

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-black dark:text-zinc-50">
        Deposit USDC
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Amount (USDC)
          </label>
          <div className="relative">
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 pr-20 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || !!eilStatus}
            />
            <button
              type="button"
              onClick={handleMaxClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              disabled={isLoading || !!eilStatus}
            >
              MAX
            </button>
          </div>
          {/* Balance Display */}
          <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Available:</span>
            <div className="flex gap-2">
              {balances.map(b => (
                <span key={b.chainId} className={b.chainId === selectedChainId ? "font-bold text-blue-600 dark:text-blue-400" : ""}>
                  {b.chainId === base.id ? 'Base' : b.chainId === 42161 ? 'Arb' : 'Op'}: {parseFloat(b.balance).toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy Selector (Placeholder for now) */}
        <div>
          <label htmlFor="strategy" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Strategy
          </label>
          <select
            id="strategy"
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || !!eilStatus}
          >
            <option value="default">High Yield Strategy (Coming Soon)</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Estimated APY: ~8-12%
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">
                {isCrossChain ? `Auto-Bridging from ${currentChainName}` : "Direct Deposit from Base"}
              </p>
              <ul className="mt-1 space-y-1 text-xs">
                {isCrossChain ? (
                  <>
                    <li>• We detected your funds on {currentChainName}</li>
                    <li>• EIL handles the bridging automatically</li>
                    <li>• Funds arrive in your Smart Account</li>
                  </>
                ) : (
                  <>
                    <li>• Using funds directly from Base</li>
                    <li>• Aqua manages virtual balances for yield</li>
                    <li>• Withdraw anytime with no lock-up period</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* EIL Status Message */}
        {eilStatus && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
              🚀 {eilStatus}
            </p>
          </div>
        )}

        {/* Success Message */}
        {txHash && !eilStatus && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Deposit successful!
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1 break-all">
              Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !!eilStatus || !amount || parseFloat(amount) <= 0}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || eilStatus ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {eilStatus ? 'Processing EIL...' : 'Processing...'}
            </span>
          ) : (
            isCrossChain ? 'Bridge & Deposit' : 'Deposit to Aqua'
          )}
        </button>

        {/* Smart Account Info */}
        {smartAccount && (
          <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
            Depositing from: {smartAccount.address?.slice(0, 6)}...{smartAccount.address?.slice(-4)}
          </p>
        )}
      </form>
    </div>
  );
}

