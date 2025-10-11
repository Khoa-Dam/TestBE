import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { placeBid, cancelBid, acceptBid, confirmTransaction } from '../api/user';

interface NFTBidModalProps {
    nft: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    currentBids?: any[];
    walletAddress?: string;
    initialAction?: 'place' | 'cancel' | 'accept';
}

export default function NFTBidModal({
    nft,
    isOpen,
    onClose,
    onSuccess,
    currentBids = [],
    walletAddress = "",
    initialAction = 'place'
}: NFTBidModalProps) {
    const { account, signAndSubmitTransaction } = useWallet();

    // Form state
    const [bidAmount, setBidAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState<'place' | 'cancel' | 'accept'>(initialAction);


    // Get current user's bid
    const userBid = currentBids.find(bid => bid.bidder_address === walletAddress && bid.status === 'active');

    // Get top bid - priority: top-level fields, then bids array
    let topBid: any = null;
    if (nft.top_bid_amount && nft.top_bidder) {
        // Use top-level fields if available
        topBid = {
            amount: nft.top_bid_amount,
            bidder_address: nft.top_bidder,
            status: 'active'
        };
    } else {
        // Fallback to bids array
        topBid = currentBids
            .filter(bid => bid.status === 'active')
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0];
    }

    // Check if current user is the owner of this NFT (case insensitive)
    // Support multiple owner field formats
    let isOwner = false;
    if (nft.current_owner) {
        // Direct owner field
        isOwner = nft.current_owner.toLowerCase() === walletAddress?.toLowerCase();
    } else if (nft.current_token_ownerships && Array.isArray(nft.current_token_ownerships)) {
        // Array of ownership records
        isOwner = nft.current_token_ownerships.some((ownership: any) =>
            ownership.owner_address?.toLowerCase() === walletAddress?.toLowerCase()
        );
    } else if (nft.isCurrentOwner) {
        // Boolean flag
        isOwner = nft.isCurrentOwner === true;
    }

    // Check if there are active bids (using top-level fields or bids array)
    const hasActiveBids = (nft.top_bid_amount && nft.top_bidder) ||
        currentBids.filter(bid => bid.status === 'active').length > 0;

    // Reset action when modal opens with new initialAction
    React.useEffect(() => {
        if (isOpen) {
            // Ensure owner cannot have place or cancel actions
            if (isOwner && (initialAction === 'place' || initialAction === 'cancel')) {
                setAction('accept');
            } else {
                setAction(initialAction);
            }
        }
    }, [isOpen, initialAction, isOwner]);

    // Debug logging
    console.log("🔍 NFTBidModal Debug:", {
        initialAction: initialAction,
        currentAction: action,
        isOpen: isOpen,
        nftOwner: nft.current_owner,
        currentTokenOwnerships: nft.current_token_ownerships,
        isCurrentOwner: nft.isCurrentOwner,
        walletAddress: walletAddress,
        isOwner: isOwner,
        topBid: topBid,
        topBidAmount: nft.top_bid_amount,
        topBidder: nft.top_bidder,
        currentBidsCount: currentBids.length,
        activeBidsCount: currentBids.filter(bid => bid.status === 'active').length,
        hasActiveBids: hasActiveBids,
        shouldShowAcceptBid: isOwner && hasActiveBids,
        allBids: currentBids
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        console.log("🚀 handleSubmit called with action:", action);

        if (action === 'place') {
            if (isOwner) {
                setError('NFT owners cannot place bids on their own NFTs');
                return;
            }

            if (!bidAmount || parseFloat(bidAmount) <= 0) {
                setError('Please enter a valid bid amount');
                return;
            }

            if (topBid && parseFloat(bidAmount) <= parseFloat(topBid.amount)) {
                setError(`Bid amount must be higher than current top bid (${topBid.amount} APT)`);
                return;
            }

            // Additional validation for contract requirements
            const bidAmountNum = parseFloat(bidAmount);
            if (isNaN(bidAmountNum) || bidAmountNum <= 0) {
                setError('Bid amount must be a positive number');
                return;
            }

            // Convert to octas (smallest APT unit) - 1 APT = 100,000,000 octas
            const priceInOctas = Math.floor(bidAmountNum * 100000000);
            if (priceInOctas <= 0) {
                setError('Bid amount is too small');
                return;
            }

            console.log(`💰 Bid amount: ${bidAmountNum} APT = ${priceInOctas} octas`);
        }

        if (action === 'cancel') {
            if (isOwner) {
                setError('NFT owners cannot cancel bids (they can only accept them)');
                return;
            }
        }

        if (action === 'accept') {
            console.log("✅ Accept bid validation - isOwner:", isOwner, "hasActiveBids:", hasActiveBids);
            if (!isOwner) {
                setError('Only NFT owner can accept bids');
                return;
            }
            if (!hasActiveBids) {
                setError('No active bids available to accept');
                return;
            }
            console.log("✅ Accept bid validation passed, proceeding to confirmation");
        }

        // Show confirmation dialog
        const actionText = action === 'place' ? 'place this bid' : action === 'cancel' ? 'cancel your bid' : 'accept this bid';
        const amountText = action === 'place' ? ` for ${bidAmount} APT` : '';

        if (!confirm(`Are you sure you want to ${actionText}${amountText}?\n\nYou will need to sign a transaction with your wallet.`)) {
            return;
        }

        handleConfirmAction();
    };

    const handleConfirmAction = async () => {
        setLoading(true);
        setError(null);

        try {
            const nftId = nft._id;
            if (!nftId) {
                throw new Error("NFT ID not found");
            }

            console.log("🚀 Starting bid action:", action);
            console.log("🚀 Top bid info:", topBid);

            let apiResponse: any;

            // Step 1: Call appropriate API
            if (action === 'place') {
                // Always set expiry to 0 (no expiry)
                const expiry = 0;
                apiResponse = await placeBid(nftId, parseFloat(bidAmount), expiry);
            } else if (action === 'cancel') {
                apiResponse = await cancelBid(nftId);
            } else if (action === 'accept') {
                // Use the topBid we already calculated
                if (!topBid) {
                    throw new Error('No top bid found to accept');
                }
                console.log("🎯 Accepting bid from:", topBid.bidder_address, "amount:", topBid.amount);
                apiResponse = await acceptBid(nftId, topBid.bidder_address);
            }

            console.log("✅ API Response:", apiResponse);

            if (!apiResponse.success) {
                throw new Error(apiResponse.message || "API request failed");
            }

            // Handle different API response structures
            let trackingId: string;
            let transactionMeta: any;

            if (apiResponse.data?.tracking?.tracking_id) {
                // Structure: { data: { tracking: { tracking_id } } }
                trackingId = apiResponse.data.tracking.tracking_id;
                transactionMeta = apiResponse.data.transactionMeta || apiResponse.transactionMeta;
            } else if (apiResponse.trackingId) {
                // Structure: { trackingId, transactionMeta }
                trackingId = apiResponse.trackingId;
                transactionMeta = apiResponse.transactionMeta;
            } else {
                throw new Error("Invalid response from server - missing tracking ID");
            }

            console.log("🔍 Tracking ID:", trackingId);

            // Step 2: Sign and submit transaction
            if (!signAndSubmitTransaction) {
                throw new Error("signAndSubmitTransaction function not available");
            }

            if (!transactionMeta) {
                throw new Error("Invalid response from server - missing transaction data");
            }

            console.log("🔍 Transaction metadata:", transactionMeta);

            // Normalize backend transaction into wallet adapter format
            // transactionMeta has structure: { functionId, sender, chainId, payload }
            const rawPayload = transactionMeta.payload || {};

            const normalizedFunction = rawPayload.function || transactionMeta.functionId;
            const normalizedTypeArgs = rawPayload.typeArguments || rawPayload.type_arguments || [];
            const normalizedArgs = rawPayload.functionArguments || rawPayload.arguments || [];

            if (!normalizedFunction) {
                throw new Error("Invalid transaction data - missing function identifier");
            }

            // Debug logging for arguments
            console.log("🔍 Raw payload:", rawPayload);
            console.log("🔍 Function:", normalizedFunction);
            console.log("🔍 Type args:", normalizedTypeArgs);
            console.log("🔍 Function args:", normalizedArgs);
            console.log("🔍 Args count:", normalizedArgs.length);
            console.log("🔍 Expected: 4 args (escrow_owner, token_id, price, expiry)");

            const bidTxForWallet = {
                sender: account?.address || transactionMeta.sender,
                data: {
                    function: normalizedFunction,
                    typeArguments: normalizedTypeArgs,
                    functionArguments: normalizedArgs,
                },
            } as any;

            console.log("🔧 Normalized bid tx for wallet:", bidTxForWallet);

            // Sign and submit transaction with wallet
            console.log("🔐 Signing and submitting bid transaction...");
            const result = await signAndSubmitTransaction(bidTxForWallet);
            console.log("✅ Bid transaction signed and submitted:", result.hash);

            // Step 3: Confirm transaction with backend API
            console.log("📡 Confirming bid transaction with API...");
            console.log("🔍 Tracking ID:", trackingId);
            console.log("🔍 Transaction Hash:", result.hash);

            // Use generic confirm API for all bid actions
            await confirmTransaction(
                trackingId,
                result.hash,
                (result as any).version || 0,
                (result as any).gas_used || 500
            );

            console.log("✅ Bid transaction confirmed successfully on backend!");

            // Step 4: Show success message and refresh
            const actionText = action === 'place' ? 'placed' : action === 'cancel' ? 'cancelled' : 'accepted';
            alert(`✅ Bid ${actionText} successfully!\n\nTransaction Hash: ${result.hash}`);

            onSuccess?.();
            onClose();

        } catch (err: any) {
            console.error("❌ Bid action error:", err);

            if (err.message?.includes("User rejected") || err.message?.includes("cancelled")) {
                setError("Transaction cancelled by user");
            } else if (err.message?.includes("No active bid found")) {
                setError("No active bid found for this NFT");
            } else if (err.message?.includes("Only NFT owner can accept")) {
                setError("Only NFT owner can accept bids");
            } else if (err.message?.includes("Bid amount must be higher")) {
                setError(err.message);
            } else if (err.message?.includes("E_PRICE_ZERO")) {
                setError("Bid amount must be greater than 0");
            } else if (err.message?.includes("E_BID_TOO_LOW")) {
                setError("Bid amount is too low. Please increase your bid.");
            } else if (err.message?.includes("E_EXPIRED")) {
                setError("Bid has expired. Please place a new bid.");
            } else if (err.message?.includes("E_PAUSED")) {
                setError("Bidding is currently paused for this NFT.");
            } else if (err.message?.includes("Generic error")) {
                setError("Transaction failed. Please check your bid amount and try again.");
            } else {
                setError(err.message || "Failed to perform bid action");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e9ecef',
                }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                        {action === 'place' && '💰 Place Bid'}
                        {action === 'cancel' && '❌ Cancel Bid'}
                        {action === 'accept' && '✅ Accept Bid'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#6c757d',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* NFT Info */}
                <div style={{
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                        {nft.token_name || 'NFT'}
                    </h4>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                        {nft.collection_name || nft.collection?.name || 'Collection'}
                    </p>
                </div>

                {/* Action Tabs */}
                <div style={{
                    display: 'flex',
                    marginBottom: '20px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    overflow: 'hidden',
                }}>
                    {!isOwner && (
                        <button
                            onClick={() => setAction('place')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: action === 'place' ? '#007bff' : 'white',
                                color: action === 'place' ? 'white' : '#6c757d',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Place Bid
                        </button>
                    )}
                    {userBid && !isOwner && (
                        <button
                            onClick={() => setAction('cancel')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: action === 'cancel' ? '#dc3545' : 'white',
                                color: action === 'cancel' ? 'white' : '#6c757d',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Cancel My Bid
                        </button>
                    )}
                    {isOwner && hasActiveBids && (
                        <button
                            onClick={() => setAction('accept')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: action === 'accept' ? '#28a745' : 'white',
                                color: action === 'accept' ? 'white' : '#6c757d',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Accept Top Bid
                        </button>
                    )}
                </div>

                {/* Top Bid Info */}
                {topBid && (
                    <div style={{
                        background: '#e3f2fd',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1976d2' }}>
                            🏆 Highest Bid
                        </h5>
                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#1976d2' }}>
                            {topBid.amount} APT by {topBid.bidder_address.slice(0, 6)}...{topBid.bidder_address.slice(-4)}
                        </p>
                        {userBid && (
                            <p style={{ margin: 0, fontSize: '13px', color: '#1976d2' }}>
                                Your Bid: {userBid.amount} APT
                            </p>
                        )}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {action === 'place' && (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                                    Bid Amount (APT)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    placeholder="Enter bid amount"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '6px',
                                        fontSize: '16px',
                                    }}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {action === 'accept' && (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                background: '#fff3cd',
                                border: '1px solid #ffeaa7',
                                borderRadius: '8px',
                                padding: '16px',
                                textAlign: 'center',
                            }}>
                                <h5 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#856404' }}>
                                    🎯 Accept Highest Bid
                                </h5>
                                <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                                    You will accept the bid of <strong>{topBid?.amount || 'N/A'} APT</strong> from{' '}
                                    <strong>{topBid?.bidder_address ? `${topBid.bidder_address.slice(0, 6)}...${topBid.bidder_address.slice(-4)}` : 'N/A'}</strong>
                                </p>
                                {/* Debug info */}
                                <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                                    Debug: action={action}, topBid={topBid ? 'exists' : 'null'}, isOwner={isOwner ? 'true' : 'false'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            background: '#f8d7da',
                            color: '#721c24',
                            padding: '12px',
                            borderRadius: '6px',
                            marginBottom: '16px',
                            fontSize: '14px',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '16px',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: loading ? '#ccc' : (
                                    action === 'place' ? '#007bff' :
                                        action === 'cancel' ? '#dc3545' : '#28a745'
                                ),
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                fontWeight: '600',
                            }}
                        >
                            {loading ? '⏳ Processing...' : (
                                action === 'place' ? 'Place Bid' :
                                    action === 'cancel' ? 'Cancel My Bid' : 'Accept Top Bid'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
