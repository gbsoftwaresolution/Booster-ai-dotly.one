// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DotlySubscription
 * @notice Manages subscription plans for Dotly.one using USDC payments.
 *
 * Plans: 0=FREE, 1=PRO ($9/mo), 2=BUSINESS ($29/mo), 3=ENTERPRISE (custom)
 *
 * Upgradeability: This contract is intentionally non-upgradeable. Subscription
 * logic is simple, value-bearing, and benefits from immutability guarantees for
 * users. If a migration is ever needed, a new contract will be deployed and users
 * migrated via a documented off-chain process. UUPS/transparent proxy patterns
 * are deliberately omitted to reduce attack surface.
 */
contract DotlySubscription is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    enum Plan { FREE, PRO, BUSINESS, ENTERPRISE }

    struct Subscription {
        Plan plan;
        uint256 expiresAt;
        bool active;
    }

    mapping(Plan => uint256) public monthlyPrice;
    mapping(address => Subscription) public subscriptions;

    event SubscriptionActivated(address indexed user, Plan plan, uint256 expiresAt);
    /// @param user        The subscriber whose subscription was cancelled.
    /// @param plan        The plan that was active at cancellation time.
    /// @param cancelledAt The block timestamp when cancellation occurred.
    event SubscriptionCancelled(address indexed user, Plan plan, uint256 cancelledAt);
    event PlanPriceUpdated(Plan plan, uint256 newPrice);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "USDC address cannot be zero");
        usdc = IERC20(_usdc);
        monthlyPrice[Plan.FREE]       = 0;
        monthlyPrice[Plan.PRO]        = 9_000_000;   // $9.00 (6 decimals)
        monthlyPrice[Plan.BUSINESS]   = 29_000_000;  // $29.00 (6 decimals)
        monthlyPrice[Plan.ENTERPRISE] = 0;           // Custom – set via setMonthlyPrice
    }

    /**
     * @notice Subscribe to or renew a paid plan.
     * @param plan              The target plan (must not be FREE or ENTERPRISE with price=0).
     * @param months            Number of months to subscribe (1–12).
     * @param maxPricePerMonth  Slippage guard: revert if the stored price exceeds this value.
     *                          Pass type(uint256).max to skip the guard.
     */
    function subscribe(
        Plan plan,
        uint256 months,
        uint256 maxPricePerMonth
    ) external nonReentrant whenNotPaused {
        require(plan != Plan.FREE, "Use FREE plan without payment");
        require(months >= 1 && months <= 12, "1-12 months only");

        uint256 pricePerMonth = monthlyPrice[plan];
        require(pricePerMonth > 0, "Invalid plan price");
        require(pricePerMonth <= maxPricePerMonth, "Price exceeds slippage guard");

        // Downgrade guard: prevent silently switching to a cheaper plan mid-cycle.
        Subscription memory current = subscriptions[msg.sender];
        if (current.active && current.expiresAt > block.timestamp) {
            require(
                uint256(plan) >= uint256(current.plan),
                "Cannot downgrade mid-cycle; cancel first"
            );
        }

        uint256 totalPrice = pricePerMonth * months;

        usdc.safeTransferFrom(msg.sender, address(this), totalPrice);

        uint256 start = (current.active && current.expiresAt > block.timestamp)
            ? current.expiresAt
            : block.timestamp;
        uint256 newExpiry = start + (months * 30 days);

        subscriptions[msg.sender] = Subscription({
            plan: plan,
            expiresAt: newExpiry,
            active: true
        });

        emit SubscriptionActivated(msg.sender, plan, newExpiry);
    }

    /**
     * @notice Cancel the caller's active subscription.
     * @dev Sets active=false but preserves the remaining paid period in expiresAt
     *      so off-chain indexers can determine when access should stop.
     */
    function cancelSubscription() external {
        Subscription storage sub = subscriptions[msg.sender];
        require(sub.active, "No active subscription");
        Plan cancelledPlan = sub.plan;
        sub.active = false;
        emit SubscriptionCancelled(msg.sender, cancelledPlan, block.timestamp);
    }

    /**
     * @notice Returns true if the user has a paid, non-expired, active subscription.
     */
    function isActive(address user) external view returns (bool) {
        Subscription memory sub = subscriptions[user];
        return sub.active && sub.expiresAt > block.timestamp;
    }

    /**
     * @notice Returns the subscription details for a user.
     * @return plan      The current plan enum value.
     * @return expiresAt Unix timestamp when the subscription expires.
     * @return active    True only if active AND not yet expired.
     */
    function getSubscription(address user)
        external
        view
        returns (Plan plan, uint256 expiresAt, bool active)
    {
        Subscription memory sub = subscriptions[user];
        return (sub.plan, sub.expiresAt, sub.active && sub.expiresAt > block.timestamp);
    }

    /**
     * @notice Withdraw collected USDC to a recipient address.
     * @dev IMPORTANT: Before calling on mainnet, transfer ownership to a
     *      multi-sig wallet (e.g. Gnosis Safe) so that withdrawals require
     *      M-of-N approval. Single-EOA ownership is only acceptable during
     *      the initial deployment and testing phase.
     */
    function withdrawUSDC(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        usdc.safeTransfer(to, amount);
        emit FundsWithdrawn(to, amount);
    }

    /**
     * @notice Update the monthly price for a plan.
     */
    function setMonthlyPrice(Plan plan, uint256 price) external onlyOwner {
        monthlyPrice[plan] = price;
        emit PlanPriceUpdated(plan, price);
    }

    /**
     * @notice Pause the contract, disabling new subscriptions.
     * @dev Use in emergencies (e.g. price feed manipulation, contract exploit discovery).
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract, re-enabling new subscriptions.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
