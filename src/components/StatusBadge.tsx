import React from 'react';

interface StatusBadgeProps {
    status: 'active' | 'inactive' | 'live' | 'closed';
    text?: string;
    size?: 'small' | 'medium' | 'large';
    style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    text,
    size = 'medium',
    style = {}
}) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'active':
            case 'live':
                return {
                    background: '#28a745',
                    color: 'white',
                    text: text || 'Live'
                };
            case 'inactive':
            case 'closed':
                return {
                    background: '#6c757d',
                    color: 'white',
                    text: text || 'Closed'
                };
            default:
                return {
                    background: '#6c757d',
                    color: 'white',
                    text: text || 'Unknown'
                };
        }
    };

    const getSizeConfig = () => {
        switch (size) {
            case 'small':
                return {
                    padding: '2px 8px',
                    fontSize: '10px',
                    borderRadius: '8px'
                };
            case 'large':
                return {
                    padding: '6px 16px',
                    fontSize: '14px',
                    borderRadius: '16px'
                };
            default: // medium
                return {
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '12px'
                };
        }
    };

    const statusConfig = getStatusConfig();
    const sizeConfig = getSizeConfig();

    return (
        <div
            style={{
                background: statusConfig.background,
                color: statusConfig.color,
                padding: sizeConfig.padding,
                borderRadius: sizeConfig.borderRadius,
                fontSize: sizeConfig.fontSize,
                fontWeight: '600',
                display: 'inline-block',
                textAlign: 'center',
                ...style
            }}
        >
            {statusConfig.text}
        </div>
    );
};
