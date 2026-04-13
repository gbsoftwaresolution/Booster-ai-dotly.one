// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title DotlyPaymentVault
 * @notice Product-only USDT payment vault for Dotly subscriptions.
 * @dev The contract intentionally excludes partner attribution, commissions,
 * payout logic, and retention qualification. It only records payments,
 * supports refunds during a fixed escrow window, and finalizes cleared revenue
 * to the Dotly treasury.
 */
contract DotlyPaymentVault is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant NAME_HASH = keccak256("DotlyPaymentVault");
    bytes32 private constant VERSION_HASH = keccak256("1");

    uint64 public constant REFUND_WINDOW = 7 days;

    bytes32 private constant PAYMENT_QUOTE_TYPEHASH = keccak256(
        "PaymentQuote(address payer,bytes32 userRef,uint256 amount,uint32 planId,uint8 duration,bytes32 paymentRef,uint64 deadline,address vault,uint256 chainId,address token)"
    );

    IERC20 public immutable usdt;
    uint256 private immutable initialChainId;
    bytes32 private immutable initialDomainSeparator;

    address public treasury;
    address public paymentSigner;

    enum PaymentStatus {
        NONE,
        PAID_ESCROW,
        REFUNDED,
        FINALIZED
    }

    struct PaymentRecord {
        address payer;
        bytes32 userRef;
        uint256 amount;
        uint32 planId;
        uint8 duration;
        bytes32 paymentRef;
        uint64 paidAt;
        uint64 refundUntil;
        PaymentStatus status;
    }

    mapping(bytes32 => PaymentRecord) private payments;

    event PaymentRecorded(
        bytes32 indexed paymentId,
        bytes32 indexed userRef,
        address indexed payer,
        uint256 amount,
        uint32 planId,
        uint8 duration,
        bytes32 paymentRef,
        uint64 paidAt,
        uint64 refundUntil
    );

    event RefundedByUser(
        bytes32 indexed paymentId,
        bytes32 indexed userRef,
        address indexed payer,
        uint256 amount,
        bytes32 paymentRef
    );

    event RefundedByAdmin(
        bytes32 indexed paymentId,
        bytes32 indexed userRef,
        address indexed payer,
        uint256 amount,
        bytes32 paymentRef,
        address admin
    );

    event Finalized(
        bytes32 indexed paymentId,
        bytes32 indexed userRef,
        address indexed payer,
        uint256 amount,
        bytes32 paymentRef,
        address treasury
    );

    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event PaymentSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event NativeRescued(address indexed to, uint256 amount);
    event TokenRescued(address indexed token, address indexed to, uint256 amount);

    constructor(
        address initialOwner,
        address initialTreasury,
        address initialPaymentSigner,
        address usdtToken
    ) Ownable(initialOwner) {
        require(initialOwner != address(0), "owner is zero");
        require(initialTreasury != address(0), "treasury is zero");
        require(initialPaymentSigner != address(0), "signer is zero");
        require(usdtToken != address(0), "token is zero");

        treasury = initialTreasury;
        paymentSigner = initialPaymentSigner;
        usdt = IERC20(usdtToken);
        initialChainId = block.chainid;
        initialDomainSeparator = _computeDomainSeparator();
    }

    function paySubscription(
        bytes32 userRef,
        uint256 amount,
        uint32 planId,
        uint8 duration,
        bytes32 paymentRef,
        uint64 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant returns (bytes32 paymentId) {
        require(userRef != bytes32(0), "userRef is zero");
        require(amount > 0, "amount is zero");
        require(planId > 0, "invalid plan");
        require(duration > 0, "invalid duration");
        require(paymentRef != bytes32(0), "paymentRef is zero");
        require(deadline >= block.timestamp, "quote expired");

        paymentId = _paymentIdFor(paymentRef);
        require(payments[paymentId].status == PaymentStatus.NONE, "paymentRef already used");

        _verifyQuote(
            msg.sender,
            userRef,
            amount,
            planId,
            duration,
            paymentRef,
            deadline,
            signature
        );

        uint64 paidAt = uint64(block.timestamp);
        uint64 refundUntil = paidAt + REFUND_WINDOW;

        payments[paymentId] = PaymentRecord({
            payer: msg.sender,
            userRef: userRef,
            amount: amount,
            planId: planId,
            duration: duration,
            paymentRef: paymentRef,
            paidAt: paidAt,
            refundUntil: refundUntil,
            status: PaymentStatus.PAID_ESCROW
        });

        usdt.safeTransferFrom(msg.sender, address(this), amount);

        emit PaymentRecorded(
            paymentId,
            userRef,
            msg.sender,
            amount,
            planId,
            duration,
            paymentRef,
            paidAt,
            refundUntil
        );
    }

    function requestRefund(bytes32 paymentId) external nonReentrant {
        PaymentRecord storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.PAID_ESCROW, "payment not refundable");
        require(payment.payer == msg.sender, "not payment payer");
        require(block.timestamp <= payment.refundUntil, "refund window closed");

        payment.status = PaymentStatus.REFUNDED;
        usdt.safeTransfer(payment.payer, payment.amount);

        emit RefundedByUser(
            paymentId,
            payment.userRef,
            payment.payer,
            payment.amount,
            payment.paymentRef
        );
    }

    function adminRefund(bytes32 paymentId) external onlyOwner nonReentrant {
        PaymentRecord storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.PAID_ESCROW, "payment not refundable");
        require(block.timestamp <= payment.refundUntil, "refund window closed");

        payment.status = PaymentStatus.REFUNDED;
        usdt.safeTransfer(payment.payer, payment.amount);

        emit RefundedByAdmin(
            paymentId,
            payment.userRef,
            payment.payer,
            payment.amount,
            payment.paymentRef,
            msg.sender
        );
    }

    function finalizePayment(bytes32 paymentId) external nonReentrant {
        PaymentRecord storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.PAID_ESCROW, "payment not finalizable");
        require(block.timestamp > payment.refundUntil, "refund window active");

        payment.status = PaymentStatus.FINALIZED;
        usdt.safeTransfer(treasury, payment.amount);

        emit Finalized(
            paymentId,
            payment.userRef,
            payment.payer,
            payment.amount,
            payment.paymentRef,
            treasury
        );
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "treasury is zero");
        address previousTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(previousTreasury, newTreasury);
    }

    function setPaymentSigner(address newPaymentSigner) external onlyOwner {
        require(newPaymentSigner != address(0), "signer is zero");
        address previousSigner = paymentSigner;
        paymentSigner = newPaymentSigner;
        emit PaymentSignerUpdated(previousSigner, newPaymentSigner);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function rescueNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "recipient is zero");
        require(amount > 0, "amount is zero");
        require(address(this).balance >= amount, "insufficient native balance");

        (bool success, ) = to.call{value: amount}("");
        require(success, "native transfer failed");
        emit NativeRescued(to, amount);
    }

    function rescueToken(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(usdt), "cannot rescue USDT");
        require(token != address(0), "token is zero");
        require(to != address(0), "recipient is zero");
        require(amount > 0, "amount is zero");

        IERC20(token).safeTransfer(to, amount);
        emit TokenRescued(token, to, amount);
    }

    function getPayment(bytes32 paymentId) external view returns (PaymentRecord memory) {
        return payments[paymentId];
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator();
    }

    function paymentIdFor(bytes32 paymentRef) external pure returns (bytes32) {
        return _paymentIdFor(paymentRef);
    }

    function _paymentIdFor(bytes32 paymentRef) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(paymentRef));
    }

    function _verifyQuote(
        address payer,
        bytes32 userRef,
        uint256 amount,
        uint32 planId,
        uint8 duration,
        bytes32 paymentRef,
        uint64 deadline,
        bytes calldata signature
    ) internal view {
        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_QUOTE_TYPEHASH,
                payer,
                userRef,
                amount,
                planId,
                duration,
                paymentRef,
                deadline,
                address(this),
                block.chainid,
                address(usdt)
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        address recoveredSigner = ECDSA.recover(digest, signature);
        require(recoveredSigner == paymentSigner, "invalid payment signature");
    }

    function _domainSeparator() internal view returns (bytes32) {
        if (block.chainid == initialChainId) {
            return initialDomainSeparator;
        }
        return _computeDomainSeparator();
    }

    function _computeDomainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this))
        );
    }

    receive() external payable {}
}
