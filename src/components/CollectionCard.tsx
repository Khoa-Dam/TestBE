import React from 'react';
import { Collection } from '../api/workflow';

interface CollectionCardProps {
    collection: Collection;
    onClick: () => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
    collection,
    onClick
}) => {
    // Defensive checks
    if (!collection || typeof collection !== 'object') {
        return (
            <div style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                color: '#6c757d'
            }}>
                Invalid Collection
            </div>
        );
    }

    const nftCount = collection.total_minted_v2 || 0;

    return (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#007bff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,123,255,0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
        >
            {/* Collection Image Placeholder */}
            <div
                style={{
                    width: '100%',
                    height: '200px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
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
                    🎨
                </div>
                {collection.uri && (
                    <img
                        src={collection.uri}
                        alt={collection.collection_name}
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
                )}
            </div>

            {/* Collection Info */}
            <div>
                <h3
                    style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 8px 0',
                        color: '#212529',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {collection.collection_name}
                </h3>

                <p
                    style={{
                        fontSize: '14px',
                        color: '#6c757d',
                        margin: '0 0 8px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    by {collection.creator_address.slice(0, 6)}...{collection.creator_address.slice(-4)}
                </p>

                {/* Description */}
                {collection.description && (
                    <p
                        style={{
                            fontSize: '12px',
                            color: '#8e9297',
                            margin: '0 0 8px 0',
                            lineHeight: '1.3',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {collection.description}
                    </p>
                )}

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '14px',
                    }}
                >
                    <span style={{ color: '#6c757d' }}>
                        {nftCount} NFT{nftCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: '#007bff', fontWeight: '500' }}>
                        Max: {collection.max_supply}
                    </span>
                </div>

                {/* Draft Collection Badge */}
                {collection.is_draft_collection && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: '#28a745',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '600',
                        }}
                    >
                        DRAFT
                    </div>
                )}
            </div>
        </div>
    );
};

