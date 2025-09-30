import React, { useState, useEffect } from 'react';
import { CountdownTimer } from './CountdownTimer';

export const CountdownTest: React.FC = () => {
    const [testTime, setTestTime] = useState<number>(Date.now() + 30000); // 30 seconds from now

    useEffect(() => {
        // Update test time every 5 seconds to test different scenarios
        const interval = setInterval(() => {
            setTestTime(Date.now() + Math.random() * 60000 + 10000); // 10-70 seconds from now
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            padding: '20px',
            background: 'white',
            borderRadius: '8px',
            margin: '20px',
            border: '1px solid #e9ecef'
        }}>
            <h3>Countdown Timer Test</h3>
            <p>Target time: {new Date(testTime).toLocaleString()}</p>
            <p>Current time: {new Date().toLocaleString()}</p>

            <div style={{ marginTop: '20px' }}>
                <CountdownTimer
                    targetTime={testTime}
                    onComplete={() => console.log('Countdown completed!')}
                />
            </div>

            <div style={{ marginTop: '20px' }}>
                <button
                    onClick={() => setTestTime(Date.now() + 10000)}
                    style={{
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Set 10 seconds from now
                </button>
            </div>
        </div>
    );
};
