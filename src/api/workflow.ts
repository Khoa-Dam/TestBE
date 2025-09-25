import { getDraft } from "./draft";
import { publishIPFS } from "./draft";
import {
  configureAllOneBuild,
  deployBuild,
  getMintProgress,
  markMinted,
  onchainSync,
  randomMint,
} from "./signing";

// ========================================================================
// NFT COLLECTION WORKFLOW CLASS
// ========================================================================
export class NFTCollectionWorkflow {
  constructor(public draftId: string) {}

  // Step 2: Publish IPFS
  async publishIPFS(startIndex = 0) {
    return publishIPFS(this.draftId, startIndex);
  }

  // Step 3: Deploy Collection
  async deployCollection(
    adminAddr: string,
    signAndSubmitTx: (buildTxResponse: any) => Promise<{ hash: string }>
  ) {
    const buildTxResponse = await deployBuild(this.draftId, adminAddr);

    // buildTxResponse is BuildTxResponse format, pass it directly
    const txResult = await signAndSubmitTx(buildTxResponse);

    // NOTE: onchainSync is now handled manually with transaction hash
    // Don't auto-sync here anymore

    return txResult.hash;
  }

  // Step 4: Configure (optional)
  async configure(
    adminAddr: string,
    signAndSubmitTx: (buildTxResponse: any) => Promise<{ hash: string }>
  ) {
    try {
      console.log(
        `Đang cấu hình collection với draftId: ${this.draftId}, adminAddr: ${adminAddr}`
      );

      // Lấy thông tin draft để kiểm tra thời gian
      const draft = await getDraft(this.draftId);
      if (draft.config?.schedule) {
        const { presaleStart, publicStart, saleEnd } = draft.config.schedule;
        const now = Math.floor(Date.now() / 1000);

        console.log(
          "📅 Thời gian hiện tại:",
          new Date(now * 1000).toLocaleString()
        );
        console.log(
          "📅 Thời gian presale:",
          new Date(presaleStart * 1000).toLocaleString()
        );
        console.log(
          "📅 Thời gian public sale:",
          new Date(publicStart * 1000).toLocaleString()
        );
        console.log(
          "📅 Thời gian kết thúc sale:",
          new Date(saleEnd * 1000).toLocaleString()
        );

        // Kiểm tra lỗi E_SALE_CLOSED
        // if (saleEnd <= now) {
        //   console.error("❌ Lỗi E_SALE_CLOSED: Thời gian kết thúc sale đã qua");
        //   throw new Error(
        //     "Thời gian kết thúc sale đã qua. Vui lòng điều chỉnh thời gian để sale kết thúc trong tương lai."
        //   );
        // }
      }

      // Verify admin address format
      if (!adminAddr || adminAddr.length < 10) {
        console.error("Địa chỉ admin không hợp lệ:", adminAddr);
        throw new Error("Định dạng địa chỉ admin không hợp lệ");
      }

      // Get build transaction with improved error handling
      let buildTxResponse;
      try {
        buildTxResponse = await configureAllOneBuild(this.draftId, adminAddr);
      } catch (buildError) {
        console.error("Lỗi khi tạo giao dịch cấu hình:", buildError);
        throw new Error(
          `Lỗi khi tạo giao dịch cấu hình: ${(buildError as Error).message}`
        );
      }

      console.log("Build TX Response:", buildTxResponse);

      // Validate response
      if (!buildTxResponse || !buildTxResponse.payload) {
        console.error("Invalid build response:", buildTxResponse);
        throw new Error("Invalid build response from server");
      }

      // Log detailed information
      console.log("Function to call:", buildTxResponse.payload.function);
      console.log(
        "Type arguments:",
        buildTxResponse.payload.typeArguments || []
      );
      console.log(
        "Function arguments count:",
        (buildTxResponse.payload.functionArguments || []).length
      );

      // Add a small delay to ensure UI is ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Sign and submit with better error handling
      try {
        console.log("Đang ký và gửi giao dịch...");
        const txResult = await signAndSubmitTx(buildTxResponse);
        console.log("Kết quả giao dịch:", txResult);
        return txResult.hash;
      } catch (signError) {
        console.error("Lỗi khi ký giao dịch:", signError);

        // Xử lý các lỗi phổ biến
        const errorMsg = (signError as Error).message || "";

        if (errorMsg.includes("E_SALE_CLOSED")) {
          throw new Error(`Lỗi E_SALE_CLOSED: Thời gian sale không hợp lệ. Vui lòng điều chỉnh thời gian trong cấu hình để đảm bảo:
          1. Tất cả các thời gian đều trong tương lai
          2. Thời gian kết thúc sale phải sau thời gian public sale ít nhất 1 giờ`);
        } else if (errorMsg.includes("E_SCHEDULE_ORDER")) {
          throw new Error(`Lỗi E_SCHEDULE_ORDER: Thứ tự thời gian không đúng. Vui lòng đảm bảo:
          1. Thời gian public sale phải sau thời gian presale
          2. Thời gian kết thúc sale phải sau thời gian public sale`);
        } else {
          throw new Error(`Lỗi khi ký giao dịch: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error("Configure error:", error);
      throw error;
    }
  }

  // Step 5: Random Mint
  async randomMint(
    payerAddr: string,
    signAndSubmitTx: (tx: any) => Promise<{ hash: string }>,
    toAddr?: string
  ) {
    try {
      console.log(`Đang mint NFT cho collection với draftId: ${this.draftId}`);
      console.log(`Địa chỉ người trả phí: ${payerAddr}`);
      console.log(`Địa chỉ nhận NFT: ${toAddr || payerAddr}`);

      // Lấy thông tin draft để kiểm tra trạng thái
      const draft = await getDraft(this.draftId);
      if (!draft.ownerAddr) {
        throw new Error(
          "Resource Account chưa được thiết lập. Vui lòng hoàn thành bước Deploy trước."
        );
      }

      // Thêm độ trễ nhỏ để chuẩn bị UI
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Lấy thông tin mint từ API
      let data;
      try {
        data = await randomMint(this.draftId, payerAddr, toAddr);
        console.log("Dữ liệu giao dịch mint:", data);
      } catch (mintError) {
        console.error("Lỗi khi tạo giao dịch mint:", mintError);
        throw new Error(
          `Không thể tạo giao dịch mint: ${(mintError as Error).message}`
        );
      }

      // Kiểm tra dữ liệu giao dịch
      if (!data || !data.transaction) {
        throw new Error("Không nhận được dữ liệu giao dịch hợp lệ từ server");
      }

      console.log("Chuẩn bị ký và gửi giao dịch mint...");

      // Thêm độ trễ trước khi ký
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Ký và gửi giao dịch
      let txResult;
      try {
        txResult = await signAndSubmitTx(data.transaction);
        console.log("Kết quả giao dịch mint:", txResult);
      } catch (signError) {
        console.error("Lỗi khi ký giao dịch mint:", signError);
        throw new Error(
          `Lỗi khi ký giao dịch mint: ${(signError as Error).message}`
        );
      }

      // Đánh dấu là đã mint
      try {
        await markMinted(this.draftId, data.tokenIndex);
      } catch (markError) {
        console.warn(
          `Cảnh báo: Không thể đánh dấu token đã mint, nhưng mint đã thành công: ${
            (markError as Error).message
          }`
        );
      }

      return {
        txHash: txResult.hash,
        metadata: data.metadata,
        tokenIndex: data.tokenIndex,
      };
    } catch (error) {
      console.error("Lỗi trong quá trình mint:", error);
      throw error;
    }
  }

  // Get progress
  async getProgress() {
    return getMintProgress(this.draftId);
  }

  // Get draft info
  async getDraft() {
    return getDraft(this.draftId);
  }
}
