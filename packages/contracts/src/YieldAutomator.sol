// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "./interfaces/IAqua.sol";

/**
 * @title YieldAutomator
 * @notice Automates yield optimization for Coco platform using Chainlink Automation and Functions
 * @dev Integrates with Aqua Protocol for cross-chain liquidity management
 */
contract YieldAutomator is AutomationCompatibleInterface, FunctionsClient {
    /// @notice Address of the Aqua Protocol contract
    IAqua public immutable aquaProtocol;
    
    /// @notice Owner of the contract
    address public owner;

    /// @notice Array of available AquaApp strategy addresses
    address[] public aquaAppStrategies;
    
    /// @notice Mapping of strategy index to their APY (basis points)
    mapping(uint256 => uint256) public strategyAPY;
    
    /// @notice Mapping of user to their current strategy hash
    mapping(address => bytes32) public userStrategyHash;
    
    /// @notice Mapping of user to their current strategy index
    mapping(address => uint256) public userStrategyIndex;
    
    /// @notice USDC token address (same on all chains for this example)
    address public immutable usdcToken;

    /// @notice Minimum time between rebalances (in seconds)
    uint256 public constant REBALANCE_INTERVAL = 1 hours;

    /// @notice Last rebalance timestamp for each user
    mapping(address => uint256) public lastRebalance;

    /// @notice Minimum APY difference to trigger rebalance (in basis points)
    uint256 public constant MIN_APY_DIFF = 50; // 0.5%

    /// @notice Event emitted when a user's strategy is rebalanced
    event StrategyRebalanced(
        address indexed user,
        uint256 indexed oldStrategy,
        uint256 indexed newStrategy,
        uint256 timestamp
    );

    /// @notice Event emitted when strategy APY is updated
    event StrategyAPYUpdated(uint256 indexed strategyId, uint256 newAPY);
    
    /// @notice Event emitted when user deposits funds
    event Deposited(address indexed user, uint256 amount, uint256 strategyIndex, bytes32 strategyHash);
    
    /// @notice Event emitted when user withdraws funds
    event Withdrawn(address indexed user, uint256 amount, bytes32 strategyHash);
    
    /// @notice Event emitted when a new strategy is added
    event StrategyAdded(uint256 indexed strategyIndex, address aquaApp);

    /**
     * @notice Constructor to initialize the YieldAutomator
     * @param _router Chainlink Functions router address
     * @param _aqua Aqua Protocol contract address
     * @param _usdc USDC token address
     */
    constructor(address _router, address _aqua, address _usdc) FunctionsClient(_router) {
        require(_aqua != address(0), "Invalid Aqua address");
        require(_usdc != address(0), "Invalid USDC address");
        aquaProtocol = IAqua(_aqua);
        usdcToken = _usdc;
        owner = msg.sender;
    }
    
    /// @notice Modifier to restrict functions to owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    /**
     * @notice Add a new AquaApp strategy
     * @param aquaApp Address of the AquaApp contract
     * @param initialAPY Initial APY for this strategy in basis points
     */
    function addStrategy(address aquaApp, uint256 initialAPY) external onlyOwner {
        require(aquaApp != address(0), "Invalid app address");
        uint256 strategyIndex = aquaAppStrategies.length;
        aquaAppStrategies.push(aquaApp);
        strategyAPY[strategyIndex] = initialAPY;
        emit StrategyAdded(strategyIndex, aquaApp);
    }
    
    /**
     * @notice Get the number of available strategies
     * @return Number of strategies
     */
    function getStrategyCount() external view returns (uint256) {
        return aquaAppStrategies.length;
    }
    
    /**
     * @notice Deposit USDC into a specific Aqua strategy
     * @param amount Amount of USDC to deposit
     * @param strategyIndex Index of the strategy to use
     * @dev User must approve this contract to spend their USDC first
     */
    function deposit(uint256 amount, uint256 strategyIndex) external {
        require(strategyIndex < aquaAppStrategies.length, "Invalid strategy");
        require(amount > 0, "Amount must be > 0");
        
        address aquaApp = aquaAppStrategies[strategyIndex];
        
        // Build strategy struct (simple single-token strategy)
        bytes memory strategy = abi.encode(
            msg.sender,      // maker
            usdcToken,       // token0
            usdcToken,       // token1 (same for single-token)
            uint256(0),      // feeBps
            keccak256(abi.encodePacked(msg.sender, block.timestamp)) // salt for uniqueness
        );
        
        // Prepare tokens and amounts arrays
        address[] memory tokens = new address[](1);
        tokens[0] = usdcToken;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        // Transfer USDC from user to this contract
        // Note: User must have approved this contract first
        (bool success, ) = usdcToken.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount)
        );
        require(success, "USDC transfer failed");
        
        // Approve Aqua Protocol to spend USDC
        (success, ) = usdcToken.call(
            abi.encodeWithSignature("approve(address,uint256)", address(aquaProtocol), amount)
        );
        require(success, "USDC approval failed");
        
        // Ship liquidity to Aqua
        bytes32 strategyHash = aquaProtocol.ship(aquaApp, strategy, tokens, amounts);
        
        // Store user's strategy info
        userStrategyHash[msg.sender] = strategyHash;
        userStrategyIndex[msg.sender] = strategyIndex;
        lastRebalance[msg.sender] = block.timestamp;
        
        emit Deposited(msg.sender, amount, strategyIndex, strategyHash);
    }
    
    /**
     * @notice Withdraw all USDC from user's current strategy
     * @dev Docks the strategy and returns funds to user
     */
    function withdraw() external {
        bytes32 strategyHash = userStrategyHash[msg.sender];
        require(strategyHash != bytes32(0), "No active strategy");
        
        uint256 strategyIndex = userStrategyIndex[msg.sender];
        address aquaApp = aquaAppStrategies[strategyIndex];
        
        // Prepare tokens array
        address[] memory tokens = new address[](1);
        tokens[0] = usdcToken;
        
        // Get balance before dock
        (uint248 balanceBefore, ) = aquaProtocol.rawBalances(
            msg.sender,
            aquaApp,
            strategyHash,
            usdcToken
        );
        
        // Dock from Aqua (withdraws virtual balance back to user's wallet)
        aquaProtocol.dock(aquaApp, strategyHash, tokens);
        
        // Clear user's strategy info
        delete userStrategyHash[msg.sender];
        delete userStrategyIndex[msg.sender];
        
        emit Withdrawn(msg.sender, uint256(balanceBefore), strategyHash);
    }

    /**
     * @notice Chainlink Automation function to check if upkeep is needed
     * @dev Checks if any user needs rebalancing based on APY differences
     * @param checkData Encoded array of user addresses to check
     * @return upkeepNeeded Boolean indicating if upkeep is needed
     * @return performData Encoded data for performUpkeep
     */
    function checkUpkeep(
        bytes calldata checkData
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // Decode user addresses to check
        address[] memory usersToCheck = abi.decode(checkData, (address[]));
        
        // Find the best strategy based on APY
        uint256 bestStrategyIndex = 0;
        uint256 bestAPY = strategyAPY[0];
        
        for (uint256 i = 1; i < aquaAppStrategies.length; i++) {
            if (strategyAPY[i] > bestAPY) {
                bestAPY = strategyAPY[i];
                bestStrategyIndex = i;
            }
        }
        
        // Check each user to see if they need rebalancing
        for (uint256 i = 0; i < usersToCheck.length; i++) {
            address user = usersToCheck[i];
            
            // Skip if user has no strategy
            if (userStrategyHash[user] == bytes32(0)) continue;
            
            // Skip if rebalanced too recently
            if (block.timestamp < lastRebalance[user] + REBALANCE_INTERVAL) continue;
            
            uint256 currentStrategyIndex = userStrategyIndex[user];
            
            // Skip if already in best strategy
            if (currentStrategyIndex == bestStrategyIndex) continue;
            
            // Check if APY difference is significant
            uint256 currentAPY = strategyAPY[currentStrategyIndex];
            if (bestAPY > currentAPY + MIN_APY_DIFF) {
                // Found a user who needs rebalancing
                upkeepNeeded = true;
                performData = abi.encode(user, bestStrategyIndex);
                return (upkeepNeeded, performData);
            }
        }
        
        return (false, "");
    }

    /**
     * @notice Chainlink Automation function to perform upkeep
     * @dev Executes dock and ship operations on Aqua Protocol
     * @param performData Encoded data containing user address and new strategy index
     */
    function performUpkeep(bytes calldata performData) external override {
        (address user, uint256 newStrategyIndex) = abi.decode(
            performData,
            (address, uint256)
        );

        require(newStrategyIndex < aquaAppStrategies.length, "Invalid strategy");
        require(
            block.timestamp >= lastRebalance[user] + REBALANCE_INTERVAL,
            "Rebalance too soon"
        );

        bytes32 oldStrategyHash = userStrategyHash[user];
        require(oldStrategyHash != bytes32(0), "No active strategy");
        
        uint256 oldStrategyIndex = userStrategyIndex[user];
        require(oldStrategyIndex != newStrategyIndex, "Same strategy");

        // Check if APY difference is significant enough
        uint256 oldAPY = strategyAPY[oldStrategyIndex];
        uint256 newAPY = strategyAPY[newStrategyIndex];
        require(
            newAPY > oldAPY + MIN_APY_DIFF,
            "APY difference not significant"
        );

        // Get old and new AquaApp addresses
        address oldAquaApp = aquaAppStrategies[oldStrategyIndex];
        address newAquaApp = aquaAppStrategies[newStrategyIndex];
        
        // Prepare tokens array
        address[] memory tokens = new address[](1);
        tokens[0] = usdcToken;
        
        // Step 1: Get current balance before docking
        (uint248 balance, ) = aquaProtocol.rawBalances(
            user,
            oldAquaApp,
            oldStrategyHash,
            usdcToken
        );
        
        // Step 2: Dock from old strategy (removes virtual balance)
        aquaProtocol.dock(oldAquaApp, oldStrategyHash, tokens);
        
        // Step 3: Build new strategy
        bytes memory newStrategy = abi.encode(
            user,           // maker
            usdcToken,      // token0
            usdcToken,      // token1
            uint256(0),     // feeBps
            keccak256(abi.encodePacked(user, block.timestamp, newStrategyIndex)) // new salt
        );
        
        // Step 4: Prepare amounts for shipping
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = uint256(balance);
        
        // Step 5: Approve Aqua to spend USDC (funds are back in user's wallet after dock)
        // Note: In Aqua, funds stay in user's wallet, so we need user's approval
        // This is a limitation - in production, user would need to pre-approve or use a different pattern
        
        // Step 6: Ship to new strategy
        bytes32 newStrategyHash = aquaProtocol.ship(newAquaApp, newStrategy, tokens, amounts);
        
        // Update user's strategy info
        userStrategyHash[user] = newStrategyHash;
        userStrategyIndex[user] = newStrategyIndex;
        lastRebalance[user] = block.timestamp;

        emit StrategyRebalanced(user, oldStrategyIndex, newStrategyIndex, block.timestamp);
    }

    /**
     * @notice Update strategy APY (called by Chainlink Functions fulfillRequest)
     * @param strategyIndex The strategy index to update
     * @param newAPY The new APY in basis points
     */
    function updateStrategyAPY(uint256 strategyIndex, uint256 newAPY) internal {
        require(strategyIndex < aquaAppStrategies.length, "Invalid strategy");
        strategyAPY[strategyIndex] = newAPY;
        emit StrategyAPYUpdated(strategyIndex, newAPY);
    }
    
    /**
     * @notice Manual APY update by owner (for testing/emergency)
     * @param strategyIndex The strategy index to update
     * @param newAPY The new APY in basis points
     */
    function manualUpdateAPY(uint256 strategyIndex, uint256 newAPY) external onlyOwner {
        updateStrategyAPY(strategyIndex, newAPY);
    }

    /**
     * @notice Chainlink Functions callback
     * @param response The response from Chainlink Functions
     * @param err Any error from the function execution
     */
    function fulfillRequest(
        bytes32 /* requestId */,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (err.length > 0) {
            // Handle error - could emit an event
            return;
        }
        
        // Decode response - expecting array of APY values
        // Format: [apy0, apy1, apy2, ...]
        uint256[] memory apyValues = abi.decode(response, (uint256[]));
        
        // Update each strategy's APY
        for (uint256 i = 0; i < apyValues.length && i < aquaAppStrategies.length; i++) {
            updateStrategyAPY(i, apyValues[i]);
        }
    }
    
    /**
     * @notice Request APY data from Chainlink Functions
     * @param source JavaScript source code for Chainlink Functions
     * @param subscriptionId Chainlink Functions subscription ID
     * @param gasLimit Gas limit for the callback
     * @param donID DON ID for Chainlink Functions
     * @return requestId The request ID
     */
    function requestAPYData(
        string calldata source,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donID
    ) external onlyOwner returns (bytes32 requestId) {
        // For now, we'll use a simplified approach
        // In production, you would use the FunctionsRequest library properly
        // This is a placeholder that can be updated when deploying
        
        // Send the request with inline JavaScript source
        bytes memory encodedRequest = abi.encode(source);
        
        requestId = _sendRequest(
            encodedRequest,
            subscriptionId,
            gasLimit,
            donID
        );
    }
}

