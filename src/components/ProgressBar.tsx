import React from 'react';

interface ProgressBarProps {
    current: number;
    total: number;
    label?: string;
    showPercentage?: boolean;
    showCount?: boolean;
    color?: string;
    height?: string;
    style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    current,
    total,
    label = 'Progress',
    showPercentage = true,
    showCount = true,
    color = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)',
    height = '8px',
    style = {}
}) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div style={{ marginBottom: '16px', ...style }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
            }}>
                <span style={{
                    color: '#495057',
                    fontSize: '16px',
                    fontWeight: '600'
                }}>
                    {label}
                </span>
                <span style={{
                    color: '#6c757d',
                    fontSize: '14px'
                }}>
                    {showCount && `${current} / ${total}`}
                    {showCount && showPercentage && ' '}
                    {showPercentage && `(${percentage}%)`}
                </span>
            </div>
            <div style={{
                width: '100%',
                height: height,
                background: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: color,
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );
};
