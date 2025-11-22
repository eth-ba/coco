/**
 * Chainlink Functions Script: Fetch APY Data for Aqua Strategies
 * 
 * This script fetches real-time APY data for different DeFi yield strategies
 * and returns them to the YieldAutomator contract.
 * 
 * Data Sources:
 * - DeFiLlama API for protocol yields
 * - Aqua Protocol API (if available)
 * - Individual protocol APIs (Aave, Compound, etc.)
 */

// Strategy addresses passed as arguments
// args[0] = comma-separated list of strategy identifiers
const strategyIds = args[0] ? args[0].split(',') : [];

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
async function main() {
  const apyResults = [];
  
  // Define strategies to fetch
  // In production, these would be passed as arguments or configured
  const strategies = [
    { type: 'aave', chain: 'base', asset: 'USDC' },
    { type: 'compound', chain: 'base', asset: 'USDC' },
    { type: 'defillama', protocol: 'aave-v3', chain: 'Base', pool: 'USDC' }
  ];
  
  // Fetch APY for each strategy
  for (const strategy of strategies) {
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
    
    // If fetch failed, use a fallback/default value
    // In production, you might want to keep the last known value instead
    apyResults.push(apy || 0);
  }
  
  // Return encoded array of APY values
  return Functions.encodeUint256(apyResults);
}

// Execute and return result
return await main();

