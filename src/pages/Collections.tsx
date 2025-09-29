import React, { useState, useEffect } from 'react';
import { CollectionCard } from '../components/CollectionCard';
import { getCollections, Collection, CollectionsResponse } from '../api/workflow';

interface CollectionsProps {
    onCollectionClick: (collection: Collection) => void;
}

export const Collections: React.FC<CollectionsProps> = ({ onCollectionClick }) => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        limit: 50,
        offset: 0,
        hasMore: true,
    });

    // Filter state
    const [showOnlyDrafts, setShowOnlyDrafts] = useState(false);

    const fetchCollections = async (loadMore = false) => {
        try {
            setError(null);
            if (!loadMore) setLoading(true);

            const response: CollectionsResponse = await getCollections(
                pagination.limit,
                loadMore ? pagination.offset : 0
            );

            console.log('Collections: Response received:', response);

            if (response.success) {
                console.log('Collections: Setting collections:', response.collections);

                // Filter collections based on draft status
                const filteredCollections = showOnlyDrafts
                    ? response.collections.filter(collection => collection.is_draft_collection)
                    : response.collections;

                console.log('Collections: Total from API:', response.collections.length);
                console.log('Collections: Filtered count:', filteredCollections.length);
                console.log('Collections: Show only drafts:', showOnlyDrafts);
                console.log('Collections: All collections:', response.collections.map(c => ({
                    id: c.collection_id,
                    name: c.collection_name,
                    isDraft: c.is_draft_collection
                })));

                setCollections(loadMore ? [...collections, ...filteredCollections] : filteredCollections);
                setPagination({
                    ...pagination,
                    offset: loadMore ? pagination.offset + response.collections.length : response.collections.length,
                    hasMore: response.pagination.hasMore,
                });
            } else {
                throw new Error('Failed to fetch collections');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while fetching collections');
            console.error('Error fetching collections:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const handleLoadMore = () => {
        if (pagination.hasMore && !loading) {
            fetchCollections(true);
        }
    };

    if (loading && collections.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <h2>Loading Collections...</h2>
                <p>Please wait while we fetch the latest NFT collections.</p>
            </div>
        );
    }

    if (error && collections.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                <h2>Error Loading Collections</h2>
                <p style={{ color: '#dc3545', marginBottom: '20px' }}>{error}</p>
                <button
                    onClick={() => fetchCollections()}
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
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div
                style={{
                    marginBottom: '32px',
                }}
            >
                <div
                    style={{
                        textAlign: 'center',
                        marginBottom: '24px',
                    }}
                >
                    <h1
                        style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            color: '#212529',
                            margin: '0 0 8px 0',
                        }}
                    >
                        🎨 NFT Collections
                    </h1>
                    <p
                        style={{
                            fontSize: '16px',
                            color: '#6c757d',
                            margin: 0,
                        }}
                    >
                        Discover and explore amazing NFT collections on Aptos
                    </p>
                </div>

                {/* Filter Controls */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '16px',
                    }}
                >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            checked={showOnlyDrafts}
                            onChange={(e) => {
                                setShowOnlyDrafts(e.target.checked);
                                // Reset collections when filter changes
                                setCollections([]);
                                setPagination({ ...pagination, offset: 0 });
                            }}
                        />
                        <span style={{ fontSize: '14px', color: '#495057' }}>
                            Show only Draft Collections
                        </span>
                    </label>
                </div>
            </div>

            {/* Collections Grid */}
            {collections.length > 0 ? (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '24px',
                            marginBottom: '32px',
                        }}
                    >
                        {collections
                            .filter(collection => collection && collection.collection_id)
                            .map((collection) => (
                                <CollectionCard
                                    key={collection.collection_id}
                                    collection={collection}
                                    onClick={() => onCollectionClick(collection)}
                                />
                            ))}
                    </div>

                    {/* Load More Button */}
                    {pagination.hasMore && (
                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={handleLoadMore}
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
                                    transition: 'background-color 0.2s',
                                }}
                            >
                                {loading ? 'Loading...' : 'Load More Collections'}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
                    <h3 style={{ color: '#6c757d', margin: '0 0 8px 0' }}>No Collections Found</h3>
                    <p style={{ color: '#6c757d', margin: 0 }}>
                        No collections are currently available. Please check back later.
                    </p>
                </div>
            )}

            {/* Stats */}
            {collections.length > 0 && (
                <div
                    style={{
                        marginTop: '32px',
                        padding: '20px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        textAlign: 'center',
                    }}
                >
                    <p style={{ margin: 0, color: '#6c757d' }}>
                        Showing {collections.length} {showOnlyDrafts ? 'draft ' : ''}collection{collections.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
};

