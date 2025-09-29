import { apiCall, API_BASE_URL } from "./config";
import { getDraft } from "./draft";
import { parseBuildTxResponse } from "./utils";
import { MintProgress, RandomMintResult } from "./types";

// ========================================================================
// STEP 3: DEPLOY COLLECTION ON-CHAIN
// ========================================================================
export async function deployBuild(id: string, adminAddr?: string) {
  // Step 1: Deploy collection on-chain
  const res = await apiCall(`${API_BASE_URL}/collections/${id}/deploy-build`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ adminAddr }),
  });
  if (!res.ok) throw new Error(await res.text());

  const deployResult = await res.json();

  // NOTE: Auto-sync removed - now handled manually with transaction hash
  console.log(
    "💡 Deploy complete. Remember to call onchainSync with transaction hash."
  );

  // Deploy build doesn't need BigInt parsing (only init_collection function)
  return deployResult;
}

export async function onchainSync(id: string, deployTxHash?: string) {
  console.log("deployTxHash:", deployTxHash);
  console.log(`🔄 Syncing collection ${id} with blockchain...`);
  if (deployTxHash) {
    console.log(`📋 Using deploy TX hash: ${deployTxHash}`);
  }

  const body = deployTxHash ? { transactionHash: deployTxHash } : {};

  const res = await apiCall(`${API_BASE_URL}/collections/${id}/onchain-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());

  const syncResult = await res.json();

  // Debug what onchain-sync returns
  console.log("✅ Sync result:", syncResult);
  if (syncResult.ownerAddr) {
    console.log(`📍 Resource Account found: ${syncResult.ownerAddr}`);
  } else {
    console.log("⚠️ Resource Account not found in sync result");
  }

  return syncResult;
}

// ========================================================================
// STEP 4: CONFIGURE COLLECTION
// ========================================================================
export async function configureAllOneBuild(id: string, adminAddr?: string) {
  // First, get draft to use saved config
  const draft = await getDraft(id);

  // Check if we have config in the draft
  if (!draft.config) {
    console.warn("⚠️ No config found in draft. Using default backend config.");
  } else {
    console.log("✅ Using config from draft:", draft.config);

    // Check phase configuration from draft
    if (draft.config.setPhaseManual !== undefined) {
      console.log("🎛️ Phase config found in draft:");
      console.log(`   setPhaseManual: ${draft.config.setPhaseManual}`);
      console.log(`   phaseManual: ${draft.config.phaseManual}`);
      console.log(`   freezeAfter: ${draft.config.freezeAfter}`);
    } else {
      console.warn(
        "⚠️ No phase config found in draft. Backend may use defaults."
      );
    }

    // Check and log timestamp values
    const config = draft.config;
    if (config.schedule) {
      console.log("📅 Schedule timestamps:");
      console.log(
        `   Presale Start: ${config.schedule.presaleStart} (${new Date(
          config.schedule.presaleStart * 1000
        ).toLocaleString()})`
      );
      console.log(
        `   Public Start: ${config.schedule.publicStart} (${new Date(
          config.schedule.publicStart * 1000
        ).toLocaleString()})`
      );
      console.log(
        `   Sale End: ${config.schedule.saleEnd} (${new Date(
          config.schedule.saleEnd * 1000
        ).toLocaleString()})`
      );

      // Validate timestamps
      const now = Math.floor(Date.now() / 1000);
      console.log(
        `   Current time: ${now} (${new Date(now * 1000).toLocaleString()})`
      );

      // Kiểm tra thời gian có trong tương lai không
      if (config.schedule.presaleStart <= now) {
        console.warn(
          `⚠️ Thời gian bắt đầu presale đã qua. Cần điều chỉnh. (Có thể gây lỗi E_SALE_CLOSED)`
        );
      }
      if (config.schedule.publicStart <= now) {
        console.warn(
          `⚠️ Thời gian bắt đầu public sale đã qua. Cần điều chỉnh. (Có thể gây lỗi E_SALE_CLOSED)`
        );
      }
      if (config.schedule.saleEnd <= now) {
        console.warn(
          `⚠️ Thời gian kết thúc sale đã qua. Cần điều chỉnh. (Có thể gây lỗi E_SALE_CLOSED)`
        );
      }

      // Kiểm tra thứ tự thời gian
      if (config.schedule.publicStart <= config.schedule.presaleStart) {
        console.warn(
          `⚠️ Lỗi E_SCHEDULE_ORDER: Public start phải sau Presale start`
        );
      }
      if (config.schedule.saleEnd <= config.schedule.publicStart) {
        console.warn(`⚠️ Lỗi E_SCHEDULE_ORDER: Sale end phải sau Public start`);
      }

      // Kiểm tra khoảng thời gian giữa các mốc
      const presaleDuration =
        config.schedule.publicStart - config.schedule.presaleStart;
      const saleDuration =
        config.schedule.saleEnd - config.schedule.publicStart;

      console.log(
        `📊 Thời lượng presale: ${presaleDuration} giây (${Math.floor(
          presaleDuration / 60
        )} phút)`
      );
      console.log(
        `📊 Thời lượng public sale: ${saleDuration} giây (${Math.floor(
          saleDuration / 60
        )} phút)`
      );

      if (saleDuration < 3600) {
        console.warn(
          `⚠️ Thời lượng sale quá ngắn (${saleDuration} giây). Smart contract có thể yêu cầu tối thiểu 1 giờ (3600 giây).`
        );
        console.warn(`   Đây có thể là nguyên nhân gây lỗi E_SALE_CLOSED.`);
      }

      // Use timestamps from database as-is without auto-fixing
      console.log(
        "📋 Using timestamp values from database without modification:"
      );
    }
  }

  // Prepare payload for backend
  const configPayload = {
    adminAddr,
    config: draft.config, // Pass draft config to backend (includes phase config)
  };

  console.log(
    "📤 Sending config payload to backend:",
    JSON.stringify(configPayload, null, 2)
  );

  const res = await apiCall(
    `${API_BASE_URL}/collections/${id}/configure-all-one-build`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(configPayload),
    }
  );

  console.log("Check res", res);
  if (!res.ok) throw new Error(await res.text());

  const buildTxResponse = await res.json();

  console.log("Raw build response:", buildTxResponse);

  if (!buildTxResponse || !buildTxResponse.payload) {
    console.error("Invalid build response format:", buildTxResponse);
    throw new Error("Invalid transaction payload received from server");
  }

  // Parse and convert numeric fields to BigInt
  return parseBuildTxResponse(buildTxResponse);
}

// ========================================================================
// STEP 5: RANDOM MINT
// ========================================================================
export async function randomMint(
  id: string,
  payerAddr: string,
  toAddr?: string
): Promise<RandomMintResult> {
  const res = await apiCall(`${API_BASE_URL}/collections/${id}/random-mint`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payerAddr, toAddr }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function markMinted(id: string, tokenIndex: number) {
  const res = await apiCall(
    `${API_BASE_URL}/collections/${id}/mark-minted/${tokenIndex}`,
    {
      method: "POST",
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// 🔥 ONE-STEP: Mark minted + Auto-sync NFT data
export async function markMintedWithSync(
  id: string,
  tokenIndex: number,
  tokenName: string,
  txHash?: string
) {
  const res = await apiCall(
    `${API_BASE_URL}/collections/${id}/mark-minted-with-sync`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenIndex,
        tokenName,
        txHash,
        autoSync: true,
      }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMintProgress(id: string): Promise<MintProgress> {
  const res = await apiCall(`${API_BASE_URL}/collections/${id}/mint-progress`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Get sync status for minted NFTs
export async function getSyncStatus(id: string) {
  const res = await apiCall(`${API_BASE_URL}/collections/${id}/sync-status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
