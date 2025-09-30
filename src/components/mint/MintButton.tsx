import React from 'react';

interface MintButtonProps {
    phase: 'presale' | 'public';
    isActive: boolean;
    isMinting: boolean;
    remainingMints: number;
    onMint: () => void;
    disabled?: boolean;
    style?: React.CSSProperties;
}

export const MintButton: React.FC<MintButtonProps> = ({
    phase,
    isActive,
    isMinting,
    remainingMints,
    onMint,
    disabled = false,
    style = {}
}) => {
    const getButtonConfig = () => {
        const isDisabled = disabled || !isActive || remainingMints === 0 || isMinting;

        let background = '#6c757d';
        let color = '#fff';
        let text = 'Not Available';

        if (isMinting) {
            text = '⏳ Minting...';
        } else if (remainingMints === 0) {
            text = 'Sold Out';
        } else if (!isActive) {
            text = 'Not Active';
        } else {
            text = `Mint ${phase === 'presale' ? 'Presale' : 'Public'}`;
            background = phase === 'presale' ? '#ffc107' : '#007bff';
            color = phase === 'presale' ? '#212529' : 'white';
        }

        return {
            background,
            color,
            text,
            isDisabled
        };
    };

    const config = getButtonConfig();

    return (
        <button
            onClick={onMint}
            disabled={config.isDisabled}
            style={{
                padding: '8px 20px',
                background: config.background,
                color: config.color,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: config.isDisabled ? 'not-allowed' : 'pointer',
                minWidth: '100px',
                transition: 'all 0.2s ease',
                ...style
            }}
            onMouseEnter={(e) => {
                if (!config.isDisabled) {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }
            }}
            onMouseLeave={(e) => {
                if (!config.isDisabled) {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                }
            }}
        >
            {config.text}
        </button>
    );
};