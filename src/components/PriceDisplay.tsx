import React from 'react';

interface PriceDisplayProps {
    price: string | number;
    currency?: string;
    showIcon?: boolean;
    size?: 'small' | 'medium' | 'large';
    style?: React.CSSProperties;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
    price,
    currency = 'APT',
    showIcon = true,
    size = 'medium',
    style = {}
}) => {
    const getSizeConfig = () => {
        switch (size) {
            case 'small':
                return {
                    fontSize: '12px',
                    iconSize: '10px'
                };
            case 'large':
                return {
                    fontSize: '20px',
                    iconSize: '18px'
                };
            default: // medium
                return {
                    fontSize: '16px',
                    iconSize: '14px'
                };
        }
    };

    const sizeConfig = getSizeConfig();
    const formattedPrice = typeof price === 'number' ? price.toFixed(2) : price;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: sizeConfig.fontSize,
                fontWeight: '600',
                color: '#495057',
                ...style
            }}
        >
            {formattedPrice}
            <span style={{ 
                fontSize: sizeConfig.iconSize, 
                color: '#6c757d' 
            }}>
                {showIcon ? '💧' : currency}
            </span>
        </div>
    );
};
