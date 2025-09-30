import React from 'react';

interface CollectionBannerProps {
    name: string;
    description: string;
    bannerUri?: string;
    currentPhase: 'PRESALE' | 'PUBLIC' | 'CLOSED';
    style?: React.CSSProperties;
}

export const CollectionBanner: React.FC<CollectionBannerProps> = ({
    name,
    description,
    bannerUri,
    currentPhase,
    style = {}
}) => {
    const getPhaseConfig = () => {
        switch (currentPhase) {
            case 'PRESALE':
                return {
                    background: '#ffc107',
                    color: '#212529',
                    text: 'Presale'
                };
            case 'PUBLIC':
                return {
                    background: '#28a745',
                    color: 'white',
                    text: 'Public Sale'
                };
            case 'CLOSED':
            default:
                return {
                    background: '#6c757d',
                    color: 'white',
                    text: 'Closed'
                };
        }
    };

    const phaseConfig = getPhaseConfig();

    return (
        <div
            style={{
                width: '100%',
                maxWidth: '500px',
                height: '600px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                ...style
            }}
        >
            {bannerUri ? (
                <img
                    src={bannerUri}
                    alt={name}
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
                        fontSize: '64px',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    }}
                >
                    🎨
                </div>
            )}

            {/* Collection Title Overlay */}
            <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                padding: '40px 20px 20px',
                color: 'white',
                textAlign: 'center'
            }}>
                <h2 style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: '0 0 8px 0',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}>
                    {name}
                </h2>
                <p style={{
                    fontSize: '16px',
                    margin: '0',
                    opacity: '0.9',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                }}>
                    {description}
                </p>
            </div>

            {/* Sale Phase Badge */}
            <div
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: phaseConfig.background,
                    color: phaseConfig.color,
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                }}
            >
                {phaseConfig.text}
            </div>
        </div>
    );
};