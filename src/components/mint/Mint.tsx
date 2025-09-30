import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { CollectionDetails, getCollectionDetails } from '../../api/workflow';
import { randomMint, markMintedWithSync } from '../../api/signing';
import { CollectionBanner } from './CollectionBanner';
import { ProgressBar } from '../ProgressBar';
import { PhaseCard } from './PhaseCard';
import { aptos } from '../../lib.aptosClient';
import { NFTCollectionWorkflow } from '../../api/workflow';

interface MintProps {
    draftId: string;
    onBack: () => void;
}

export const Mint: React.FC<MintProps> = ({ draftId, onBack }) => {
    const { signAndSubmitTransaction, account } = useWallet();
    const [collectionDetails, setCollectionDetails] = useState<CollectionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mintingStates, setMintingStates] = useState<{ [key: string]: boolean }>({});
    const [showAllowlistEditor, setShowAllowlistEditor] = useState(false);
    const [allowlistInput, setAllowlistInput] = useState('');
    const [useDatabaseAllowlist, setUseDatabaseAllowlist] = useState(true);
    const [addingAllowlist, setAddingAllowlist] = useState(false);
    const [allowlistMessage, setAllowlistMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchCollectionDetails();
    }, [draftId]);

    const fetchCollectionDetails = async () => {
        try {
            setError(null);
            setLoading(true);
            console.log('Mint: Fetching collection details for draft:', draftId);

            const response = await getCollectionDetails(draftId);
            console.log('Mint: Collection details response:', response);

            setCollectionDetails(response.draft);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while fetching collection details');
            console.error('Error fetching collection details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAllowlist = async () => {
        setAllowlistMessage(null);
        if (!account?.address) {
            setAllowlistMessage('Please connect your wallet first');
            return;
        }
        if (!collectionDetails?._id) {
            setAllowlistMessage('Collection not loaded');
            return;
        }
        // Determine addresses: use DB or override from UI
        let addrs: string[] = [];
        if (useDatabaseAllowlist) {
            addrs = (collectionDetails?.config as any)?.allowlist || [];
        } else {
            const raw = allowlistInput || '';
            addrs = raw
                .split(/[\s,\n\r]+/)
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => s.toLowerCase());
        }
        if (addrs.length === 0) {
            setAllowlistMessage('Please enter at least one address');
            return;
        }

        try {
            setAddingAllowlist(true);
            const workflow = new NFTCollectionWorkflow(collectionDetails._id);

            // Wrapper signer compatible with various tx shapes
            const signer = async (tx: any) => {
                // If tx already in wallet InputTransactionData form
                if (tx && tx.data && tx.data.function) {
                    return await signAndSubmitTransaction(tx);
                }
                // If tx has payload like build response
                if (tx && tx.payload && tx.payload.function) {
                    return await signAndSubmitTransaction({
                        data: {
                            function: tx.payload.function,
                            typeArguments: tx.payload.typeArguments || [],
                            functionArguments: tx.payload.functionArguments || [],
                        },
                    });
                }
                // If tx is already flattened like from randomMint
                if (tx && tx.function) {
                    return await signAndSubmitTransaction({
                        data: {
                            function: tx.function,
                            typeArguments: tx.typeArguments || [],
                            functionArguments: tx.functionArguments || [],
                        },
                    });
                }
                throw new Error('Unsupported transaction format');
            };

            const txHash = await workflow.addAllowlist(addrs, signer, account.address);
            setAllowlistMessage(`✅ Allowlist submitted. Tx: ${txHash}`);
            setShowAllowlistEditor(false);
            setAllowlistInput('');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to add allowlist';
            setAllowlistMessage(`❌ ${msg}`);
        } finally {
            setAddingAllowlist(false);
        }
    };

    const handleMint = async (phase: 'presale' | 'public') => {
        if (!account?.address) {
            alert('Please connect your wallet first');
            return;
        }

        if (!collectionDetails) {
            alert('Collection details not loaded');
            return;
        }

        // Check if minting is allowed based on sale phase and schedule
        if (!isMintingAllowed(phase)) {
            alert(`${phase === 'presale' ? 'Presale' : 'Public'} minting is not currently available`);
            return;
        }

        // Check if there are remaining mints
        const remainingMints = getRemainingMints();
        if (remainingMints === 0) {
            alert('No more NFTs available to mint');
            return;
        }

        try {
            setMintingStates(prev => ({ ...prev, [phase]: true }));

            console.log(`🚀 Starting ${phase} mint for collection:`, collectionDetails._id);
            console.log('Payer address:', account.address);

            // Step 1: Call randomMint API to get transaction
            const mintResult = await randomMint(
                collectionDetails._id,
                account.address,
                account.address // toAddr same as payerAddr
            );

            console.log('Random mint result:', mintResult);

            if (!mintResult || !mintResult.transaction) {
                throw new Error('No transaction returned from random mint API');
            }

            if (mintResult.tokenIndex === undefined) {
                throw new Error('No token index returned from random mint API');
            }

            // Step 2: Sign and submit transaction using wallet
            console.log('📝 Signing transaction...');
            console.log('Transaction object:', mintResult.transaction);

            // Parse transaction if it's a string
            let transactionToSign = mintResult.transaction;
            if (typeof transactionToSign === 'string') {
                try {
                    transactionToSign = JSON.parse(transactionToSign);
                } catch (e) {
                    console.error('Failed to parse transaction string:', e);
                    throw new Error('Invalid transaction format');
                }
            }

            // Format transaction for wallet adapter
            if (!transactionToSign.payload) {
                throw new Error('Transaction payload is missing');
            }

            const transactionData = {
                data: {
                    function: transactionToSign.payload.function,
                    typeArguments: transactionToSign.payload.typeArguments || [],
                    functionArguments: transactionToSign.payload.functionArguments || []
                }
            };

            console.log('Formatted transaction data:', transactionData);

            const response = await signAndSubmitTransaction(transactionData);

            console.log('Transaction submitted:', response);

            // Step 3: Wait for on-chain confirmation before marking minted
            try {
                console.log('⏳ Waiting for on-chain confirmation...');
                const txResult: any = await aptos.waitForTransaction({ transactionHash: response.hash });
                if (txResult && txResult.success === false) {
                    throw new Error(txResult.vm_status || 'Transaction failed on-chain');
                }
                console.log('✅ Transaction confirmed on-chain:', txResult);
            } catch (confirmErr) {
                console.error('❌ Transaction failed to confirm:', confirmErr);
                throw new Error(confirmErr instanceof Error ? confirmErr.message : 'Transaction failed');
            }

            // Step 4: Mark as minted with sync
            console.log('🔄 Marking as minted and syncing...');
            try {
                await markMintedWithSync(
                    collectionDetails._id,
                    mintResult.tokenIndex,
                    mintResult.metadata?.name || `NFT #${mintResult.tokenIndex}`,
                    response.hash
                );
                console.log('✅ Successfully marked as minted and synced');
            } catch (syncError) {
                console.warn('⚠️ Failed to mark as minted, but transaction was successful:', syncError);
                // Don't throw error here as the transaction was successful
            }

            // Step 5: Update local state
            const newMintedTokens = [...(collectionDetails.mintedTokenIndexes || []), mintResult.tokenIndex];
            setCollectionDetails(prev => prev ? {
                ...prev,
                mintedTokenIndexes: newMintedTokens
            } : null);

            // Step 6: Show success message
            const price = phase === 'presale' ?
                (parseInt(collectionDetails.config?.pricing?.presale || '0') / Math.pow(10, 8)).toFixed(2) :
                (parseInt(collectionDetails.config?.pricing?.public || '0') / Math.pow(10, 8)).toFixed(2);

            const nftName = mintResult.metadata?.name || `NFT #${mintResult.tokenIndex}`;
            alert(`🎉 Successfully minted "${nftName}" from ${phase} phase!\n\n` +
                `Price: ${price} ${collectionDetails.config?.pricing?.currency || 'APT'}\n` +
                `Transaction: ${response.hash}\n` +
                `Token Index: ${mintResult.tokenIndex}`);

        } catch (err) {
            console.error('Error minting NFT:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to mint NFT. Please try again.';
            alert(`❌ Minting failed: ${errorMessage}`);
        } finally {
            setMintingStates(prev => ({ ...prev, [phase]: false }));
        }
    };

    const isMintingAllowed = (phase: 'presale' | 'public') => {
        if (!collectionDetails?.config) return false;

        const { setPhaseManual, phaseManual, freezeAfter, schedule } = collectionDetails.config;

        // If using manual phase control
        if (setPhaseManual) {
            if (phase === 'presale') {
                return phaseManual === 1; // Only presale is active
            } else {
                return phaseManual === 2; // Only public is active
            }
        }

        // If using schedule-based control (freezeAfter = true)
        if (freezeAfter && schedule) {
            const now = Date.now();
            const presaleStartMs = schedule.presaleStart ? schedule.presaleStart * 1000 : 0;
            const publicStartMs = schedule.publicStart ? schedule.publicStart * 1000 : 0;
            const saleEndMsRaw = schedule.saleEnd ? schedule.saleEnd * 1000 : 0;
            // If saleEnd is missing or <= publicStart, treat as no end (Infinity)
            const saleEndMs = !saleEndMsRaw || saleEndMsRaw <= publicStartMs ? Infinity : saleEndMsRaw;

            if (phase === 'presale') {
                return !!presaleStartMs && now >= presaleStartMs && now < publicStartMs;
            } else {
                return !!publicStartMs && now >= publicStartMs && now < saleEndMs;
            }
        }

        // Default: only public is available
        return phase === 'public';
    };

    const getRemainingMints = () => {
        if (!collectionDetails?.config) return 0;

        // Calculate remaining mints based on total supply and already minted
        const totalSupply = collectionDetails.config.supply?.max || 0;
        const alreadyMinted = collectionDetails.mintedTokenIndexes?.length || 0;
        const remaining = totalSupply - alreadyMinted;

        // Return remaining mints for the entire collection
        return Math.max(0, remaining);
    };

    const getAvailableNFTs = () => {
        if (!collectionDetails?.manifest) return [];

        return collectionDetails.manifest.filter((_, index) =>
            !collectionDetails.mintedTokenIndexes?.includes(index)
        );
    };

    const getCurrentPhase = () => {
        if (!collectionDetails?.config) return 'CLOSED';

        const { setPhaseManual, phaseManual, freezeAfter, schedule } = collectionDetails.config;

        // If using manual phase control
        if (setPhaseManual) {
            if (phaseManual === 1) return 'PRESALE';
            if (phaseManual === 2) return 'PUBLIC';
            return 'CLOSED';
        }

        // If using schedule-based control (freezeAfter = true)
        if (freezeAfter && schedule) {
            const now = Date.now();
            const presaleStartMs = schedule.presaleStart ? schedule.presaleStart * 1000 : 0;
            const publicStartMs = schedule.publicStart ? schedule.publicStart * 1000 : 0;
            const saleEndMsRaw = schedule.saleEnd ? schedule.saleEnd * 1000 : 0;
            const saleEndMs = !saleEndMsRaw || saleEndMsRaw <= publicStartMs ? Infinity : saleEndMsRaw;

            if (presaleStartMs && now >= presaleStartMs && now < publicStartMs) {
                return 'PRESALE';
            }
            if (publicStartMs && now >= publicStartMs && now < saleEndMs) {
                return 'PUBLIC';
            }
        }

        return 'CLOSED';
    };

    const getPhaseStatus = (phase: 'presale' | 'public'): 'active' | 'inactive' | 'closed' => {
        if (!collectionDetails?.config) return 'closed';

        const { setPhaseManual, phaseManual, freezeAfter, schedule } = collectionDetails.config;

        // If using manual phase control
        if (setPhaseManual) {
            if (phase === 'presale') {
                return phaseManual === 1 ? 'active' : 'inactive';
            } else {
                return phaseManual === 2 ? 'active' : 'inactive';
            }
        }

        // If using schedule-based control (freezeAfter = true)
        if (freezeAfter && schedule) {
            const now = Date.now();
            const presaleStartMs = schedule.presaleStart ? schedule.presaleStart * 1000 : 0;
            const publicStartMs = schedule.publicStart ? schedule.publicStart * 1000 : 0;
            const saleEndMsRaw = schedule.saleEnd ? schedule.saleEnd * 1000 : 0;
            const saleEndMs = !saleEndMsRaw || saleEndMsRaw <= publicStartMs ? Infinity : saleEndMsRaw;

            if (phase === 'presale') {
                if (presaleStartMs && now >= presaleStartMs && now < publicStartMs) {
                    return 'active';
                }
                return 'inactive';
            } else {
                if (publicStartMs && now >= publicStartMs && now < saleEndMs) {
                    return 'active';
                }
                return 'inactive';
            }
        }

        // Default: only public is available
        return phase === 'public' ? 'active' : 'inactive';
    };

    const getCountdownTime = (phase: 'presale' | 'public') => {
        console.log('🔍 getCountdownTime called for phase:', phase);
        console.log('🔍 collectionDetails?.config?.schedule:', collectionDetails?.config?.schedule);

        // Show countdown whenever schedule exists
        if (!collectionDetails?.config?.schedule) {
            console.log('❌ No schedule, returning undefined');
            return undefined;
        }

        const { schedule } = collectionDetails.config;
        const now = Date.now();

        console.log('🔍 Current time:', new Date(now).toLocaleString());
        console.log('🔍 Schedule:', schedule);

        // Convert Unix timestamps (seconds) to milliseconds
        const presaleStartMs = schedule.presaleStart ? schedule.presaleStart * 1000 : 0;
        const publicStartMs = schedule.publicStart ? schedule.publicStart * 1000 : 0;
        const saleEndMs = schedule.saleEnd ? schedule.saleEnd * 1000 : 0;

        console.log('🔍 Converted times:');
        console.log('  presaleStartMs:', new Date(presaleStartMs).toLocaleString());
        console.log('  publicStartMs:', new Date(publicStartMs).toLocaleString());
        console.log('  saleEndMs:', new Date(saleEndMs).toLocaleString());

        if (phase === 'presale') {
            // Show countdown to presale start if not started yet
            if (presaleStartMs && now < presaleStartMs) return presaleStartMs;
            // Show countdown to public start if presale is active
            if (publicStartMs && now >= presaleStartMs && now < publicStartMs) return publicStartMs;
        } else {
            // Show countdown to public start if not started yet
            if (publicStartMs && now < publicStartMs) return publicStartMs;
            // Show countdown to sale end if public is active
            if (saleEndMs && now >= publicStartMs && now < saleEndMs) return saleEndMs;
        }

        console.log('❌ No countdown time found for phase:', phase);
        return undefined;
    };

    const shouldShowCountdown = (phase: 'presale' | 'public') => {
        console.log('🔍 shouldShowCountdown called for phase:', phase);
        // Do not depend on freezeAfter; only require schedule
        if (!collectionDetails?.config?.schedule) {
            console.log('❌ No schedule, returning false');
            return false;
        }

        const countdownTime = getCountdownTime(phase);
        const shouldShow = countdownTime !== undefined;
        console.log('🔍 countdownTime:', countdownTime);
        console.log('🔍 shouldShow:', shouldShow);
        return shouldShow;
    };

    const getCountdownLabel = (phase: 'presale' | 'public') => {
        if (!collectionDetails?.config?.schedule) return undefined;
        const { schedule } = collectionDetails.config;
        const now = Date.now();
        const presaleStartMs = schedule.presaleStart ? schedule.presaleStart * 1000 : 0;
        const publicStartMs = schedule.publicStart ? schedule.publicStart * 1000 : 0;
        const saleEndMs = schedule.saleEnd ? schedule.saleEnd * 1000 : 0;

        if (phase === 'presale') {
            if (presaleStartMs && now < presaleStartMs) return 'Presale starts in';
            if (publicStartMs && now >= presaleStartMs && now < publicStartMs) return 'Public starts in';
            if (saleEndMs && now >= publicStartMs && now < saleEndMs) return 'Sale ends in';
            if (saleEndMs && now >= saleEndMs) return 'Sale ended';
        } else {
            if (publicStartMs && now < publicStartMs) return 'Public starts in';
            if (saleEndMs && now >= publicStartMs && now < saleEndMs) return 'Sale ends in';
            if (saleEndMs && now >= saleEndMs) return 'Sale ended';
        }
        return undefined;
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            }}>
                <div style={{ fontSize: '18px' }}>⏳ Loading collection details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', marginBottom: '16px' }}>❌ {error}</div>
                    <button
                        onClick={() => {
                            setError(null);
                            fetchCollectionDetails();
                        }}
                        style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!collectionDetails) {
        return null;
    }

    const currentPhase = getCurrentPhase();
    const remainingMints = getRemainingMints();
    const presaleStatus = getPhaseStatus('presale');
    const publicStatus = getPhaseStatus('public');

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            padding: '0'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 24px',
                background: 'rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)'
            }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginRight: '12px',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    ← Back to Collections
                </button>
                <h1 style={{
                    margin: '0',
                    fontSize: '28px',
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                    🚀 Mint Collection
                </h1>
            </div>

            <div style={{
                display: 'flex',
                minHeight: 'calc(100vh - 80px)',
                gap: '0'
            }}>
                {/* Left Side - Collection Banner */}
                <div style={{
                    flex: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    position: 'relative'
                }}>
                    <CollectionBanner
                        name={collectionDetails.name}
                        description={collectionDetails.desc}
                        bannerUri={collectionDetails.collectionUri}
                        currentPhase={currentPhase}
                    />
                </div>

                {/* Right Side - Minting Details */}
                <div style={{
                    flex: '1',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    padding: '40px',
                    overflowY: 'auto'
                }}>
                    {/* Collection Title */}
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        margin: '0 0 16px 0',
                        color: '#212529'
                    }}>
                        {collectionDetails.name}
                    </h1>

                    {/* Progress Bar */}
                    <ProgressBar
                        current={collectionDetails.mintedTokenIndexes?.length || 0}
                        total={collectionDetails.config?.supply?.max || 0}
                        label="Minting Progress"
                        style={{ marginBottom: '32px' }}
                    />

                    {/* Minting Phases */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            margin: '0 0 20px 0',
                            color: '#212529'
                        }}>
                            Minting Phases
                        </h3>

                        {Boolean(collectionDetails.config?.pricing?.presale && collectionDetails.config?.pricing?.presale !== '0') && (
                            <div style={{
                                marginBottom: '16px',
                                background: '#fff3cd',
                                border: '1px solid #ffeeba',
                                color: '#856404',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                lineHeight: 1.4
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span>⚠️ Presale yêu cầu allowlist. Hãy thêm allowlist trước khi mở presale.</span>
                                    <button
                                        onClick={() => setShowAllowlistEditor(v => !v)}
                                        style={{
                                            padding: '6px 10px',
                                            background: '#856404',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        {showAllowlistEditor ? 'Close' : 'Add Allowlist'}
                                    </button>
                                </div>
                                {showAllowlistEditor && (
                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                            <input
                                                type="checkbox"
                                                checked={useDatabaseAllowlist}
                                                onChange={(e) => setUseDatabaseAllowlist(e.target.checked)}
                                            />
                                            <span>Sử dụng danh sách allowlist đã lưu trong database</span>
                                        </label>
                                        {!useDatabaseAllowlist && (
                                            <textarea
                                                value={allowlistInput}
                                                onChange={(e) => setAllowlistInput(e.target.value)}
                                                placeholder="Paste wallet addresses (comma or newline separated)"
                                                style={{ width: '100%', minHeight: '90px', padding: '8px', borderRadius: '4px', border: '1px solid #ffe8a1', fontSize: '12px' }}
                                            />
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={handleAddAllowlist}
                                                disabled={addingAllowlist}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: addingAllowlist ? '#b08b2a' : '#a07800',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: addingAllowlist ? 'not-allowed' : 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {addingAllowlist ? 'Submitting...' : 'Submit Allowlist Tx'}
                                            </button>
                                            {allowlistMessage && (
                                                <span style={{ fontSize: '12px' }}>{allowlistMessage}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Presale Phase */}
                            <PhaseCard
                                phase="presale"
                                title="Presale Phase"
                                description="Early access minting with special pricing"
                                status={presaleStatus}
                                remainingMints={remainingMints}
                                price={(parseInt(collectionDetails.config?.pricing?.presale || '0') / Math.pow(10, 8)).toFixed(2)}
                                currency={collectionDetails.config?.pricing?.currency || 'APT'}
                                isMinting={mintingStates.presale}
                                isDisabled={!account?.address || remainingMints === 0 || presaleStatus !== 'active'}
                                onMint={() => handleMint('presale')}
                                availableNFTs={getAvailableNFTs().map(nft => nft.name)}
                                countdownTime={getCountdownTime('presale')}
                                showCountdown={shouldShowCountdown('presale')}
                                countdownLabel={getCountdownLabel('presale')}
                            />

                            {/* Public Phase */}
                            <PhaseCard
                                phase="public"
                                title="Public Phase"
                                description="Open to everyone with standard pricing"
                                status={publicStatus}
                                remainingMints={remainingMints}
                                price={(parseInt(collectionDetails.config?.pricing?.public || '0') / Math.pow(10, 8)).toFixed(2)}
                                currency={collectionDetails.config?.pricing?.currency || 'APT'}
                                isMinting={mintingStates.public}
                                isDisabled={!account?.address || remainingMints === 0 || publicStatus !== 'active'}
                                onMint={() => handleMint('public')}
                                availableNFTs={getAvailableNFTs().map(nft => nft.name)}
                                countdownTime={getCountdownTime('public')}
                                showCountdown={shouldShowCountdown('public')}
                                countdownLabel={getCountdownLabel('public')}
                            />
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div style={{
                        background: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#6c757d'
                    }}>
                        <div style={{ marginBottom: '8px' }}>
                            <strong>📋 Minting Info:</strong>
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                            • Current Phase: <span style={{ color: '#212529', fontWeight: '500' }}>{currentPhase === 'PRESALE' ? 'Presale' : currentPhase === 'PUBLIC' ? 'Public Sale' : 'Closed'}</span>
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                            • Presale Price: <span style={{ color: '#212529', fontWeight: '500' }}>{(parseInt(collectionDetails.config?.pricing?.presale || '0') / Math.pow(10, 8)).toFixed(2)} {collectionDetails.config?.pricing?.currency || 'APT'}</span>
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                            • Public Price: <span style={{ color: '#212529', fontWeight: '500' }}>{(parseInt(collectionDetails.config?.pricing?.public || '0') / Math.pow(10, 8)).toFixed(2)} {collectionDetails.config?.pricing?.currency || 'APT'}</span>
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                            • Per Wallet Cap: <span style={{ color: '#212529', fontWeight: '500' }}>{collectionDetails.config?.supply?.perWalletCap || 'N/A'}</span>
                        </div>
                        <div>
                            • Total Supply: <span style={{ color: '#212529', fontWeight: '500' }}>{collectionDetails.config?.supply?.max || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};