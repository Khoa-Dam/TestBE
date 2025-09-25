import { useState } from "react";
import ConnectBar from "./ConnectBar";
import CreateCollection from "./CreateCollection";
import WorkflowManager from "./WorkflowManager";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptos } from "./lib.aptosClient";
import type { BuildTxResponse, Draft } from "./types";
import {
  configureAllOneBuild,
  deployBuild,
  randomMint,
  onchainSync,
  getCollectionIdentifier,
  extractResourceAccountFromTx,
  getCollectionAddress,
  checkCollectionExists,
} from "./api";

type AppMode = "home" | "create" | "workflow" | "legacy";

export default function App() {
  const { signAndSubmitTransaction, account } = useWallet();
  const [mode, setMode] = useState<AppMode>("home");
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [log, setLog] = useState<string>("");
  const [beMeta, setBeMeta] = useState<string>("");
  const [receiver, setReceiver] = useState<string>(""); // for test transfer
  const [collectionId, setCollectionId] = useState<string>(
    "68cee079e2d9b9fc3a045246"
  ); // collection ID for configure
  const [contractAddress, setContractAddress] = useState<string>(
    "0x79b473e15e61b5555b4a45696e067517836a84f3aa00e6b8bd2ccc4849a50109"
  ); // smart contract address
  const [collectionName, setCollectionName] =
    useState<string>("My NFT Collection"); // collection name for view functions
  const [newCollectionName, setNewCollectionName] =
    useState<string>("My NFT Collection");

  // Handle draft creation from CreateCollection component
  const handleDraftCreated = (draft: Draft) => {
    setCurrentDraft(draft);
    setMode("workflow");
  };

  // Handle back from WorkflowManager
  const handleBackFromWorkflow = () => {
    setMode("create");
  };

  const append = (x: any) =>
    setLog(
      (l) => l + "\n" + (typeof x === "string" ? x : JSON.stringify(x, null, 2))
    );

  // 1) Simple ping: coin::transfer 1 octa (1e-8 APT)
  async function signTest() {
    try {
      if (!account?.address) throw new Error("Connect wallet first");
      const payload = {
        sender: account.address,
        data: {
          function: "0x1::coin::transfer",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [receiver || account.address, 1],
        },
      } as const;

      const pending = await signAndSubmitTransaction(payload as any);
      append({ submitHash: pending.hash });
      await aptos.waitForTransaction({ transactionHash: pending.hash });
      append("✅ Transaction confirmed");
    } catch (e: any) {
      append("❌ " + (e?.message || String(e)));
    }
  }

  // Simulate transaction before signing
  async function simulateTransaction() {
    try {
      const meta: BuildTxResponse = JSON.parse(beMeta);
      append(
        `🧪 Simulating transaction for function: ${meta.payload.function}`
      );

      const transaction = await aptos.transaction.build.simple({
        sender: meta.sender,
        data: {
          function: meta.payload.function as `${string}::${string}::${string}`,
          typeArguments: meta.payload.typeArguments,
          functionArguments: meta.payload.functionArguments,
        },
      });

      const simulationResult = await aptos.transaction.simulate.simple({
        signerPublicKey: account?.publicKey as any,
        transaction,
      });

      append("✅ Simulation successful:");
      append(simulationResult);
    } catch (e: any) {
      append("❌ Simulation failed: " + (e?.message || String(e)));
    }
  }

  // Check if a module exists at a given address
  async function checkModule() {
    try {
      const meta: BuildTxResponse = JSON.parse(beMeta);
      const [moduleAddress, moduleName] = meta.payload.function.split("::");
      append(`🔍 Checking module ${moduleName} at address ${moduleAddress}...`);

      const modules = await aptos.getAccountModules({
        accountAddress: moduleAddress,
      });

      const moduleExists = modules.some(
        (module) => module.abi?.name === moduleName
      );

      if (moduleExists) {
        append(`✅ Module ${moduleName} exists at ${moduleAddress}`);
      } else {
        append(`❌ Module ${moduleName} NOT found at ${moduleAddress}`);
        append(`Available modules at this address:`);
        modules.forEach((module) => {
          append(`  - ${module.abi?.name || "Unknown"}`);
        });
      }
    } catch (e: any) {
      append("❌ Error checking module: " + (e?.message || String(e)));
    }
  }

  // 2) Paste BE BuildTxResponse JSON and sign
  async function signBeMeta() {
    try {
      const meta: BuildTxResponse = JSON.parse(beMeta);
      const inputData = {
        sender: meta.sender,
        data: {
          function: meta.payload.function,
          typeArguments: meta.payload.typeArguments,
          functionArguments: meta.payload.functionArguments,
        },
      };
      const pending = await signAndSubmitTransaction(inputData as any);
      append({ submitHash: pending.hash });
      await aptos.waitForTransaction({ transactionHash: pending.hash });
      append("✅ Transaction confirmed");
    } catch (e: any) {
      append("❌ " + (e?.message || String(e)));
    }
  }

  async function testDeployBuild() {
    try {
      if (!account?.address) throw new Error("Connect wallet first");
      if (!collectionId.trim()) throw new Error("Collection ID is required");

      append(`🚀 Testing deploy build for collection: ${collectionId}`);
      append(`🔑 Using admin address: ${account.address}`);

      const buildTxResponse = await deployBuild(collectionId, account.address);
      append("✅ Deploy build API successful - BuildTxResponse:");
      append(buildTxResponse);

      append("📋 You can now sign this transaction:");
      append(`Function: ${buildTxResponse.payload.function}`);
      append(`Sender: ${buildTxResponse.sender}`);
    } catch (e: any) {
      append("❌ Deploy build failed: " + (e?.message || String(e)));
    }
  }

  async function testConfigureAllOne() {
    try {
      if (!account?.address) throw new Error("Connect wallet first");
      if (!collectionId.trim()) throw new Error("Collection ID is required");

      append(`🔧 Configuring all-in-one build for collection: ${collectionId}`);
      append(`🔑 Using admin address: ${account.address}`);

      const result = await configureAllOneBuild(collectionId, account.address);
      append("✅ Configure All-in-One Build successful:");
      append(result);
    } catch (e: any) {
      append("❌ Configure failed: " + (e?.message || String(e)));
    }
  }

  async function testGetCollectionAddress() {
    try {
      if (!contractAddress.trim())
        throw new Error("Contract address is required");
      if (!collectionName.trim())
        throw new Error("Collection name is required");

      // First get Resource Account from collection ID
      const info = await getCollectionIdentifier(collectionId);
      if (!info.resourceAccount) {
        throw new Error("Resource Account not found. Deploy collection first.");
      }

      append(`🎯 Testing get_collection_address view function:`);
      append(`   Contract: ${contractAddress}`);
      append(`   Resource Account: ${info.resourceAccount}`);
      append(`   Collection Name: ${collectionName}`);

      const collectionAddr = await getCollectionAddress(
        contractAddress,
        info.resourceAccount,
        collectionName
      );

      if (collectionAddr) {
        append(`✅ Collection Address: ${collectionAddr}`);

        // Also test collection exists
        const exists = await checkCollectionExists(
          contractAddress,
          info.resourceAccount,
          collectionName
        );
        append(`✅ Collection Exists: ${exists}`);
      } else {
        append(`❌ Failed to get collection address`);
      }
    } catch (e: any) {
      append("❌ Get collection address failed: " + (e?.message || String(e)));
    }
  }

  async function traceResourceAccount() {
    try {
      if (!collectionId.trim()) throw new Error("Collection ID is required");

      append(`🕵️ Tracing Resource Account for collection: ${collectionId}`);

      // Step 1: Get current draft info
      const info = await getCollectionIdentifier(collectionId);

      if (info.resourceAccount) {
        append(`✅ Resource Account already found: ${info.resourceAccount}`);
        return;
      }

      append("❌ Resource Account not found in draft");
      append("💡 Possible reasons:");
      append("   1. Collection not deployed yet");
      append("   2. onchainSync not called after deploy");
      append("   3. Backend failed to extract Resource Account");

      append("🔧 Try running:");
      append("   1. Deploy Build (if not deployed)");
      append("   2. Onchain Sync (to extract Resource Account)");
    } catch (e: any) {
      append("❌ Trace failed: " + (e?.message || String(e)));
    }
  }

  async function debugCollectionId() {
    try {
      if (!collectionId.trim()) throw new Error("Collection ID is required");

      append(`🔍 Debugging Collection ID: ${collectionId}`);

      const info = await getCollectionIdentifier(collectionId);
      append("📊 Collection Information:");
      append(`   Draft ID (MongoDB): ${info.draftId}`);
      append(`   Collection ID: ${info.collectionId || "Not set"}`);
      append(`   Resource Account: ${info.resourceAccount || "Not set"}`);
      append(`   Recommendation: ${info.recommendation}`);

      if (!info.collectionId) {
        append(
          "💡 Tip: Collection ID not set - try running Sync or Deploy first"
        );
      }
    } catch (e: any) {
      append("❌ Debug failed: " + (e?.message || String(e)));
    }
  }

  async function testOnchainSync() {
    try {
      if (!collectionId.trim()) throw new Error("Collection ID is required");

      append(`🔄 Testing onchain sync for collection: ${collectionId}`);

      // Ask for transaction hash (optional)
      const shouldProvideTxHash = confirm(
        "Do you have a deploy transaction hash to provide?"
      );
      let txHash: string | undefined;

      if (shouldProvideTxHash) {
        const inputTxHash = prompt("Enter deploy transaction hash:");
        if (inputTxHash?.trim()) {
          txHash = inputTxHash.trim();
          append(`📋 Using TX hash: ${txHash}`);
        }
      }

      const syncResult = await onchainSync(collectionId, txHash);
      append("✅ Onchain Sync successful:");
      append(syncResult);

      if (syncResult.ownerAddr) {
        append(`📍 Resource Account: ${syncResult.ownerAddr}`);
      }
      if (syncResult.collectionId) {
        append(`🆔 Collection ID: ${syncResult.collectionId}`);
      }
    } catch (e: any) {
      append("❌ Onchain Sync failed: " + (e?.message || String(e)));
    }
  }

  // Test with transaction hash to extract Resource Account
  async function testExtractResourceAccount() {
    try {
      if (!collectionId.trim()) throw new Error("Collection ID is required");

      const txHash = prompt("Enter deploy transaction hash:");
      if (!txHash?.trim()) throw new Error("Transaction hash is required");

      append(`🔍 Testing extract Resource Account from TX: ${txHash}`);
      append(`📋 Collection ID: ${collectionId}`);

      // Call frontend helper first (for debugging)
      const frontendResult = await extractResourceAccountFromTx(txHash);
      append("🖥️ Frontend extraction result:");
      append(frontendResult);

      // TODO: Call backend endpoint to extract and save Resource Account
      // Backend should have endpoint like: POST /collections/${collectionId}/extract-resource-account
      // Body: { transactionHash: txHash }

      append("💡 Backend implementation needed:");
      append(
        "   1. Create endpoint: POST /collections/{id}/extract-resource-account"
      );
      append("   2. Parse transaction events/changes to find Resource Account");
      append("   3. Save ownerAddr to database");
      append("   4. Then onchainSync can work properly");
    } catch (e: any) {
      append("❌ Extract failed: " + (e?.message || String(e)));
    }
  }

  async function testRandomMint() {
    try {
      if (!account?.address) throw new Error("Connect wallet first");
      if (!collectionId.trim()) throw new Error("Collection ID is required");

      append(`🎲 Testing random mint for collection: ${collectionId}`);
      append(`💰 Using payer address: ${account.address}`);
      append(`🎯 Minting to address: ${receiver || account.address}`);

      const mintResult = await randomMint(
        collectionId,
        account.address,
        receiver || account.address
      );

      append("✅ Random Mint API successful:");
      append(`🎨 NFT Name: ${mintResult.metadata.name}`);
      append(`📝 Description: ${mintResult.metadata.description}`);
      append(`🖼️ Image: ${mintResult.metadata.image}`);
      append(`🔢 Token Index: ${mintResult.tokenIndex}`);
      append(
        `📊 Remaining Tokens: ${mintResult.remainingTokens}/${mintResult.totalTokens}`
      );

      if (mintResult.transaction) {
        append("📋 BuildTxResponse for signing:");
        append(mintResult.transaction);
        append("You can now sign this transaction to complete the mint!");
      }
    } catch (e: any) {
      append("❌ Random Mint failed: " + (e?.message || String(e)));
    }
  }

  async function signLegacy() {
    try {
      // @ts-ignore
      const aptosInjected = window.aptos;
      if (!aptosInjected)
        throw new Error("No injected wallet found (Petra/Martian/etc.)");
      const payload = {
        type: "entry_function_payload",
        function: "0x1::coin::transfer",
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [receiver || account?.address, "1"],
      };
      const pending = await aptosInjected.signAndSubmitTransaction(payload);
      setLog(
        (l) => l + "\n" + JSON.stringify({ submitHash: pending.hash }, null, 2)
      );
      await aptos.waitForTransaction({ transactionHash: pending.hash });
      setLog((l) => l + "\n✅ Transaction confirmed");
    } catch (e: any) {
      setLog((l) => l + "\n❌ " + (e?.message || String(e)));
    }
  }

  // Navigation based on mode
  if (mode === "create") {
    return (
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 20,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <button onClick={() => setMode("home")}>← Back to Home</button>
          <h1>Create NFT Collection</h1>
        </div>
        <ConnectBar />
        <CreateCollection onDraftCreated={handleDraftCreated} />
      </div>
    );
  }

  if (mode === "workflow") {
    return (
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 20,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <button onClick={() => setMode("home")}>← Back to Home</button>
          <h1>NFT Collection Workflow Manager</h1>
        </div>
        <ConnectBar />
        {currentDraft ? (
          <WorkflowManager
            draft={currentDraft}
            onBack={handleBackFromWorkflow}
          />
        ) : (
          <div>No draft available. Please create a collection first.</div>
        )}
      </div>
    );
  }

  if (mode === "legacy") {
    return (
      <div
        style={{
          padding: 20,
          display: "grid",
          gap: 16,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 20,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <button onClick={() => setMode("home")}>← Back to Home</button>
          <h1>Legacy API Testing Tools</h1>
        </div>
        <ConnectBar />

        <section style={{ display: "grid", gap: 8 }}>
          <h3>1) Quick sign test (coin::transfer 1 octa)</h3>
          <input
            placeholder="Receiver address (default = yourself)"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
          <button onClick={signTest}>Sign & Submit (Adapter API)</button>
          <small>
            This should pop your wallet and ask to sign a tiny transfer.
          </small>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h3>2) Paste BuildTxResponse JSON from BE and sign</h3>
          <textarea
            placeholder='{"functionId":"...","sender":"0x...","chainId":...,"payload":{"function":"<addr>::module::entry","typeArguments":[],"functionArguments":[...]}}'
            value={beMeta}
            onChange={(e) => setBeMeta(e.target.value)}
            rows={8}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={checkModule}>🔍 Check Module</button>
            <button onClick={simulateTransaction}>🧪 Simulate</button>
            <button onClick={signBeMeta}>Sign & Submit</button>
          </div>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h3>3) Smart Contract View Functions</h3>
          <input
            placeholder="Contract Address (e.g., 0x79b473e15...)"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
          />
          <input
            placeholder="Collection Name (e.g., My NFT Collection)"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={testGetCollectionAddress}>
              🎯 Get Collection Address
            </button>
          </div>
          <small>
            Test smart contract view functions to get on-chain collection info.
          </small>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h3>4) API Testing - Get BuildTxResponse</h3>
          <input
            placeholder="Collection ID (e.g., 68cee079e2d9b9fc3a045246)"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
          />
          <input
            placeholder="Mint to address (optional - default: your address)"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={debugCollectionId}>🔍 Debug Collection ID</button>
            <button onClick={traceResourceAccount}>
              🕵️ Trace Resource Account
            </button>
            <button onClick={testExtractResourceAccount}>
              🔬 Extract from TX Hash
            </button>
          </div>
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
          >
            <button onClick={testDeployBuild}>🚀 Test Deploy Build</button>
            <button onClick={testOnchainSync}>🔄 Test Sync</button>
            <button onClick={testConfigureAllOne}>🔧 Test Configure</button>
            <button onClick={testRandomMint}>🎲 Test Random Mint</button>
          </div>
          <small>
            Test API endpoints to get BuildTxResponse format for signing.
            <br />
            <strong>Workflow order:</strong> Deploy → Sync → Configure → Mint
          </small>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h3>5) Legacy window.aptos (for Petra etc.)</h3>
          <button onClick={signLegacy}>Sign & Submit (legacy payload)</button>
          <small>
            Uses payload with type/function/type_arguments/arguments.
          </small>
        </section>

        <section>
          <h3>Log</h3>
          <pre
            style={{
              background: "#111",
              color: "#0f0",
              padding: 12,
              minHeight: 160,
              borderRadius: 8,
            }}
          >
            {log}
          </pre>
        </section>
      </div>
    );
  }

  // Home page with navigation
  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1>🎨 Aptos NFT Collection Manager</h1>
      <ConnectBar />

      <div style={{ display: "grid", gap: 20, marginTop: 30 }}>
        <section
          style={{
            background: "#f8f9fa",
            padding: 20,
            borderRadius: 10,
            border: "1px solid #e9ecef",
          }}
        >
          <h2>🚀 Complete NFT Collection Workflow</h2>
          <p>
            Create and manage your NFT collections from draft to deployment:
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
            <button
              onClick={() => setMode("create")}
              style={{
                padding: "12px 24px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              📝 Create New Collection
            </button>
            {currentDraft && (
              <button
                onClick={() => setMode("workflow")}
                style={{
                  padding: "12px 24px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ⚡ Continue Workflow
              </button>
            )}
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 15,
              background: "white",
              borderRadius: 6,
            }}
          >
            <h4>📋 Workflow Steps:</h4>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                <strong>Create Draft</strong> - Set up collection metadata,
                pricing, and upload files
              </li>
              <li>
                <strong>Publish to IPFS</strong> - Upload metadata and images to
                decentralized storage
              </li>
              <li>
                <strong>Deploy On-chain</strong> - Deploy your collection smart
                contract on Aptos
              </li>
              <li>
                <strong>Configure Settings</strong> - Set up collection rules
                and parameters
              </li>
              <li>
                <strong>Random Mint</strong> - Enable users to mint random NFTs
                from your collection
              </li>
            </ol>
          </div>

          {currentDraft && (
            <div
              style={{
                marginTop: 15,
                padding: 10,
                background: "#d4edda",
                borderRadius: 6,
                color: "#155724",
              }}
            >
              ✅ Current Draft: <strong>{currentDraft.name}</strong> (ID:{" "}
              {currentDraft._id})
            </div>
          )}
        </section>

        <section
          style={{
            background: "#fff3cd",
            padding: 20,
            borderRadius: 10,
            border: "1px solid #ffeaa7",
          }}
        >
          <h3>🛠️ Developer Tools</h3>
          <p>Advanced testing and debugging tools for developers:</p>
          <button
            onClick={() => setMode("legacy")}
            style={{
              padding: "10px 20px",
              background: "#ffc107",
              color: "#212529",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            🔧 Legacy API Testing Tools
          </button>
        </section>
      </div>
    </div>
  );
}
