/**
 * Chainlink Functions Script: Fetch APY Data for Aqua Strategies
 * 
 * This script fetches real-time APY data for different DeFi yield strategies
 * and returns the best APY to the YieldAutomator contract.
 * 
 * Arguments:
 * - args[0]: Strategy type (e.g., "aave", "compound", "all")
 * - args[1]: Chain (e.g., "base", "arbitrum")
 * - args[2]: Asset (e.g., "USDC")
 * 
 * Returns: uint256 APY in basis points (e.g., 850 = 8.50%)
 */

// Parse arguments
const strategyType = args[0] || 'all';
const chain = args[1] || 'base';
const asset = args[2] || 'USDC';

// Helper function to fetch APY from DeFiLlama
async function fetchDeFiLlamaAPY(protocol, chain, pool) {
  try {
    const url = `https://yields.llama.fi/pools`;
    const response = await Functions.makeHttpRequest({ url });
    
    if (response.error) {
      console.error('DeFiLlama API error:', response.error);
      return null;
    }
    
    const pools = response.data.data;
    
    // Find matching pool
    const matchingPool = pools.find(p => 
      p.project === protocol && 
      p.chain === chain &&
      (pool ? p.symbol.includes(pool) : true)
    );
    
    if (matchingPool) {
      // Return APY in basis points (multiply by 100)
      return Math.floor(matchingPool.apy * 100);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from DeFiLlama:', error);
    return null;
  }
}

// Helper function to fetch APY from Aave
async function fetchAaveAPY(chain, asset) {
  try {
    // Aave V3 API endpoint
    const chainMap = {
      'base': 'base',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism'
    };
    
    const aaveChain = chainMap[chain.toLowerCase()] || 'base';
    const url = `https://aave-api-v2.aave.com/data/liquidity/v3?poolId=${aaveChain}`;
    
    const response = await Functions.makeHttpRequest({ url });
    
    if (response.error) {
      console.error('Aave API error:', response.error);
      return null;
    }
    
    const reserves = response.data;
    const usdcReserve = reserves.find(r => 
      r.symbol.toUpperCase() === asset.toUpperCase()
    );
    
    if (usdcReserve) {
      // liquidityRate is in ray units (27 decimals), convert to basis points
      const apyRay = BigInt(usdcReserve.liquidityRate);
      const apy = Number(apyRay) / 1e25; // Convert to percentage
      return Math.floor(apy * 100); // Convert to basis points
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from Aave:', error);
    return null;
  }
}

// Helper function to fetch APY from Compound
async function fetchCompoundAPY(chain, asset) {
  try {
    // Compound V3 API
    const url = `https://api.compound.finance/api/v2/ctoken`;
    const response = await Functions.makeHttpRequest({ url });
    
    if (response.error) {
      console.error('Compound API error:', response.error);
      return null;
    }
    
    const tokens = response.data.cToken;
    const usdcToken = tokens.find(t => 
      t.underlying_symbol === asset && 
      t.token_address // Filter for active tokens
    );
    
    if (usdcToken) {
      // supply_rate is already in APY format
      const apy = parseFloat(usdcToken.supply_rate.value);
      return Math.floor(apy * 100); // Convert to basis points
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from Compound:', error);
    return null;
  }
}

// Main execution
const apyResults = [];

// Determine which strategies to fetch based on strategyType
let strategiesToFetch = [];

if (strategyType === 'all') {
  strategiesToFetch = [
    { type: 'aave', chain, asset },
    { type: 'compound', chain, asset },
    { type: 'defillama', protocol: 'aave-v3', chain: chain.charAt(0).toUpperCase() + chain.slice(1), pool: asset }
  ];
} else {
  strategiesToFetch = [{ type: strategyType, chain, asset }];
}

// Fetch APY for each strategy
for (const strategy of strategiesToFetch) {
  let apy = null;
  
  switch (strategy.type) {
    case 'aave':
      apy = await fetchAaveAPY(strategy.chain, strategy.asset);
      break;
    case 'compound':
      apy = await fetchCompoundAPY(strategy.chain, strategy.asset);
      break;
    case 'defillama':
      apy = await fetchDeFiLlamaAPY(strategy.protocol, strategy.chain, strategy.pool);
      break;
  }
  
  // If fetch succeeded, add to results
  if (apy !== null && apy > 0) {
    apyResults.push(apy);
  }
}

// If no results, return a default safe APY (5%)
if (apyResults.length === 0) {
  console.log('No APY data fetched, returning default 5%');
  return Functions.encodeUint256(500); // 500 basis points = 5%
}

// Find the best (highest) APY
const bestAPY = Math.max(...apyResults);

console.log(`Best APY found: ${bestAPY / 100}%`);

// Return the best APY in basis points
// Functions.encodeUint256() is the proper Chainlink Functions method
return Functions.encodeUint256(bestAPY);

