import React from 'react';
import { Collection } from '../api/workflow';

interface CollectionCardProps {
    collection: Collection;
    onClick: () => void;
    style?: React.CSSProperties;
}

export const CollectionCardOld: React.FC<CollectionCardProps> = ({
    collection,
    onClick,
    style = {}
}) => {
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
                ...style
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
            {/* Collection Image */}
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
                {collection.uri ? (
                    <img
                        src={collection.uri}
                        alt={collection.collection_name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
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
                        margin: '0 0 12px 0',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {collection.description || 'No description available'}
                </p>

                {/* Stats */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '14px',
                    }}
                >
                    <span style={{ color: '#28a745', fontWeight: '500' }}>
                        {collection.total_minted_v2 || 0} Minted
                    </span>
                    <span style={{ color: '#6c757d' }}>
                        ID: {collection.collection_id.slice(0, 8)}...
                    </span>
                </div>
            </div>
        </div>
    );
};
