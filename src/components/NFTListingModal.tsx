import React, { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { listNftForSale, relistNft, confirmTransaction } from "../api/user";

interface NFTListingModalProps {
    nft: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentListing?: any;
    signMessage?: any;
    walletAddress?: string;
}

export default function NFTListingModal({ nft, isOpen, onClose, onSuccess, currentListing, signMessage, walletAddress }: NFTListingModalProps) {
    const { signAndSubmitTransaction, account } = useWallet();
    const [price, setPrice] = useState<string>("");
    const [currency, setCurrency] = useState<string>("APT");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
    const [currentInstructions, setCurrentInstructions] = useState<any>(null);

    // Initialize form with current listing data when modal opens
    React.useEffect(() => {
        if (isOpen && currentListing) {
            setPrice(currentListing.price.toString());
            setCurrency("APT"); // Assuming current listings are in APT
        } else if (isOpen) {
            setPrice("");
            setCurrency("APT");
        }
    }, [isOpen, currentListing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!price || parseFloat(price) <= 0) {
            setError("Please enter a valid price");
            return;
        }

        if (!signMessage || !walletAddress) {
            setError("Wallet signing not available");
            return;
        }

        // Show confirmation dialog before signing
        setShowConfirmDialog(true);
    };

    const handleConfirmListing = async () => {
        setLoading(true);
        setError(null);
        setShowConfirmDialog(false);

        // Get NFT ID and validate
        const nftId = nft._id;
        if (!nftId) {
            throw new Error("NFT ID not found");
        }

        // 1. Call API to get transaction metadata and tracking ID
        console.log("📡 Calling API for transaction metadata...");
        const isUpdating = !!currentListing;
        const apiResponse = isUpdating
            ? await relistNft(nftId, parseFloat(price), currency)
            : await listNftForSale(nftId, parseFloat(price), currency);

        console.log("✅ Raw API Response:", apiResponse);
        console.log("🔍 API Response structure:", Object.keys(apiResponse));

        // Check API response structure based on curl examples
        if (!apiResponse.success) {
            console.error("❌ API response success field is false:", apiResponse);

            // Handle specific backend errors
            if (apiResponse.error === "NFT not found") {
                throw new Error("NFT không tồn tại hoặc không thể truy cập");
            } else if (apiResponse.error === "You are not the owner of this NFT") {
                throw new Error("Bạn không phải là chủ sở hữu của NFT này");
            } else if (apiResponse.error === "Escrow owner not configured") {
                throw new Error("Hệ thống escrow chưa được cấu hình");
            } else if (apiResponse.error === "This NFT is not currently listed for sale") {
                throw new Error("NFT này hiện không được niêm yết để bán");
            } else {
                throw new Error(apiResponse.error || "Không thể thực hiện thao tác này");
            }
        }

        if (!apiResponse.transactionMeta || !apiResponse.trackingId) {
            console.error("❌ Missing required fields in API response:", apiResponse);
            throw new Error("Invalid response from server - missing transactionMeta or trackingId");
        }

        const { transactionMeta, trackingId, instructions } = apiResponse;
        console.log("🔍 Transaction metadata:", transactionMeta);
        console.log("📋 Tracking ID:", trackingId);
        console.log("📝 Instructions:", instructions);

        // Store instructions for use in confirmation dialog
        setCurrentInstructions(instructions);

        // 2. Sign and submit transaction with wallet
        console.log(`✍️ Signing ${isUpdating ? 'price update' : 'listing'} transaction...`);

        if (!signAndSubmitTransaction) {
            console.error("❌ signAndSubmitTransaction function not available");
            throw new Error("signAndSubmitTransaction function not available");
        }

        // Debug transaction data from backend
        console.log("🔍 Transaction data from backend:", transactionMeta.transaction);
        console.log("🔍 Transaction type:", typeof transactionMeta.transaction);
        console.log("🔍 Transaction keys:", transactionMeta.transaction ? Object.keys(transactionMeta.transaction) : 'No transaction object');

        // Handle transaction data for wallet adapter (following WorkflowManager pattern)
        console.log("🔍 Transaction data from backend:", transactionMeta.transaction);

        // Extract payload from transaction data (similar to WorkflowManager)
        let payload;
        if (transactionMeta.transaction.payload) {
            payload = transactionMeta.transaction.payload;
            console.log("✅ Using payload from transaction:", payload);
        } else if (transactionMeta.transaction.function) {
            // If no payload wrapper, use transaction directly
            payload = transactionMeta.transaction;
            console.log("✅ Using transaction directly as payload:", payload);
        } else {
            console.error("❌ No payload or function found in transaction data");
            throw new Error("Invalid transaction data - missing payload or function");
        }

        // Create transaction payload in the format expected by wallet adapter
        const transactionPayload = {
            sender: walletAddress || account?.address,
            data: {
                function: payload.function,
                typeArguments: payload.typeArguments || [],
                functionArguments: payload.functionArguments || [],
            },
        };

        console.log("🔧 Wallet adapter payload format:", transactionPayload);

        // Use this formatted payload for signing
        const transactionToSign = transactionPayload;

        // Use signAndSubmitTransaction directly (it handles both signing and submitting)
        console.log("🚀 Calling signAndSubmitTransaction with:", transactionToSign);
        console.log("🔍 Transaction to submit type:", typeof transactionToSign);

        try {
            // Use signAndSubmitTransaction with the wallet adapter format
            const result = await signAndSubmitTransaction(transactionToSign);
            console.log("✅ Transaction signed and submitted successfully:", result);

            // Confirm transaction with API using tracking ID and transaction hash
            console.log("📡 Confirming transaction with API...");
            await confirmTransaction(trackingId, result.hash);
            console.log(`✅ ${isUpdating ? 'Price updated' : 'NFT listed'} successfully!`);

            // Show success message with instructions if available
            if (currentInstructions) {
                alert(`✅ ${isUpdating ? 'Price updated' : 'NFT listed'} successfully!\n\n📝 Instructions:\n${currentInstructions.message}\n\nNext step: ${currentInstructions.nextStep}`);
            } else {
                alert(`✅ ${isUpdating ? 'Price updated' : 'NFT listed'} successfully!`);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("❌ Listing error:", err);

            // Handle specific error messages
            if (err.message?.includes("User rejected") || err.message?.includes("cancelled")) {
                setError("Người dùng đã hủy giao dịch");
            } else if (err.message?.includes("NFT không tồn tại")) {
                setError("NFT không tồn tại hoặc không thể truy cập");
            } else if (err.message?.includes("không phải là chủ sở hữu")) {
                setError("Bạn không phải là chủ sở hữu của NFT này");
            } else if (err.message?.includes("escrow chưa được cấu hình")) {
                setError("Hệ thống escrow chưa được cấu hình");
            } else if (err.message?.includes("không được niêm yết")) {
                setError("NFT này hiện không được niêm yết để bán");
            } else if (err.message?.includes("No signing method available")) {
                setError("Không thể truy cập phương thức ký giao dịch");
            } else if (err.message?.includes("signAndSubmitTransaction function not available")) {
                setError("Ví không hỗ trợ ký giao dịch");
            } else {
                setError(err.message || "Không thể thực hiện thao tác này");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPrice("");
        setCurrency("APT");
        setError(null);
        setShowConfirmDialog(false);
        setCurrentInstructions(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    background: "white",
                    padding: "30px",
                    borderRadius: "15px",
                    maxWidth: "500px",
                    width: "90%",
                    maxHeight: "90vh",
                    overflow: "auto",
                }}
            >
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <h2 style={{ margin: "0 0 10px 0", color: "#333" }}>
                        {currentListing ? "🔄 Update Listing Price" : "📈 List NFT for Sale"}
                    </h2>
                    <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                        {currentListing
                            ? "Update the price for your existing listing. You will need to sign a transaction in your wallet."
                            : "Set your price and currency for this NFT. You will need to sign a transaction in your wallet to complete the listing."
                        }
                    </p>
                </div>

                {/* NFT Preview */}
                <div
                    style={{
                        background: "#f8f9fa",
                        borderRadius: "10px",
                        padding: "15px",
                        marginBottom: "20px",
                    }}
                >
                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                        <div
                            style={{
                                width: "60px",
                                height: "60px",
                                background: nft.image || nft.token_uri ? `url(${nft.image || nft.token_uri})` : "#e0e0e0",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                borderRadius: "8px",
                                flexShrink: 0,
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
                                {nft.name || nft.token_name || "Untitled NFT"}
                            </h4>
                            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                                {nft.description || "No description"}
                            </p>
                            {currentListing && (
                                <div
                                    style={{
                                        marginTop: "8px",
                                        padding: "6px 10px",
                                        background: "#fff3e0",
                                        borderRadius: "4px",
                                        border: "1px solid #ff9800",
                                        fontSize: "11px",
                                    }}
                                >
                                    💰 Currently Listed: {currentListing.price.toLocaleString()} APT
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Price Input */}
                    <div style={{ marginBottom: "20px" }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: "8px",
                                fontWeight: "bold",
                                color: "#333",
                            }}
                        >
                            Price *
                        </label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="Enter price (e.g., 1000000)"
                            min="0"
                            step="0.01"
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "2px solid #e0e0e0",
                                borderRadius: "8px",
                                fontSize: "16px",
                                boxSizing: "border-box",
                            }}
                            required
                        />
                    </div>

                    {/* Currency Select */}
                    <div style={{ marginBottom: "20px" }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: "8px",
                                fontWeight: "bold",
                                color: "#333",
                            }}
                        >
                            Currency *
                        </label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "2px solid #e0e0e0",
                                borderRadius: "8px",
                                fontSize: "16px",
                                background: "white",
                                boxSizing: "border-box",
                            }}
                            required
                        >
                            <option value="APT">APT</option>
                            <option value="USDC">USDC</option>
                            <option value="USDT">USDT</option>
                        </select>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div
                            style={{
                                background: "#ffebee",
                                color: "#c62828",
                                padding: "10px",
                                borderRadius: "5px",
                                marginBottom: "20px",
                                fontSize: "14px",
                            }}
                        >
                            ❌ {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            style={{
                                padding: "12px 20px",
                                background: "#6c757d",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: "12px 20px",
                                background: loading ? "#ccc" : "#667eea",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontSize: "14px",
                            }}
                        >
                            {loading
                                ? "⏳ Processing..."
                                : currentListing
                                    ? "🔄 Review & Update Price"
                                    : "📈 Review & List NFT"
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2000,
                    }}
                >
                    <div
                        style={{
                            background: "white",
                            padding: "30px",
                            borderRadius: "15px",
                            maxWidth: "400px",
                            width: "90%",
                            textAlign: "center",
                        }}
                    >
                        <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>
                            🔐 Confirm {currentListing ? "Price Update" : "NFT Listing"}
                        </h3>

                        <p style={{ margin: "0 0 15px 0", color: "#666", fontSize: "13px", textAlign: "center" }}>
                            {currentListing ? "This will update the listing price for your NFT" : "This will list your NFT for sale on the marketplace"}
                        </p>

                        <div
                            style={{
                                background: "#f8f9fa",
                                padding: "15px",
                                borderRadius: "10px",
                                marginBottom: "20px",
                                textAlign: "left",
                            }}
                        >
                            <p style={{ margin: "5px 0", fontSize: "14px" }}>
                                <strong>NFT:</strong> {nft.name || nft.token_name || 'Untitled NFT'}
                            </p>
                            <p style={{ margin: "5px 0", fontSize: "14px" }}>
                                <strong>New Price:</strong> {price} {currency}
                            </p>
                            {currentListing && (
                                <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>
                                    <strong>Current Price:</strong> {currentListing.price.toLocaleString()} APT
                                </p>
                            )}
                            <p style={{ margin: "5px 0", fontSize: "14px" }}>
                                <strong>Token ID:</strong> {nft._id?.slice(0, 20)}...
                            </p>
                        </div>

                        <p style={{ margin: "0 0 20px 0", color: "#666", fontSize: "14px" }}>
                            {(() => {
                                // Show instructions from backend if available, otherwise show generic message
                                if (currentInstructions) {
                                    return (
                                        <div>
                                            <strong>📋 Instructions from server:</strong><br />
                                            {currentInstructions.message}<br /><br />
                                            <strong>Next step:</strong> {currentInstructions.nextStep}<br />
                                            {currentInstructions.cancelStep && (
                                                <>
                                                    <strong>Cancel:</strong> {currentInstructions.cancelStep}
                                                </>
                                            )}
                                        </div>
                                    );
                                } else {
                                    return `You will be asked to sign a transaction with your wallet to confirm this ${currentListing ? "price update" : "listing"}. This will submit the transaction to the blockchain.`;
                                }
                            })()}
                        </p>

                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                disabled={loading}
                                style={{
                                    padding: "10px 20px",
                                    background: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    fontSize: "14px",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmListing}
                                disabled={loading}
                                style={{
                                    padding: "10px 20px",
                                    background: loading ? "#ccc" : "#667eea",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    fontSize: "14px",
                                }}
                            >
                                {loading ? "⏳ Processing..." : currentListing ? "⛓️ Sign Transaction & Update Price" : "⛓️ Sign Transaction & List NFT"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
