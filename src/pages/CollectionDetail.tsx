import React, { useState, useEffect } from 'react';
import { NftCard } from '../components/NftCard';
import { getCollectionNFTs, Collection, NFT, NFTsResponse } from '../api/workflow';

interface CollectionDetailProps {
    collection: Collection;
    onBack: () => void;
    onNftClick?: (nft: NFT) => void;
}

export const CollectionDetail: React.FC<CollectionDetailProps> = ({
    collection,
    onBack,
    onNftClick,
}) => {
    // Handlers for NFT actions
    const handleBuyNFT = (nft: any) => {
        console.log('Buying NFT:', nft);
        // TODO: Implement buy NFT functionality
        alert(`Buy NFT: ${nft.token_name} for price: ${nft.currentListing?.price} APT`);
    };

    const handleRelistNFT = (nft: any) => {
        console.log('Relisting NFT:', nft);
        // TODO: Implement relist NFT functionality
        alert(`Relist NFT: ${nft.token_name}`);
    };

    // Defensive check for collection object
    if (!collection || typeof collection !== 'object') {
        return (
            <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
                <button
                    onClick={onBack}
                    style={{
                        padding: '8px 16px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '20px',
                    }}
                >
                    ← Back to Collections
                </button>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                    <h2>Invalid Collection Data</h2>
                    <p>The collection data is not valid. Please go back and try again.</p>
                </div>
            </div>
        );
    }
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [collectionInfo, setCollectionInfo] = useState({
        total: 0,
        count: 0,
        hasMore: false,
        skip: 0,
        limit: 50,
    });

    const fetchNFTs = async (loadMore = false) => {
        try {
            setError(null);
            if (!loadMore) setLoading(true);
            console.log('CollectionDetail: Fetching NFTs for collection:', collection.collection_id);

            const currentSkip = loadMore ? collectionInfo.skip + collectionInfo.count : 0;

            const response: NFTsResponse = await getCollectionNFTs(collection.collection_id, {
                skip: currentSkip,
                limit: collectionInfo.limit,
            });
            console.log('CollectionDetail: NFT response:', response);

            if (response.success) {
                console.log('CollectionDetail: Raw NFTs from API:', response.nfts);
                console.log('CollectionDetail: All NFTs in collection:', response.nfts?.length);

                // Show all NFTs in collection (not just listed ones)
                const allNFTs = response.nfts || [];
                setNfts(loadMore ? [...nfts, ...allNFTs] : allNFTs);

                // Update pagination info based on all NFTs
                setCollectionInfo({
                    total: response.total,
                    count: response.count,
                    hasMore: response.pagination.hasMore,
                    skip: response.pagination.skip,
                    limit: response.pagination.limit,
                });
            } else {
                throw new Error('Failed to fetch NFTs');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while fetching NFTs');
            console.error('Error fetching NFTs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNFTs();
    }, [collection.collection_id]);

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div
                style={{
                    marginBottom: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}
            >
                <button
                    onClick={onBack}
                    style={{
                        padding: '8px 16px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    ← Back to Collections
                </button>

                <div style={{ flex: 1 }}>
                    <h1
                        style={{
                            fontSize: '28px',
                            fontWeight: '700',
                            color: '#212529',
                            margin: '0 0 8px 0',
                        }}
                    >
                        {collection.collection_name}
                    </h1>
                    <p
                        style={{
                            fontSize: '16px',
                            color: '#6c757d',
                            margin: 0,
                        }}
                    >
                        Collection by {collection.creator_address.slice(0, 6)}...{collection.creator_address.slice(-4)}
                        <span style={{ marginLeft: '16px', fontSize: '14px', color: '#28a745' }}>
                            📦 {nfts.length} NFTs in collection
                        </span>
                    </p>
                </div>
            </div>

            {/* Collection Stats */}
            <div
                style={{
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '32px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#007bff',
                            marginBottom: '4px',
                        }}
                    >
                        {collectionInfo.total}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Total NFTs</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#28a745',
                            marginBottom: '4px',
                        }}
                    >
                        {nfts.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Loaded</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#6c757d',
                            marginBottom: '4px',
                        }}
                    >
                        {collection.max_supply}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Max Supply</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#6c757d',
                            marginBottom: '4px',
                        }}
                    >
                        {collection.max_supply}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Max Supply</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            background: '#e9ecef',
                            color: '#495057',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block',
                        }}
                    >
                        SYNCED
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>Status</div>
                </div>
            </div>

            {/* NFTs Grid */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <h2>Loading NFTs...</h2>
                    <p>Please wait while we fetch the NFTs in this collection.</p>
                </div>
            ) : error ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                    <h2>Error Loading NFTs</h2>
                    <p style={{ color: '#dc3545', marginBottom: '20px' }}>{error}</p>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            fetchNFTs(true);
                        }}
                        style={{
                            padding: '12px 24px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            ) : nfts.length > 0 ? (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '24px',
                        }}
                    >
                        {nfts.map((nft) => (
                            <NftCard
                                key={nft._id}
                                nft={nft}
                                onClick={onNftClick ? () => onNftClick(nft) : undefined}
                            />
                        ))}
                    </div>

                    {/* Load More Button */}
                    {collectionInfo.hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '24px' }}>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    fetchNFTs(true);
                                }}
                                disabled={loading}
                                style={{
                                    padding: '12px 32px',
                                    background: loading ? '#6c757d' : '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                }}
                            >
                                {loading ? 'Loading...' : 'Load More Listed NFTs'}
                            </button>
                        </div>
                    )}

                    {/* Stats */}
                    <div
                        style={{
                            marginTop: '32px',
                            padding: '20px',
                            background: '#e9ecef',
                            borderRadius: '8px',
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ margin: 0, color: '#495057' }}>
                            Showing {nfts.length} of {collectionInfo.total} NFTs from this collection
                        </p>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
                    <h3 style={{ color: '#6c757d', margin: '0 0 8px 0' }}>No NFTs Found</h3>
                    <p style={{ color: '#6c757d', margin: 0 }}>
                        This collection doesn't have any NFTs yet, or they haven't been synced.
                    </p>
                </div>
            )}
        </div>
    );
};

