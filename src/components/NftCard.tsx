import React from 'react';
import { NFT } from '../api/workflow';

interface NftCardProps {
    nft: NFT;
    onClick?: () => void;
}

export const NftCard: React.FC<NftCardProps> = ({ nft, onClick }) => {
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

  // Defensive checks for required properties
  if (!nft._id || !nft.token_name || !nft.image_uri) {
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
                {nft.image_uri && (
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
                            {nft.attributes.slice(0, 3).map((attr, index) => (
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
            </div>
        </div>
    );
};

