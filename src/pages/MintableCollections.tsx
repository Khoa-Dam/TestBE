import React, { useState, useEffect } from 'react';
import { MintableDraft } from '../api/workflow';
import { getMintableCollections } from '../api/workflow';
import { CollectionCard } from '../components/CollectionCard';

interface MintableCollectionsProps {
    onCollectionClick: (draft: MintableDraft) => void;
}

export const MintableCollections: React.FC<MintableCollectionsProps> = ({ onCollectionClick }) => {
    const [drafts, setDrafts] = useState<MintableDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        limit: 50,
        offset: 0,
        hasMore: true,
    });

    // Filter state
    const [salePhaseFilter, setSalePhaseFilter] = useState<string>('ALL');

    const fetchMintableCollections = async (loadMore = false) => {
        try {
            setError(null);
            if (!loadMore) setLoading(true);

            const response = await getMintableCollections(
                pagination.limit,
                loadMore ? pagination.offset : 0
            );

            console.log('MintableCollections: Setting drafts:', response.drafts);

            // Filter drafts based on sale phase
            let filteredDrafts = response.drafts;
            if (salePhaseFilter !== 'ALL') {
                filteredDrafts = response.drafts.filter(draft => draft.salePhase === salePhaseFilter);
            }

            setDrafts(loadMore ? [...drafts, ...filteredDrafts] : filteredDrafts);
            setPagination({
                ...pagination,
                offset: loadMore ? pagination.offset + response.drafts.length : response.drafts.length,
                hasMore: response.pagination.hasMore,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while fetching mintable collections');
            console.error('Error fetching mintable collections:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMintableCollections();
    }, [salePhaseFilter]); // Refetch when filter changes

    const handleLoadMore = () => {
        if (pagination.hasMore && !loading) {
            fetchMintableCollections(true);
        }
    };


    if (loading && drafts.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <h2>Loading Mintable Collections...</h2>
                <p>Please wait while we fetch collections available for minting.</p>
            </div>
        );
    }

    if (error && drafts.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                <h2>Error Loading Collections</h2>
                <p style={{ color: '#dc3545', marginBottom: '20px' }}>{error}</p>
                <button
                    onClick={() => fetchMintableCollections()}
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
                        🚀 Mintable Collections
                    </h1>
                    <p
                        style={{
                            fontSize: '16px',
                            color: '#6c757d',
                            margin: 0,
                        }}
                    >
                        Discover and mint NFTs from active collections
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
                    <label style={{ fontSize: '14px', color: '#495057' }}>
                        Filter by Sale Phase:
                    </label>
                    <select
                        value={salePhaseFilter}
                        onChange={(e) => setSalePhaseFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px',
                        }}
                    >
                        <option value="ALL">All Collections</option>
                        <option value="PUBLIC">🌍 Public Sale</option>
                        <option value="PRESALE">🎯 Presale</option>
                        <option value="CLOSED">🔒 Closed</option>
                    </select>
                </div>
            </div>

            {/* Collections Grid */}
            {drafts.length > 0 ? (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                            gap: '24px',
                            marginBottom: '32px',
                        }}
                    >
                        {drafts.map((draft) => (
                            <CollectionCard
                                key={draft.draft_id}
                                draft={draft}
                                onClick={onCollectionClick}
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
                    <h3 style={{ color: '#6c757d', margin: '0 0 8px 0' }}>No Mintable Collections Found</h3>
                    <p style={{ color: '#6c757d', margin: 0 }}>
                        {salePhaseFilter !== 'ALL'
                            ? `No collections found with ${salePhaseFilter.toLowerCase()} phase.`
                            : 'No collections are currently available for minting.'
                        }
                    </p>
                </div>
            )}

            {/* Stats */}
            {drafts.length > 0 && (
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
                        Showing {drafts.length} mintable collection{drafts.length !== 1 ? 's' : ''}
                        {salePhaseFilter !== 'ALL' && ` in ${salePhaseFilter.toLowerCase()} phase`}
                    </p>
                </div>
            )}
        </div>
    );
};
