// Simple profile component - shows wallet address and user's NFTs
import React from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useUserNfts } from "../hooks/useUser";
import { shortAddr } from "../lib.readable";

interface MyProfileProps {
  onBack?: () => void;
}

export default function MyProfile({ onBack }: MyProfileProps) {
  const { account, connected } = useWallet();
  const { nfts, loading, error, refetch } = useUserNfts(1, 12); // Load 12 NFTs per page

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
                    <div>
                      <strong>Total NFTs:</strong> {totalCount}
                    </div>
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
                        key={nft._id || nft.token_data_id || index}
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
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                            {nft.name || nft.token_name || `NFT #${index + 1}`}
                          </h4>
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
                            {nft.token_data_id && (
                              <div
                                style={{
                                  marginBottom: "5px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                🔗 {nft.token_data_id.slice(0, 20)}...
                              </div>
                            )}
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
    </div>
  );
}
