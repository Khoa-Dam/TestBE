// Simple profile component - shows wallet address and user's NFTs
import React, { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useUserNfts } from "../hooks/useUser";
import { shortAddr } from "../lib.readable";
import { aptos } from "../lib.aptosClient";
import NFTListingModal from "./NFTListingModal";
import { cancelNftListing, confirmTransaction } from "../api/user";

interface MyProfileProps {
  onBack?: () => void;
}

export default function MyProfile({ onBack }: MyProfileProps) {
  const { account, connected, signMessage, signAndSubmitTransaction } = useWallet();
  const { nfts, loading, error, refetch } = useUserNfts(1, 12); // Load 12 NFTs per page

  // Local state for cancel listing operations
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Modal state
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [selectedNftForListing, setSelectedNftForListing] = useState<any>(null);

  // Modal handlers
  const handleOpenListingModal = (nft: any) => {
    setSelectedNftForListing(nft);
    setIsListingModalOpen(true);
  };

  // Check if NFT is currently listed for sale.
  // Priority: use is_listed, listed_by, listed_price, listed_at if present; fallback to history.
  const getCurrentListing = (nft: any) => {
    if (!nft.history || !Array.isArray(nft.history)) {
      // No history available; rely on top-level fields if present
      if (nft.is_listed && nft.listed_price != null) {
        const price = typeof nft.listed_price === 'string' ? parseFloat(nft.listed_price) : nft.listed_price;
        return {
          transaction_type: 'list',
          price,
          timestamp: nft.listed_at,
          from_address: nft.listed_by,
        };
      }
      return null;
    }

    // If top-level listed flags indicate listed, use them directly
    if (nft.is_listed && nft.listed_price != null) {
      const price = typeof nft.listed_price === 'string' ? parseFloat(nft.listed_price) : nft.listed_price;
      return {
        transaction_type: 'list',
        price,
        timestamp: nft.listed_at,
        from_address: nft.listed_by,
      };
    }

    // Otherwise fallback to history: Find all listing-related transactions (list, relist, cancel, cancel_list)
    const allListingTransactions = nft.history.filter((h: any) => {
      const t = (h.transaction_type || '').toLowerCase();
      return t === 'list' || t === 'relist' || t === 'cancel' || t === 'cancel_list';
    });

    if (allListingTransactions.length === 0) {
      return null;
    }

    // Sort by timestamp (newest first)
    allListingTransactions.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const latestTransaction = allListingTransactions[0];

    // If latest transaction is cancel_list, NFT is not listed
    const latestType = (latestTransaction.transaction_type || '').toLowerCase();
    if (latestType === 'cancel' || latestType === 'cancel_list') {
      console.log('🔍 NFT not listed (cancelled):', nft._id);
      return null;
    }

    // If latest transaction is list or relist, NFT is currently listed
    const normalizedPrice = typeof latestTransaction.price === 'string' ? parseFloat(latestTransaction.price) : latestTransaction.price;
    console.log('🔍 Current listing for NFT:', nft._id, {
      type: latestTransaction.transaction_type,
      price: normalizedPrice,
      timestamp: latestTransaction.timestamp,
    });

    return { ...latestTransaction, price: normalizedPrice };
  };

  const handleCloseListingModal = () => {
    setIsListingModalOpen(false);
    setSelectedNftForListing(null);
  };

  const handleListingSuccess = () => {
    // Refresh NFT data after successful listing
    refetch(1, 12);
  };

  const handleCancelListing = async (nft: any) => {
    if (!confirm(`Are you sure you want to cancel the listing for "${nft.token_name}"?`)) {
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    try {
      const nftId = nft._id;
      if (!nftId) {
        throw new Error("NFT ID not found");
      }

      console.log("🚀 Cancelling NFT listing for:", nftId);

      // Call API to get transaction metadata for cancellation
      const apiResponse = await cancelNftListing(nftId);
      console.log("✅ Cancel API Response:", apiResponse);

      if (!apiResponse.success) {
        throw new Error(apiResponse.error || "Failed to cancel listing");
      }

      if (!apiResponse.transactionMeta || !apiResponse.trackingId) {
        throw new Error("Invalid response from server - missing transactionMeta or trackingId");
      }

      const { transactionMeta, trackingId, instructions } = apiResponse;
      console.log("🔍 Transaction metadata:", transactionMeta);
      console.log("📋 Tracking ID:", trackingId);

      // Sign and submit transaction
      if (!signAndSubmitTransaction) {
        throw new Error("signAndSubmitTransaction function not available");
      }

      console.log("🚀 Calling signAndSubmitTransaction for cancel listing");
      console.log("🔍 Raw transaction from backend:", transactionMeta.transaction);

      // Normalize backend transaction into wallet adapter format
      const rawTx: any = transactionMeta.transaction || {};
      const rawPayload: any = rawTx.payload || rawTx;

      const normalizedFunction = rawPayload.function || rawPayload.functionId || rawTx.function || rawTx.functionId;
      const normalizedTypeArgs = rawPayload.typeArguments || rawPayload.type_arguments || rawTx.typeArguments || rawTx.type_arguments || [];
      const normalizedArgs = rawPayload.functionArguments || rawPayload.arguments || rawTx.functionArguments || rawTx.arguments || [];

      if (!normalizedFunction) {
        throw new Error("Invalid transaction data - missing function identifier");
      }

      const cancelTxForWallet = {
        sender: account?.address || rawTx.sender,
        data: {
          function: normalizedFunction,
          typeArguments: normalizedTypeArgs,
          functionArguments: normalizedArgs,
        },
      } as any;

      console.log("🔧 Normalized cancel tx for wallet:", cancelTxForWallet);

      // Sign and submit transaction with wallet
      const result = await signAndSubmitTransaction(cancelTxForWallet);
      console.log("✅ Cancel transaction signed and submitted:", result.hash);

      // Step 2: Confirm transaction with backend API
      console.log("📡 Confirming cancel transaction with API...");
      console.log("🔍 Tracking ID:", trackingId);
      console.log("🔍 Transaction Hash:", result.hash);

      await confirmTransaction(
        trackingId,
        result.hash,
        (result as any).version || 0,
        (result as any).gas_used || 500
      );
      console.log("✅ NFT listing cancelled successfully on backend!");

      // Step 3: Refresh NFT data to show updated status
      console.log("🔄 Refreshing NFT data...");
      await refetch(1, 12);
      console.log("✅ NFT data refreshed");

      // Step 4: Show success message to user
      alert("✅ NFT listing cancelled successfully!\n\nThe NFT has been removed from the marketplace and returned to your wallet.");

    } catch (err: any) {
      console.error("❌ Cancel listing error:", err);

      if (err.message?.includes("User rejected") || err.message?.includes("cancelled")) {
        setCancelError("Transaction cancelled by user");
        alert("❌ Cancel Listing Cancelled\n\nYou cancelled the transaction. The NFT listing remains active.");
      } else if (err.message?.includes("NFT not found")) {
        setCancelError("NFT không tồn tại hoặc không thể truy cập");
      } else if (err.message?.includes("not the owner")) {
        setCancelError("Bạn không phải là chủ sở hữu của NFT này");
      } else if (err.message?.includes("Escrow owner not configured")) {
        setCancelError("Hệ thống escrow chưa được cấu hình");
      } else {
        setCancelError(err.message || "Không thể hủy listing NFT");
        alert("❌ Cancel Listing Failed\n\n" + (err.message || "An error occurred while cancelling the listing."));
      }
    } finally {
      setCancelLoading(false);
    }
  };

  // Debug logging to see actual data structure
  console.log("🔍 MyProfile Debug:", {
    connected,
    account: account?.address,
    nfts,
    loading,
    error,
  });

  if (!connected || !account?.address) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>🔗 Please connect your wallet to view your profile</h2>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "#667eea",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          🔄 Go Back to Connect
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Back to Home Button */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => (onBack ? onBack() : (window.location.href = "/"))}
          style={{
            padding: "10px 20px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ← Back to Home
        </button>
      </div>

      {/* Profile Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "30px",
          borderRadius: "15px",
          marginBottom: "30px",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: "0 0 10px 0", fontSize: "2.5em" }}>
          👤 My Profile
        </h1>
        <div
          style={{
            background: "rgba(255,255,255,0.2)",
            padding: "10px 20px",
            borderRadius: "25px",
            display: "inline-block",
            fontFamily: "monospace",
            fontSize: "1.1em",
          }}
        >
          {shortAddr(account.address)}
        </div>
      </div>

      {/* NFTs Section */}
      <div style={{ marginBottom: "30px" }}>
        <h2
          style={{
            color: "#333",
            marginBottom: "20px",
            fontSize: "1.8em",
            borderBottom: "2px solid #667eea",
            paddingBottom: "10px",
          }}
        >
          🖼️ My NFTs
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #667eea",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px auto",
              }}
            ></div>
            <p>Loading your NFTs...</p>
            <p style={{ color: "#6c757d", marginTop: "8px", fontSize: "13px" }}>
              This can take longer while syncing from blockchain. Please wait...
            </p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "#ffebee",
              borderRadius: "10px",
              border: "1px solid #f44336",
            }}
          >
            <h3 style={{ color: "#d32f2f", margin: "0 0 15px 0" }}>
              ❌ Error Loading NFTs
            </h3>
            <p style={{ color: "#666", margin: "0 0 20px 0" }}>{error}</p>
            <button
              onClick={() => refetch(1, 12)}
              style={{
                background: "#667eea",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              🔄 Retry
            </button>
          </div>
        ) : nfts ? (
          <div>
            {(() => {
              // Check various possible data structures
              let nftList: any[] = [];
              let totalCount = 0;
              let currentPage = 1;
              let totalPages = 1;

              console.log("🔍 Raw NFT data from API:", nfts);

              if (nfts.items && Array.isArray(nfts.items)) {
                // Structure: { items: [...], total: number, page: number } - CURRENT API FORMAT
                nftList = nfts.items;
                totalCount = nfts.total || nftList.length;
                currentPage = nfts.page || 1;
                totalPages = Math.ceil(totalCount / (nfts.limit || 12));
                console.log("✅ Using 'items' structure");
              } else if (nfts.data && Array.isArray(nfts.data)) {
                // Structure: { data: [...], total: number, page: number }
                nftList = nfts.data;
                totalCount = nfts.total || nftList.length;
                currentPage = nfts.page || 1;
                totalPages = nfts.totalPages || Math.ceil(totalCount / 12);
                console.log("✅ Using 'data' structure");
              } else if (Array.isArray(nfts)) {
                // Structure: [...]
                nftList = nfts;
                totalCount = nftList.length;
                console.log("✅ Using direct array structure");
              } else if (nfts.nfts && Array.isArray(nfts.nfts)) {
                // Structure: { nfts: [...] }
                nftList = nfts.nfts;
                totalCount = nfts.total || nftList.length;
                console.log("✅ Using 'nfts' structure");
              } else {
                console.log("⚠️ Unknown NFT data structure:", nfts);
              }

              console.log("📊 Processed NFT data:", {
                nftList,
                totalCount,
                currentPage,
                totalPages,
              });

              return (
                <div>
                  {/* NFT Stats */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "20px",
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "20px" }}>
                      <div>
                        <strong>Total NFTs:</strong> {totalCount}
                      </div>
                      {(() => {
                        const listedNfts = nftList.filter((nft: any) => !!getCurrentListing(nft));
                        const unlistedNfts = nftList.filter((nft: any) => !getCurrentListing(nft));

                        return (
                          <>
                            <div>
                              <strong>💰 Listed:</strong> {listedNfts.length}
                            </div>
                            <div>
                              <strong>📦 Unlisted:</strong> {unlistedNfts.length}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <div>
                        <strong>Page:</strong> {currentPage} of {totalPages}
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() =>
                            refetch(Math.max(1, currentPage - 1), 12)
                          }
                          disabled={currentPage <= 1}
                          style={{
                            background: "#667eea",
                            color: "white",
                            border: "none",
                            padding: "8px 15px",
                            borderRadius: "5px",
                            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                            opacity: currentPage <= 1 ? 0.5 : 1,
                          }}
                        >
                          ← Previous
                        </button>
                        <button
                          onClick={() =>
                            refetch(Math.min(totalPages, currentPage + 1), 12)
                          }
                          disabled={currentPage >= totalPages}
                          style={{
                            background: "#667eea",
                            color: "white",
                            border: "none",
                            padding: "8px 15px",
                            borderRadius: "5px",
                            cursor:
                              currentPage >= totalPages
                                ? "not-allowed"
                                : "pointer",
                            opacity: currentPage >= totalPages ? 0.5 : 1,
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* NFT Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(250px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    {nftList.map((nft: any, index: number) => (
                      <div
                        key={nft._id || index}
                        style={{
                          background: "white",
                          border: "1px solid #e0e0e0",
                          borderRadius: "10px",
                          overflow: "hidden",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                          transition: "transform 0.2s",
                        }}
                      >
                        <div
                          style={{
                            height: "200px",
                            background:
                              nft.image || nft.token_uri
                                ? `url(${nft.image || nft.token_uri})`
                                : "#f0f0f0",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#666",
                            fontSize: "14px",
                          }}
                        >
                          {nft.image || nft.token_uri ? "" : "🖼️ No Image"}
                        </div>
                        <div style={{ padding: "15px" }}>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>
                            {nft.name || nft.token_name || `NFT #${index + 1}`}
                          </h4>
                          {/* Collection Name */}
                          {(nft.collection_name || nft.collection?.name || nft.collection_title) && (
                            <div
                              style={{
                                margin: "0 0 8px 0",
                                fontSize: "12px",
                                color: "#6c757d",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span style={{ fontWeight: 600, color: "#495057" }}>Collection:</span>
                              <span>
                                {nft.collection_name || nft.collection?.name || nft.collection_title}
                              </span>
                            </div>
                          )}
                          <p
                            style={{
                              color: "#666",
                              fontSize: "14px",
                              margin: "0 0 10px 0",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {nft.description || "No description"}
                          </p>
                          {/* NFT Metadata */}
                          <div
                            style={{
                              marginTop: "10px",
                              fontSize: "12px",
                              color: "#888",
                            }}
                          >
                            {nft.sync_status === "synced" && (
                              <div style={{ marginBottom: "5px" }}>
                                ✅{" "}
                                <span style={{ color: "#28a745" }}>Synced</span>
                              </div>
                            )}
                            {nft._id && (
                              <div
                                style={{
                                  marginBottom: "5px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                🔗 {nft._id.slice(0, 20)}...
                              </div>
                            )}

                            {/* Listing Status */}
                            {(() => {
                              const currentListing = getCurrentListing(nft);

                              if (currentListing) {
                                console.log('💰 Displaying current listing:', {
                                  nftId: nft._id,
                                  type: currentListing.transaction_type,
                                  price: currentListing.price,
                                  timestamp: currentListing.timestamp
                                });

                                return (
                                  <div
                                    style={{
                                      marginBottom: "5px",
                                      padding: "4px 8px",
                                      background: "#fff3e0",
                                      borderRadius: "4px",
                                      border: "1px solid #ff9800",
                                    }}
                                  >
                                    💰{" "}
                                    <span style={{ color: "#e65100", fontWeight: "bold" }}>
                                      {currentListing.transaction_type === 'list' ? 'Listed' : 'Relisted'}: {currentListing.price?.toLocaleString()} APT
                                    </span>
                                  </div>
                                );
                              }

                              return null;
                            })()}
                          </div>

                          {nft.attributes && nft.attributes.length > 0 && (
                            <div style={{ marginTop: "10px" }}>
                              {nft.attributes
                                .slice(0, 3)
                                .map((attr: any, i: number) => (
                                  <span
                                    key={i}
                                    style={{
                                      display: "inline-block",
                                      background: "#f0f0f0",
                                      padding: "3px 8px",
                                      margin: "2px",
                                      borderRadius: "12px",
                                      fontSize: "12px",
                                      color: "#666",
                                    }}
                                  >
                                    {attr.trait_type}: {attr.value}
                                  </span>
                                ))}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                            {(() => {
                              const currentListing = getCurrentListing(nft);
                              const isListed = !!currentListing;

                              return (
                                <>
                                  <button
                                    onClick={() => handleOpenListingModal(nft)}
                                    style={{
                                      flex: 1,
                                      padding: "8px 12px",
                                      background: isListed ? "#ff9800" : "#667eea",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "5px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      transition: "background 0.2s",
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.background = isListed ? "#f57c00" : "#5a6fd8";
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.background = isListed ? "#ff9800" : "#667eea";
                                    }}
                                  >
                                    {isListed ? "🔄 Update Price" : "📈 List for Sale"}
                                  </button>

                                  {isListed && (
                                    <button
                                      onClick={() => handleCancelListing(nft)}
                                      disabled={cancelLoading}
                                      style={{
                                        padding: "8px 12px",
                                        background: cancelLoading ? "#ccc" : "#dc3545",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: cancelLoading ? "not-allowed" : "pointer",
                                        fontSize: "12px",
                                        transition: "background 0.2s",
                                      }}
                                      onMouseOver={(e) => {
                                        if (!cancelLoading) {
                                          e.currentTarget.style.background = "#c82333";
                                        }
                                      }}
                                      onMouseOut={(e) => {
                                        if (!cancelLoading) {
                                          e.currentTarget.style.background = "#dc3545";
                                        }
                                      }}
                                      title="Cancel this NFT listing"
                                    >
                                      {cancelLoading ? "⏳" : "❌ Cancel"}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {nftList.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        background: "#f8f9fa",
                        borderRadius: "10px",
                        color: "#666",
                      }}
                    >
                      <h3>📦 No NFTs Found</h3>
                      <p>You don't own any NFTs yet.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "#f8f9fa",
              borderRadius: "10px",
              color: "#666",
            }}
          >
            <p>No NFT data available</p>
            <button
              onClick={() => refetch(1, 12)}
              style={{
                background: "#667eea",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              🔄 Load NFTs
            </button>
          </div>
        )}
      </div>

      {/* NFT Listing Modal */}
      <NFTListingModal
        nft={selectedNftForListing}
        isOpen={isListingModalOpen}
        onClose={handleCloseListingModal}
        onSuccess={handleListingSuccess}
        currentListing={selectedNftForListing ? getCurrentListing(selectedNftForListing) : null}
        signMessage={signMessage}
        walletAddress={account?.address || ""}
      />
    </div>
  );
}
