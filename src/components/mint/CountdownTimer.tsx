import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
    targetTime: number; // Unix timestamp in milliseconds
    onComplete?: () => void;
    style?: React.CSSProperties;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
    targetTime,
    onComplete,
    style = {}
}) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = Date.now();
            const difference = targetTime - now;

            if (difference <= 0) {
                setIsExpired(true);
                if (onComplete) {
                    onComplete();
                }
                return { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            return { days, hours, minutes, seconds };
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Initial calculation
        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, [targetTime, onComplete]);

    if (isExpired) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#28a745',
                fontWeight: '600',
                ...style
            }}>
                <span>🟢</span>
                <span>Live Now!</span>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#6c757d',
            ...style
        }}>
            <span>⏰</span>
            <div style={{ display: 'flex', gap: '4px' }}>
                {timeLeft.days > 0 && (
                    <div style={{
                        background: '#f8f9fa',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        minWidth: '20px',
                        textAlign: 'center',
                        fontWeight: '600'
                    }}>
                        {timeLeft.days}d
                    </div>
                )}
                <div style={{
                    background: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    minWidth: '20px',
                    textAlign: 'center',
                    fontWeight: '600'
                }}>
                    {timeLeft.hours.toString().padStart(2, '0')}h
                </div>
                <div style={{
                    background: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    minWidth: '20px',
                    textAlign: 'center',
                    fontWeight: '600'
                }}>
                    {timeLeft.minutes.toString().padStart(2, '0')}m
                </div>
                <div style={{
                    background: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    minWidth: '20px',
                    textAlign: 'center',
                    fontWeight: '600'
                }}>
                    {timeLeft.seconds.toString().padStart(2, '0')}s
                </div>
            </div>
        </div>
    );
};
