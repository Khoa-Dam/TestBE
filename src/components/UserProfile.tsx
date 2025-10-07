// Example component showing how to use user APIs
import React from "react";
import { useCurrentUser, useUserOverview, useUserNfts, useAuthStatus } from "../hooks/useUser";

export default function UserProfile() {
    const { user, loading: userLoading, error: userError, refetch: refetchUser } = useCurrentUser();
    const { overview, loading: overviewLoading, error: overviewError, refetch: refetchOverview } = useUserOverview();
    const { nfts, loading: nftsLoading, error: nftsError, refetch: refetchNfts } = useUserNfts(1, 10);
    const { isAuthenticated, token } = useAuthStatus();

    if (!isAuthenticated) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>🔒 Please connect your wallet to view your profile</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>👤 My Profile</h1>

            {/* Current User Info */}
            <section style={{ marginBottom: '30px' }}>
                <h2>📋 User Information</h2>
                {userLoading ? (
                    <p>Loading user data...</p>
                ) : userError ? (
                    <div style={{ color: 'red' }}>
                        <p>Error: {userError}</p>
                        <button onClick={refetchUser}>Retry</button>
                    </div>
                ) : user ? (
                    <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
                        <pre>{JSON.stringify(user, null, 2)}</pre>
                    </div>
                ) : (
                    <p>No user data available</p>
                )}
            </section>

            {/* User Overview */}
            <section style={{ marginBottom: '30px' }}>
                <h2>📊 User Overview</h2>
                {overviewLoading ? (
                    <p>Loading overview...</p>
                ) : overviewError ? (
                    <div style={{ color: 'red' }}>
                        <p>Error: {overviewError}</p>
                        <button onClick={refetchOverview}>Retry</button>
                    </div>
                ) : overview ? (
                    <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '8px' }}>
                        <pre>{JSON.stringify(overview, null, 2)}</pre>
                    </div>
                ) : (
                    <p>No overview data available</p>
                )}
            </section>

            {/* User NFTs */}
            <section style={{ marginBottom: '30px' }}>
                <h2>🖼️ My NFTs</h2>
                {nftsLoading ? (
                    <p>Loading NFTs...</p>
                ) : nftsError ? (
                    <div style={{ color: 'red' }}>
                        <p>Error: {nftsError}</p>
                        <button onClick={() => refetchNfts(1, 10)}>Retry</button>
                    </div>
                ) : nfts ? (
                    <div style={{ background: '#fff8dc', padding: '15px', borderRadius: '8px' }}>
                        <p>Total NFTs: {nfts.total || 'N/A'}</p>
                        <p>Current Page: {nfts.page || 'N/A'}</p>
                        <p>Total Pages: {nfts.totalPages || 'N/A'}</p>
                        <div style={{ marginTop: '15px' }}>
                            <button onClick={() => refetchNfts(1, 10)}>Load Page 1</button>
                            <button onClick={() => refetchNfts(2, 10)} style={{ marginLeft: '10px' }}>Load Page 2</button>
                        </div>
                        <pre style={{ marginTop: '15px', fontSize: '12px' }}>{JSON.stringify(nfts, null, 2)}</pre>
                    </div>
                ) : (
                    <p>No NFT data available</p>
                )}
            </section>

            {/* Debug Info */}
            <section style={{ marginBottom: '30px' }}>
                <h2>🔧 Debug Information</h2>
                <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '8px', fontSize: '14px' }}>
                    <p><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Token:</strong> {token ? `${token.substring(0, 20)}...` : 'No token'}</p>
                    <p><strong>Token Length:</strong> {token ? token.length : 0} characters</p>
                </div>
            </section>
        </div>
    );
}

