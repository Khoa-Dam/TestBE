import { apiCall } from "./config";
import { API_BASE_URL } from "./config";
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

      // Fix timestamps if needed - Đảm bảo thứ tự đúng và thời gian hợp lệ theo smart contract
      const fixTimestamps = true; // Set to false if you want to disable automatic fixing
      if (fixTimestamps) {
        const updatedConfig = { ...draft.config };
        let modified = false;

        // Lấy thời gian hiện tại + thêm buffer để đảm bảo nó trong tương lai
        const now = Math.floor(Date.now() / 1000);
        console.log(`Thời gian hiện tại (Unix): ${now}`);

        // Các khoảng thời gian tối thiểu - điều chỉnh theo yêu cầu của smart contract
        const MIN_TIME_FROM_NOW = 300; // Tối thiểu 5 phút từ hiện tại
        const MIN_PRESALE_DURATION = 600; // Presale kéo dài tối thiểu 10 phút
        const MIN_SALE_DURATION = 3600; // Sale kéo dài tối thiểu 1 giờ sau khi public

        // Tính toán thời gian bắt đầu presale (ít nhất 5 phút từ hiện tại)
        const minPresaleTime = now + MIN_TIME_FROM_NOW;

        // Nếu thời gian presale đã cấu hình trước đó lớn hơn thời gian tối thiểu, thì giữ nguyên
        // Nếu không, sử dụng thời gian tối thiểu
        updatedConfig.schedule.presaleStart = Math.max(
          minPresaleTime,
          updatedConfig.schedule.presaleStart || 0
        );

        // Đảm bảo thời gian public sale bắt đầu sau presale ít nhất 10 phút
        updatedConfig.schedule.publicStart = Math.max(
          updatedConfig.schedule.presaleStart + MIN_PRESALE_DURATION,
          updatedConfig.schedule.publicStart || 0
        );

        // Đảm bảo sale kết thúc sau khi public sale bắt đầu ít nhất 1 giờ
        updatedConfig.schedule.saleEnd = Math.max(
          updatedConfig.schedule.publicStart + MIN_SALE_DURATION,
          updatedConfig.schedule.saleEnd || 0
        );

        // Nếu khoảng cách giữa publicStart và saleEnd quá ngắn (như 60 giây trong trường hợp của bạn)
        if (
          updatedConfig.schedule.saleEnd - updatedConfig.schedule.publicStart <
          MIN_SALE_DURATION
        ) {
          console.log(
            `⚠️ Khoảng thời gian sale quá ngắn: ${
              updatedConfig.schedule.saleEnd -
              updatedConfig.schedule.publicStart
            } giây. Điều chỉnh lên ${MIN_SALE_DURATION} giây.`
          );
          updatedConfig.schedule.saleEnd =
            updatedConfig.schedule.publicStart + MIN_SALE_DURATION;
        }

        modified = true;

        if (modified) {
          console.log("🔄 Đã cập nhật thời gian lịch bán hàng:");
          console.log(
            `   Presale Start: ${
              updatedConfig.schedule.presaleStart
            } (${new Date(
              updatedConfig.schedule.presaleStart * 1000
            ).toLocaleString()})`
          );
          console.log(
            `   Public Start: ${updatedConfig.schedule.publicStart} (${new Date(
              updatedConfig.schedule.publicStart * 1000
            ).toLocaleString()})`
          );
          console.log(
            `   Sale End: ${updatedConfig.schedule.saleEnd} (${new Date(
              updatedConfig.schedule.saleEnd * 1000
            ).toLocaleString()})`
          );

          // Kiểm tra lại thứ tự thời gian
          if (
            updatedConfig.schedule.publicStart <=
            updatedConfig.schedule.presaleStart
          ) {
            console.error(
              "❌ Lỗi nghiêm trọng: Public start vẫn trước hoặc bằng Presale start"
            );
          }
          if (
            updatedConfig.schedule.saleEnd <= updatedConfig.schedule.publicStart
          ) {
            console.error(
              "❌ Lỗi nghiêm trọng: Sale end vẫn trước hoặc bằng Public start"
            );
          }

          // Sử dụng config đã cập nhật
          draft.config = updatedConfig;
        }
      }
    }
  }

  const res = await apiCall(
    `${API_BASE_URL}/collections/${id}/configure-all-one-build`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        adminAddr,
        config: draft.config, // Pass draft config to backend
      }),
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

export async function getMintProgress(id: string): Promise<MintProgress> {
  const res = await apiCall(`${API_BASE_URL}/collections/${id}/mint-progress`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
