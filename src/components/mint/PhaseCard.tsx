import React from 'react';
import { CountdownTimer } from './CountdownTimer';

interface PhaseCardProps {
    phase: 'presale' | 'public';
    title: string;
    description: string;
    status: 'active' | 'inactive' | 'closed';
    remainingMints: number;
    price: string;
    currency: string;
    isMinting: boolean;
    isDisabled: boolean;
    onMint: () => void;
    availableNFTs: string[];
    countdownTime?: number; // Unix timestamp for countdown
    showCountdown?: boolean;
    countdownLabel?: string; // Text to display with countdown or as fallback label
}

export const PhaseCard: React.FC<PhaseCardProps> = ({
    phase,
    title,
    description,
    status,
    remainingMints,
    price,
    currency,
    isMinting,
    isDisabled,
    onMint,
    availableNFTs,
    countdownTime,
    showCountdown = false,
    countdownLabel
}) => {
    const getPhaseColor = () => {
        return phase === 'presale' ? '#ffc107' : '#007bff';
    };



    const getPhaseBadgeColor = () => {
        return phase === 'presale' ? '#ffc107' : '#28a745';
    };

    const getPhaseBadgeText = () => {
        return phase === 'presale' ? 'PRESALE' : 'PUBLIC';
    };

    const isPhaseActive = () => {
        return status === 'active';
    };

    return (
        <div
            style={{
                background: 'white',
                border: `2px solid ${isPhaseActive() ? getPhaseColor() : '#e9ecef'}`,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                opacity: isPhaseActive() ? 1 : 0.6
            }}
        >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>


                {/* Phase Info */}
                <div style={{ flex: '1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            margin: '0',
                            color: '#212529'
                        }}>
                            {title}
                        </h4>

                        {/* Status Badges */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{
                                background: isPhaseActive() ? '#28a745' : '#6c757d',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                {isPhaseActive() ? 'Live' : 'Closed'}
                            </div>
                            <div style={{
                                background: getPhaseBadgeColor(),
                                color: phase === 'presale' ? '#212529' : 'white',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontWeight: '600'
                            }}>
                                {getPhaseBadgeText()}
                            </div>
                        </div>
                    </div>

                    <p style={{
                        fontSize: '14px',
                        color: '#6c757d',
                        margin: '0 0 12px 0',
                        lineHeight: '1.4'
                    }}>
                        {description}
                    </p>

                    {/* Countdown / Status Label */}
                    {(showCountdown && countdownTime) ? (
                        <div style={{
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {countdownLabel && (
                                <span style={{ fontSize: '12px', color: '#495057', fontWeight: 600 }}>
                                    {countdownLabel}
                                </span>
                            )}
                            <CountdownTimer
                                targetTime={countdownTime}
                                style={{ fontSize: '13px' }}
                            />
                        </div>
                    ) : (
                        countdownLabel && (
                            <div style={{
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                color: isPhaseActive() ? '#28a745' : '#6c757d',
                                fontWeight: 600
                            }}>
                                <span>{isPhaseActive() ? '🟢' : '⏰'}</span>
                                <span>{countdownLabel}</span>
                            </div>
                        )
                    )}



                    {/* Mints Left */}
                    <div style={{
                        fontSize: '14px',
                        marginBottom: '12px',
                        color: remainingMints > 0 ? '#28a745' : '#dc3545',
                        fontWeight: '500'
                    }}>
                        You have {remainingMints} mints left
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Mint Button */}
                        <button
                            onClick={onMint}
                            disabled={isDisabled || isMinting}
                            style={{
                                padding: '8px 20px',
                                background: isDisabled || isMinting
                                    ? '#6c757d'
                                    : getPhaseColor(),
                                color: isDisabled || isMinting
                                    ? '#fff'
                                    : phase === 'presale' ? '#212529' : 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: isDisabled || isMinting
                                    ? 'not-allowed' : 'pointer',
                                minWidth: '100px'
                            }}
                        >
                            {isMinting ? '⏳ Minting...' : remainingMints === 0 ? 'Sold Out' : !isPhaseActive() ? 'Not Active' : `Mint ${phase === 'presale' ? 'Presale' : 'Public'}`}
                        </button>

                        {/* Price */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#495057'
                        }}>
                            {price}
                            <span style={{ fontSize: '14px', color: '#6c757d' }}>💧</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};