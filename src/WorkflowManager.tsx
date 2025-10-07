import React, { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptos } from "./lib.aptosClient";
import {
  NFTCollectionWorkflow,
  deployBuild,
  onchainSync,
  getCollectionAddress,
  checkCollectionExists,
  type Draft,
  type MintProgress,
} from "./api";

interface WorkflowManagerProps {
  draft: Draft;
  onBack: () => void;
}

type WorkflowStep = "ipfs" | "deploy" | "configure" | "mint";

export default function WorkflowManager({
  draft,
  onBack,
}: WorkflowManagerProps) {
  const { signAndSubmitTransaction, account } = useWallet();
  const [workflow] = useState(new NFTCollectionWorkflow(draft._id));

  const [currentStep, setCurrentStep] = useState<WorkflowStep>("ipfs");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [draftData, setDraftData] = useState<Draft>(draft);
  const [mintProgress, setMintProgress] = useState<MintProgress | null>(null);
  const [contractAddress, setContractAddress] = useState<string>(
    "0xe47af39de3eec71bbee74781a466ffd4fb262420d1b484469fde38a1400dc163"
  );

  const addLog = (message: string) => {
    setLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  const signAndSubmit = async (buildTxResponse: any) => {
    // Enhanced wallet connection check
    if (!account) {
      addLog("❌ Wallet not connected. Please connect your wallet first.");
      throw new Error("Wallet not connected");
    }

    if (!signAndSubmitTransaction) {
      addLog("❌ Wallet adapter not properly initialized");
      throw new Error("Wallet adapter not properly initialized");
    }

    if (!buildTxResponse || !buildTxResponse.payload) {
      console.error("Invalid transaction payload received:", buildTxResponse);
      addLog(`❌ Error: Invalid transaction payload received`);
      throw new Error("Invalid transaction payload");
    }

    addLog(
      `🔏 Preparing to sign transaction: ${buildTxResponse.payload.function}`
    );
    console.log("Full transaction payload:", buildTxResponse);

    try {
      // Add a small delay before attempting to sign to ensure wallet UI has time to initialize
      addLog(
        `⏳ Opening wallet for signing... (Please check your wallet popup)`
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Log arguments for debugging
      if (buildTxResponse.payload.functionArguments) {
        buildTxResponse.payload.functionArguments.forEach(
          (arg: any, index: number) => {
            console.log(`Argument ${index}: ${arg} (${typeof arg})`);
          }
        );
      }

      // Convert BuildTxResponse to wallet adapter format
      const transactionPayload = {
        sender: account.address,
        data: {
          function: buildTxResponse.payload.function,
          typeArguments: buildTxResponse.payload.typeArguments || [],
          functionArguments: buildTxResponse.payload.functionArguments || [],
        },
      };

      console.log("Wallet adapter payload:", transactionPayload);

      addLog(`🔒 Waiting for wallet approval... (Check for wallet popup)`);

      // Add timeout protection
      const signPromise = signAndSubmitTransaction(transactionPayload as any);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Transaction signing timed out. Wallet popup may not be visible."
              )
            ),
          30000
        );
      });

      const result = (await Promise.race([signPromise, timeoutPromise])) as any;

      addLog(`📡 Transaction submitted: ${result.hash}`);
      await aptos.waitForTransaction({ transactionHash: result.hash });
      addLog(`✅ Transaction confirmed: ${result.hash}`);

      return result;
    } catch (error) {
      console.error("Transaction error:", error);

      // Provide more detailed error message
      let errorMessage = (error as Error).message || "Unknown error";
      if (errorMessage.includes("Type mismatch")) {
        addLog(
          `❌ Transaction failed: Type mismatch error - Arguments have incorrect types`
        );
        addLog(
          `💡 Debugging tip: Check argument #${errorMessage.match(/argument (\d+)/)?.[1] || "?"
          }`
        );
      } else if (errorMessage.includes("rejected")) {
        addLog(
          `❌ Transaction rejected. Please check if your wallet popup appeared.`
        );
        addLog(`💡 Try refreshing the page or reconnecting your wallet.`);
      } else {
        addLog(`❌ Transaction failed: ${errorMessage}`);
      }

      throw error;
    }
  };

  // Step 2: Publish to IPFS
  const handlePublishIPFS = async () => {
    setLoading(true);
    try {
      addLog("🌐 Publishing to IPFS...");
      const result = await workflow.publishIPFS(0);
      addLog(`✅ IPFS publish successful`);
      addLog(`Base URI: ${result.baseUri}`);
      addLog(`Total items: ${result.items?.length || 0}`);

      // Refresh draft data
      const updatedDraft = await workflow.getDraft();
      setDraftData(updatedDraft);
      setCurrentStep("deploy");
    } catch (error) {
      addLog(`❌ IPFS publish failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Deploy Collection
  const handleDeploy = async () => {
    if (!account) {
      addLog("❌ Please connect wallet first");
      return;
    }

    setLoading(true);
    try {
      addLog("🚀 Deploying collection on-chain...");

      // Get BuildTxResponse first
      const buildTxResponse = await deployBuild(draft._id, account.address);
      addLog("✅ Deploy build API successful");

      // Sign and submit transaction
      const txResult = await signAndSubmit(buildTxResponse);
      const txHash = txResult.hash;
      addLog(`✅ Deploy successful! TX: ${txHash}`);

      // Sync with blockchain using transaction hash
      addLog(`🔄 Syncing with blockchain using TX: ${txHash}...`);
      await onchainSync(draft._id, txHash);
      addLog("✅ Blockchain sync successful");

      // Refresh draft data
      const updatedDraft = await workflow.getDraft();
      setDraftData(updatedDraft);

      // Debug logging
      addLog("📊 Updated draft data:");
      addLog(JSON.stringify(updatedDraft, null, 2));

      addLog(`Resource Account: ${updatedDraft.ownerAddr || "Not set"}`);
      addLog(`Collection ID: ${updatedDraft.collectionId || "Not set"}`);

      // Verify collection on-chain using view function
      if (updatedDraft.ownerAddr && updatedDraft.name) {
        addLog(`🔍 Verifying collection on-chain...`);
        try {
          const collectionAddr = await getCollectionAddress(
            contractAddress,
            updatedDraft.ownerAddr,
            updatedDraft.name
          );

          if (collectionAddr) {
            addLog(`✅ Collection Address verified: ${collectionAddr}`);

            const exists = await checkCollectionExists(
              contractAddress,
              updatedDraft.ownerAddr,
              updatedDraft.name
            );
            addLog(`✅ Collection exists on-chain: ${exists}`);
          } else {
            addLog(`⚠️ Could not verify collection address via view function`);
          }
        } catch (viewError) {
          addLog(
            `⚠️ View function verification failed: ${(viewError as Error).message
            }`
          );
        }
      }

      if (updatedDraft.ownerAddr && updatedDraft.collectionId) {
        addLog(`✅ Deploy workflow completed successfully`);
        setCurrentStep("configure");
      } else {
        addLog("⚠️ Warning: Auto-sync may have failed. Try manual sync.");
      }
    } catch (error) {
      addLog(`❌ Deploy failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Configure Collection
  const handleConfigure = async () => {
    // Enhanced wallet connection check
    if (!account) {
      addLog("❌ Please connect wallet first");
      return;
    }

    // Verify wallet adapter is properly initialized
    if (!signAndSubmitTransaction) {
      addLog(
        "❌ Wallet adapter not initialized. Please refresh and reconnect your wallet"
      );
      return;
    }

    addLog("🔍 Verifying wallet connection...");

    // Check if wallet is properly connected before proceeding
    try {
      // Simple check to verify wallet connection by accessing account properties
      if (!account.address) {
        addLog("❌ Wallet address not available. Please reconnect your wallet");
        return;
      }

      addLog(
        `✅ Wallet connected: ${account.address.substring(
          0,
          6
        )}...${account.address.substring(account.address.length - 4)}`
      );
    } catch (walletError) {
      addLog(`❌ Wallet connection error: ${(walletError as Error).message}`);
      addLog("💡 Try refreshing the page and reconnecting your wallet");
      return;
    }

    setLoading(true);
    try {
      // First, refresh the draft data to ensure we have the latest
      try {
        const updatedDraft = await workflow.getDraft();
        setDraftData(updatedDraft);
        addLog(
          `📋 Retrieved latest draft data with status: ${updatedDraft.status}`
        );

        // Check for required fields
        if (!updatedDraft.ownerAddr) {
          addLog(`⚠️ Warning: Resource Account not set in draft`);
        }

        // Check if config exists
        if (!updatedDraft.config) {
          addLog(`⚠️ Warning: No configuration found in draft`);
        } else {
          addLog(
            `✅ Configuration found in draft: ${Object.keys(updatedDraft.config).length
            } parameters`
          );
        }
      } catch (refreshError) {
        addLog(`⚠️ Draft refresh failed: ${(refreshError as Error).message}`);
        console.error("Draft refresh error:", refreshError);
      }

      addLog("⚙️ Configuring collection settings...");
      addLog("📋 Using phase config from draft creation");
      const txHash = await workflow.configure(account.address, signAndSubmit);
      addLog(`✅ Configuration successful! TX: ${txHash}`);

      // Verify configuration using view function
      if (draftData.ownerAddr && draftData.name) {
        addLog(`🔍 Verifying configuration...`);
        try {
          const exists = await checkCollectionExists(
            contractAddress,
            draftData.ownerAddr,
            draftData.name
          );
          addLog(`✅ Collection still exists after config: ${exists}`);
        } catch (viewError) {
          addLog(
            `⚠️ Configuration verification failed: ${(viewError as Error).message
            }`
          );
        }
      }

      setCurrentStep("mint");
    } catch (error) {
      addLog(`❌ Configuration failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Random Mint
  const handleRandomMint = async () => {
    // Kiểm tra kết nối ví nâng cao
    if (!account) {
      addLog("❌ Vui lòng kết nối ví trước");
      return;
    }

    // Xác minh wallet adapter đã được khởi tạo đúng
    if (!signAndSubmitTransaction) {
      addLog(
        "❌ Wallet adapter chưa được khởi tạo. Vui lòng làm mới trang và kết nối lại ví"
      );
      return;
    }

    addLog("🔍 Đang xác minh kết nối ví...");

    // Kiểm tra xem ví có được kết nối đúng cách không
    try {
      if (!account.address) {
        addLog("❌ Địa chỉ ví không khả dụng. Vui lòng kết nối lại ví");
        return;
      }

      addLog(
        `✅ Ví đã kết nối: ${account.address.substring(
          0,
          6
        )}...${account.address.substring(account.address.length - 4)}`
      );
    } catch (walletError) {
      addLog(`❌ Lỗi kết nối ví: ${(walletError as Error).message}`);
      addLog("💡 Hãy thử làm mới trang và kết nối lại ví");
      return;
    }

    setLoading(true);
    try {
      addLog("🎲 Đang mint NFT ngẫu nhiên...");
      addLog("⏳ Chuẩn bị giao dịch mint...");

      // Thêm độ trễ nhỏ để đảm bảo UI sẵn sàng
      await new Promise((resolve) => setTimeout(resolve, 1000));

      addLog("🔒 Đang mở ví để ký giao dịch... (Kiểm tra popup ví của bạn)");

      const result = await workflow.randomMint(
        account.address,
        signAndSubmit,
        account.address
      );

      addLog(`✅ Mint thành công! TX: ${result.txHash}`);
      addLog(`🎨 Đã mint: ${result.metadata.name}`);
      addLog(`📍 Token Index: ${result.tokenIndex}`);

      // Cập nhật tiến trình - temporarily disabled
      addLog(`📊 Tiến trình cập nhật tạm thời bị vô hiệu hóa`);
    } catch (error) {
      console.error("Lỗi mint:", error);

      // Cung cấp thông báo lỗi chi tiết hơn
      const errorMessage = (error as Error).message || "";
      if (errorMessage.includes("rejected")) {
        addLog(
          `❌ Giao dịch bị từ chối. Hãy kiểm tra xem popup ví có xuất hiện không.`
        );
        addLog(`💡 Thử làm mới trang hoặc kết nối lại ví.`);
      } else {
        addLog(`❌ Mint thất bại: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load mint progress - temporarily disabled
  const loadMintProgress = async () => {
    try {
      // Progress loading temporarily disabled
      addLog(`📊 Mint progress loading temporarily disabled`);
    } catch (error) {
      addLog(`❌ Failed to load progress: ${(error as Error).message}`);
    }
  };

  React.useEffect(() => {
    if (currentStep === "mint") {
      loadMintProgress();
    }
  }, [currentStep]);

  const getStepStatus = (step: WorkflowStep) => {
    const stepOrder = ["ipfs", "deploy", "configure", "mint"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex < currentIndex) return "✅";
    if (stepIndex === currentIndex) return "🔄";
    return "⏳";
  };

  const canExecuteStep = (step: WorkflowStep) => {
    switch (step) {
      case "ipfs":
        return draftData.status === "files_uploaded";
      case "deploy":
        return draftData.status === "ipfs_published" && draftData.baseUri;
      case "configure":
        return (
          (draftData.status === "onchain_created" ||
            draftData.status === "deploy_pending") &&
          draftData.ownerAddr
        );
      case "mint":
        return draftData.ownerAddr && currentStep === "mint";
      default:
        return false;
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2>🎯 Collection Workflow: {draftData.name}</h2>
        <button onClick={onBack} style={{ padding: "8px 16px" }}>
          ← Back to Create
        </button>
      </div>

      {/* Draft Info */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <h3>📊 Collection Status</h3>
        <div
          style={{ display: "grid", gap: 8, gridTemplateColumns: "auto 1fr" }}
        >
          <strong>ID:</strong> <span>{draftData._id}</span>
          <strong>Status:</strong>
          <span
            style={{
              color:
                draftData.status === "deploy_pending"
                  ? "#ffa500"
                  : draftData.status === "onchain_created"
                    ? "#28a745"
                    : "#333",
            }}
          >
            {draftData.status === "deploy_pending"
              ? "🚀 Deploy Pending"
              : draftData.status === "onchain_created"
                ? "✅ On-chain Created"
                : draftData.status}
          </span>
          <strong>Admin:</strong> <span>{draftData.adminAddr}</span>
          <strong>Wallet:</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>
              {account
                ? `${account.address.substring(
                  0,
                  6
                )}...${account.address.substring(account.address.length - 4)}`
                : "Not connected"}
            </span>
            <button
              onClick={() => {
                addLog("🔄 Attempting to refresh wallet connection...");
                // This doesn't actually reconnect but indicates to user they should reconnect
                window.location.reload();
              }}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              🔄 Reconnect
            </button>
          </div>
          <strong>Contract Address:</strong>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Smart contract address for view functions"
            style={{
              padding: "4px 8px",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 12,
              fontFamily: "monospace",
            }}
          />
          {draftData.baseUri && (
            <>
              <strong>Base URI:</strong>{" "}
              <span style={{ fontSize: 12, wordBreak: "break-all" }}>
                {draftData.baseUri}
              </span>
            </>
          )}
          {draftData.ownerAddr && (
            <>
              <strong>Resource Account:</strong>{" "}
              <span style={{ fontSize: 12, wordBreak: "break-all" }}>
                {draftData.ownerAddr}
              </span>
            </>
          )}
          {draftData.collectionId && (
            <>
              <strong>Collection ID:</strong>{" "}
              <span style={{ fontSize: 12, wordBreak: "break-all" }}>
                {draftData.collectionId}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Workflow Steps */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          marginBottom: 20,
        }}
      >
        {/* Step 2: IPFS */}
        <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
          <h3>{getStepStatus("ipfs")} Step 2: Publish IPFS</h3>
          <p>Upload images and metadata to IPFS</p>
          <button
            onClick={handlePublishIPFS}
            disabled={loading || !canExecuteStep("ipfs")}
            style={{
              padding: "8px 16px",
              backgroundColor: canExecuteStep("ipfs") ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: canExecuteStep("ipfs") ? "pointer" : "not-allowed",
            }}
          >
            {loading && currentStep === "ipfs"
              ? "⏳ Publishing..."
              : "🌐 Publish to IPFS"}
          </button>
        </div>

        {/* Step 3: Deploy */}
        <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
          <h3>{getStepStatus("deploy")} Step 3: Deploy Collection</h3>
          <p>Create collection on Aptos blockchain</p>
          <button
            onClick={handleDeploy}
            disabled={loading || !canExecuteStep("deploy")}
            style={{
              padding: "8px 16px",
              backgroundColor: canExecuteStep("deploy") ? "#007bff" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: canExecuteStep("deploy") ? "pointer" : "not-allowed",
            }}
          >
            {loading && currentStep === "deploy"
              ? "⏳ Deploying..."
              : "🚀 Deploy Collection"}
          </button>
        </div>

        {/* Step 4: Configure */}
        <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
          <h3>{getStepStatus("configure")} Step 4: Configure</h3>
          <p>Set pricing, schedule, and splits</p>

          <button
            onClick={handleConfigure}
            disabled={loading || !canExecuteStep("configure")}
            style={{
              padding: "8px 16px",
              backgroundColor: canExecuteStep("configure")
                ? "#ffc107"
                : "#6c757d",
              color: canExecuteStep("configure") ? "black" : "white",
              border: "none",
              borderRadius: 4,
              cursor: canExecuteStep("configure") ? "pointer" : "not-allowed",
            }}
          >
            {loading && currentStep === "configure"
              ? "⏳ Configuring..."
              : "⚙️ Configure"}
          </button>
        </div>

        {/* Step 5: Mint */}
        <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
          <h3>{getStepStatus("mint")} Step 5: Random Mint</h3>
          <p>Mint random NFTs from collection</p>
          {mintProgress && (
            <div style={{ marginBottom: 8 }}>
              <small>
                Progress: {mintProgress.mintedCount}/{mintProgress.totalTokens}{" "}
                ({mintProgress.progress}%)
              </small>
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#e0e0e0",
                  borderRadius: 4,
                  height: 8,
                }}
              >
                <div
                  style={{
                    width: `${mintProgress.progress}%`,
                    backgroundColor: "#28a745",
                    height: "100%",
                    borderRadius: 4,
                  }}
                ></div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleRandomMint}
              disabled={loading || !canExecuteStep("mint")}
              style={{
                padding: "8px 16px",
                backgroundColor: canExecuteStep("mint") ? "#dc3545" : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: canExecuteStep("mint") ? "pointer" : "not-allowed",
              }}
            >
              {loading && currentStep === "mint"
                ? "⏳ Minting..."
                : "🎲 Random Mint"}
            </button>
            <button
              onClick={loadMintProgress}
              disabled={!draftData.ownerAddr}
              style={{ padding: "8px 16px", border: "1px solid #ccc" }}
            >
              📊 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Log Section */}
      <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
        <h3>📝 Activity Log</h3>
        <div
          style={{
            background: "#111",
            color: "#0f0",
            padding: 12,
            minHeight: 200,
            maxHeight: 400,
            borderRadius: 4,
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          {log.length === 0 ? (
            <div style={{ color: "#888" }}>
              No activity yet. Start by publishing to IPFS...
            </div>
          ) : (
            log.map((entry, index) => <div key={index}>{entry}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
