import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { buyNft, confirmTransaction } from '../api/user';
import { NFT } from '../api/workflow';
import NFTBidModal from './NFTBidModal';
import NFTListingModal from './NFTListingModal';

interface NftCardProps {
    nft: any; // Using any for now since NFT type doesn't include history
    onClick?: () => void;
    showRelistButton?: boolean;
    onBuy?: (nft: any) => void;
    onRelist?: (nft: any) => void;
    onList?: (nft: any) => void;
    onBidSuccess?: () => void;
}

export const NftCard: React.FC<NftCardProps> = ({ nft, onClick, showRelistButton, onBuy, onRelist, onList, onBidSuccess }) => {
    const { account, signAndSubmitTransaction, signMessage } = useWallet();
    const [buyLoading, setBuyLoading] = useState(false);
    const [isBidModalOpen, setIsBidModalOpen] = useState(false);
    const [isListingModalOpen, setIsListingModalOpen] = useState(false);

    // Check if current user is the owner of this NFT
    const currentUserAddress = account?.address || '';
    let isOwner = false;

    // Support multiple owner field formats
    if (nft.current_owner) {
        // Direct owner field
        isOwner = nft.current_owner.toLowerCase() === currentUserAddress.toLowerCase();
    } else if (nft.current_token_ownerships && Array.isArray(nft.current_token_ownerships)) {
        // Array of ownership records
        isOwner = nft.current_token_ownerships.some((ownership: any) =>
            ownership.owner_address?.toLowerCase() === currentUserAddress.toLowerCase()
        );
    } else if (nft.isCurrentOwner) {
        // Boolean flag
        isOwner = nft.isCurrentOwner === true;
    }

    // Debug logging for owner detection
    console.log("🔍 NftCard Owner Debug:", {
        nftName: nft.token_name,
        currentUserAddress: currentUserAddress,
        nftCurrentOwner: nft.current_owner,
        currentTokenOwnerships: nft.current_token_ownerships,
        currentTokenOwnershipsDetails: nft.current_token_ownerships?.map((o: any) => ({
            owner_address: o.owner_address,
            owned_since: o.owned_since
        })),
        isCurrentOwner: nft.isCurrentOwner,
        isOwner: isOwner,
        hasBids: nft.has_bids,
        topBidAmount: nft.top_bid_amount,
        bids: nft.bids
    });

    const formatPriceAPT = (raw: any) => {
        const num = typeof raw === 'string' ? parseFloat(raw) : raw;
        if (typeof num !== 'number' || isNaN(num)) return '0';
        // Heuristic: if value is very large, it's octas -> convert to APT
        const apt = num > 1_000_000 ? num / 100_000_000 : num;
        return (Math.round(apt * 1e8) / 1e8).toString();
    };

    const handleBuy = async () => {
        if (!account) {
            alert('Please connect your wallet first');
            return;
        }

        const nftId = nft._id;
        if (!nftId) {
            alert('Invalid NFT data');
            return;
        }

        setBuyLoading(true);

        try {
            console.log('🚀 Starting NFT purchase for:', nftId);

            // Step 1: Prepare buy transaction
            const prepareData = await buyNft(nftId);
            console.log('✅ Buy transaction prepared:', prepareData);

            if (!prepareData.success) {
                throw new Error(prepareData.error || 'Failed to prepare purchase');
            }

            // Step 2: Show confirmation dialog with price and fees
            const priceInAPT = parseInt(prepareData.purchaseInfo.price) / 100000000;
            const feesInAPT = parseInt(prepareData.purchaseInfo.feeEstimate.totalFees) / 100000000;

            const confirmed = confirm(
                `Buy this NFT?\n\n` +
                `Price: ${priceInAPT} APT\n` +
                `Fees: ${feesInAPT} APT\n` +
                `Total: ${priceInAPT + feesInAPT} APT\n\n` +
                `Seller receives: ${parseInt(prepareData.purchaseInfo.feeEstimate.sellerReceives) / 100000000} APT`
            );

            if (!confirmed) {
                setBuyLoading(false);
                return;
            }

            // Step 3: Sign and submit transaction
            console.log('🔐 Signing buy transaction...');
            const meta = prepareData.transactionMeta || {};
            const p = meta.payload || meta;
            const normalizedFunction = p.function || p.functionId;
            const normalizedTypeArgs = p.typeArguments || p.type_arguments || [];
            const normalizedArgs = p.functionArguments || p.arguments || [];
            if (!normalizedFunction) throw new Error('Invalid transaction metadata: missing function');

            const txResult = await signAndSubmitTransaction({
                sender: account?.address,
                data: {
                    function: normalizedFunction,
                    typeArguments: normalizedTypeArgs,
                    functionArguments: normalizedArgs,
                },
            });

            console.log('✅ Buy transaction signed and submitted:', txResult.hash);

            // Step 4: Confirm transaction with backend
            console.log('📡 Confirming buy transaction...');
            await confirmTransaction(
                prepareData.trackingId,
                txResult.hash,
                (txResult as any).version || 0,
                (txResult as any).gas_used || 500
            );

            console.log('✅ NFT purchased successfully!');

            // Call success callback if provided
            onBuy?.(nft);

            alert('✅ NFT purchased successfully!');

        } catch (err: any) {
            console.error('❌ Buy NFT error:', err);

            if (err.message?.includes('not listed')) {
                alert('❌ This NFT is no longer available for purchase');
            } else if (err.message?.includes('own NFT')) {
                alert('❌ You cannot buy your own NFT');
            } else if (err.message?.includes('insufficient')) {
                alert('❌ Insufficient funds to complete the purchase');
            } else {
                alert(`❌ Failed to buy NFT: ${err.message}`);
            }
        } finally {
            setBuyLoading(false);
        }
    };

    // Defensive check for nft object
    if (!nft || typeof nft !== 'object') {
        console.error('NftCard: Invalid NFT data received:', nft);
        return (
            <div style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                color: '#6c757d'
            }}>
                Invalid NFT data
            </div>
        );
    }

    console.log('NftCard: Rendering NFT:', nft);

    // Defensive checks for required properties - handle backend data structure
    const requiredProps = nft._id && nft.token_name && nft.collection_id;
    if (!requiredProps) {
        console.error('NftCard: Missing required NFT properties:', nft);
        return (
            <div style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                color: '#6c757d'
            }}>
                Invalid NFT data - missing required properties
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.currentTarget.style.borderColor = '#007bff';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,123,255,0.15)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
        >
            {/* NFT Image */}
            <div
                style={{
                    width: '100%',
                    height: '200px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        color: 'white',
                        fontSize: '48px',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    }}
                >
                    🖼️
                </div>
                {nft.image_uri && nft.image_uri.trim() !== '' ? (
                    <img
                        src={nft.image_uri}
                        alt={nft.token_name}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1,
                        }}
                        onError={(e) => {
                            // Hide image on error and show emoji
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '48px',
                            fontWeight: 'bold',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                            zIndex: 1,
                        }}
                    >
                        🖼️
                    </div>
                )}
            </div>

            {/* NFT Info */}
            <div style={{ padding: '16px' }}>
                <h4
                    style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        margin: '0 0 8px 0',
                        color: '#212529',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {nft.token_name}
                </h4>

                <p
                    style={{
                        fontSize: '14px',
                        color: '#6c757d',
                        margin: '0 0 12px 0',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {nft.description || 'No description available'}
                </p>

                {/* Attributes */}
                {nft.attributes && Array.isArray(nft.attributes) && nft.attributes.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                            }}
                        >
                            {nft.attributes.slice(0, 3).map((attr: any, index: number) => (
                                <span
                                    key={index}
                                    style={{
                                        background: '#f8f9fa',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        color: '#495057',
                                        fontWeight: '500',
                                    }}
                                >
                                    {attr?.trait_type || 'Unknown'}: {attr?.value || 'Unknown'}
                                </span>
                            ))}
                            {nft.attributes.length > 3 && (
                                <span
                                    style={{
                                        background: '#f8f9fa',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        color: '#6c757d',
                                    }}
                                >
                                    +{nft.attributes.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Sync Source Badge */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                    }}
                >
                    <span style={{ color: '#6c757d' }}>
                        ID: {nft._id?.slice(0, 8)}...
                    </span>
                    <span
                        style={{
                            background: nft.sync_status === 'synced' ? '#d4edda' : '#fff3cd',
                            color: nft.sync_status === 'synced' ? '#155724' : '#856404',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '600',
                        }}
                    >
                        {nft.sync_status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                </div>

                {/* Listing Status Badge */}
                {(() => {
                    // Check if NFT is listed using same logic as action buttons
                    let currentListing: any = null;
                    if (nft.is_listed && nft.listed_price != null) {
                        const price = typeof nft.listed_price === 'string' ? parseFloat(nft.listed_price) : nft.listed_price;
                        currentListing = {
                            transaction_type: 'list',
                            price,
                            timestamp: nft.listed_at,
                            from_address: nft.listed_by,
                        };
                    } else {
                        const timeline = Array.isArray(nft.history) ? nft.history.slice() : [];
                        const sorted = timeline.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                        const latest = sorted.find((h: any) => {
                            const t = (h.transaction_type || '').toLowerCase();
                            return t === 'list' || t === 'relist' || t === 'cancel' || t === 'cancel_list';
                        });
                        if (latest) {
                            const t = (latest.transaction_type || '').toLowerCase();
                            if (t === 'list' || t === 'relist') {
                                const normalizedPrice = typeof latest.price === 'string' ? parseFloat(latest.price) : latest.price;
                                currentListing = { ...latest, price: normalizedPrice };
                            }
                        }
                    }

                    if (currentListing) {
                        return (
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '4px 8px',
                                    background: '#fff3e0',
                                    borderRadius: '4px',
                                    border: '1px solid #ff9800',
                                    fontSize: '12px',
                                }}
                            >
                                💰{' '}
                                <span style={{ color: '#e65100', fontWeight: 'bold' }}>
                                    {currentListing.transaction_type === 'list' ? 'Listed' : 'Relisted'}: {currentListing.price?.toLocaleString()} APT
                                </span>
                            </div>
                        );
                    }

                    return null;
                })()}

                {/* Bid Info */}
                {(() => {
                    // Use top-level bid fields if available, fallback to bids array
                    const hasBids = nft.has_bids || (nft.bids && nft.bids.length > 0) || nft.top_bid_amount;
                    if (hasBids) {
                        let topBidAmount = null;
                        let topBidder = null;

                        // Priority 1: Use top-level fields if available
                        if (nft.top_bid_amount && nft.top_bidder) {
                            topBidAmount = nft.top_bid_amount;
                            topBidder = nft.top_bidder;
                        }
                        // Priority 2: Use bids array
                        else if (nft.bids && nft.bids.length > 0) {
                            const activeBids = nft.bids.filter((bid: any) => bid.status === 'active');
                            const topBid = activeBids.sort((a: any, b: any) => parseFloat(b.amount) - parseFloat(a.amount))[0];
                            if (topBid) {
                                topBidAmount = topBid.amount;
                                topBidder = topBid.bidder_address;
                            }
                        }

                        if (topBidAmount) {
                            return (
                                <div
                                    style={{
                                        marginTop: '8px',
                                        padding: '6px 8px',
                                        background: '#e3f2fd',
                                        borderRadius: '4px',
                                        border: '1px solid #2196f3',
                                        fontSize: '12px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        🎯{' '}
                                        <span style={{ color: '#1976d2', fontWeight: 'bold' }}>
                                            Top Bid: {topBidAmount} APT
                                        </span>
                                    </div>
                                    {topBidder && (
                                        <div style={{
                                            color: '#666',
                                            fontSize: '11px',
                                            marginTop: '2px',
                                            fontFamily: 'monospace'
                                        }}>
                                            by {topBidder.slice(0, 6)}...{topBidder.slice(-4)}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    }
                    return null;
                })()}

                {/* Action Buttons */}
                {(() => {
                    // Prefer top-level listed fields; fallback to history
                    let currentListing: any = null;
                    if (nft.is_listed && nft.listed_price != null) {
                        const price = typeof nft.listed_price === 'string' ? parseFloat(nft.listed_price) : nft.listed_price;
                        currentListing = {
                            transaction_type: 'list',
                            price,
                            timestamp: nft.listed_at,
                            from_address: nft.listed_by,
                        };
                    } else {
                        const timeline = Array.isArray(nft.history) ? nft.history.slice() : [];
                        const sorted = timeline.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                        const latest = sorted.find((h: any) => {
                            const t = (h.transaction_type || '').toLowerCase();
                            return t === 'list' || t === 'relist' || t === 'cancel' || t === 'cancel_list';
                        });
                        if (latest) {
                            const t = (latest.transaction_type || '').toLowerCase();
                            if (t === 'list' || t === 'relist') {
                                const normalizedPrice = typeof latest.price === 'string' ? parseFloat(latest.price) : latest.price;
                                currentListing = { ...latest, price: normalizedPrice };
                            }
                        }
                    }

                    // Check if user has active bid
                    const userBid = nft.bids ? nft.bids.find((bid: any) => bid.bidder_address === currentUserAddress && bid.status === 'active') : null;

                    // Check if owner has bids to accept (PRIORITY: show this first for owners with bids)
                    const hasActiveBids = nft.bids && nft.bids.length > 0 && nft.bids.some((bid: any) => bid.status === 'active');
                    if (isOwner && hasActiveBids) {
                        return (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBidModalOpen(true);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    marginTop: '12px',
                                    transition: 'background 0.2s',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#218838';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#28a745';
                                }}
                            >
                                🎯 Accept Bid
                            </button>
                        );
                    }

                    if (currentListing) {
                        // NFT is listed for sale
                        if (isOwner && showRelistButton) {
                            // Owner can relist
                            return (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRelist?.(nft);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#ffc107',
                                        color: '#212529',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        marginTop: '12px',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#e0a800';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = '#ffc107';
                                    }}
                                >
                                    🔄 Update Price ({parseInt(String(currentListing.price)) / 100000000} APT)
                                </button>
                            );
                        } else if (!isOwner) {
                            // Others can buy or bid
                            return (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBuy();
                                        }}
                                        disabled={buyLoading}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: buyLoading ? '#ccc' : '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: buyLoading ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseOver={(e) => {
                                            if (!buyLoading) {
                                                e.currentTarget.style.background = '#218838';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!buyLoading) {
                                                e.currentTarget.style.background = '#28a745';
                                            }
                                        }}
                                    >
                                        {buyLoading ? '⏳' : '💰 Buy'}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsBidModalOpen(true);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = '#0056b3';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = '#007bff';
                                        }}
                                    >
                                        🎯 {isOwner ? 'Accept Bid' : (userBid ? 'My Bid' : 'Bid')}
                                    </button>
                                </div>
                            );
                        }
                    } else {
                        // NFT is not listed
                        if (isOwner) {
                            // Owner can list NFT
                            return (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsListingModalOpen(true);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        marginTop: '12px',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#5a6fd8';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = '#667eea';
                                    }}
                                >
                                    📈 List for Sale
                                </button>
                            );
                        } else {
                            // Others can bid on unlisted NFT
                            return (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsBidModalOpen(true);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        marginTop: '12px',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#0056b3';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = '#007bff';
                                    }}
                                >
                                    🎯 {userBid ? 'My Bid' : 'Place Bid'}
                                </button>
                            );
                        }
                    }


                    return null;
                })()}
            </div>

            {/* Bid Modal */}
            <NFTBidModal
                nft={nft}
                isOpen={isBidModalOpen}
                onClose={() => setIsBidModalOpen(false)}
                onSuccess={() => {
                    onBidSuccess?.();
                    setIsBidModalOpen(false);
                }}
                currentBids={nft.bids || []}
                walletAddress={account?.address || ''}
                initialAction={isOwner ? 'accept' : 'place'}
            />

            {/* Listing Modal */}
            <NFTListingModal
                nft={nft}
                isOpen={isListingModalOpen}
                onClose={() => setIsListingModalOpen(false)}
                onSuccess={() => {
                    onList?.(nft);
                    setIsListingModalOpen(false);
                }}
                currentListing={(() => {
                    // Get current listing using same logic as action buttons
                    let currentListing: any = null;
                    if (nft.is_listed && nft.listed_price != null) {
                        const price = typeof nft.listed_price === 'string' ? parseFloat(nft.listed_price) : nft.listed_price;
                        currentListing = {
                            transaction_type: 'list',
                            price,
                            timestamp: nft.listed_at,
                            from_address: nft.listed_by,
                        };
                    }
                    return currentListing;
                })()}
                signMessage={signMessage}
                walletAddress={account?.address || ''}
            />
        </div>
    );
};

