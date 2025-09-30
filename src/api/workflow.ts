import { getDraft } from "./draft";
import { publishIPFS } from "./draft";
import {
  configureAllOneBuild,
  deployBuild,
  getMintProgress,
  getSyncStatus,
  markMinted,
  markMintedWithSync,
  onchainSync,
  randomMint,
  buildAdminAddAllowlist,
} from "./signing";
import { API_BASE_URL, apiCall } from "./config";

// ========================================================================
// NFT COLLECTION WORKFLOW CLASS
// ========================================================================
export class NFTCollectionWorkflow {
  constructor(public draftId: string) { }

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

      // 🔥 ONE-STEP: Mark minted + Auto-sync NFT data
      try {
        console.log("🔄 Marking as minted and syncing NFT data...");
        await markMintedWithSync(
          this.draftId,
          data.tokenIndex,
          data.metadata.name,
          txResult.hash
        );
        console.log("✅ NFT marked as minted and sync initiated");
      } catch (syncError) {
        console.warn(
          `⚠️ Auto-sync failed, falling back to manual mark: ${(syncError as Error).message
          }`
        );
        // Fallback to manual mark if sync fails
        try {
          await markMinted(this.draftId, data.tokenIndex);
          console.log("✅ NFT marked as minted (manual fallback)");
        } catch (markError) {
          console.warn(
            `Cảnh báo: Không thể đánh dấu token đã mint, nhưng mint đã thành công: ${(markError as Error).message
            }`
          );
        }
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

  // Step 6: Add allowlist addresses (admin)
  async addAllowlist(
    addrs: string[],
    signAndSubmitTx: (buildTxResponse: any) => Promise<{ hash: string }>,
    overrideAdminAddr?: string
  ) {
    if (!Array.isArray(addrs) || addrs.length === 0) {
      throw new Error("addrs must be a non-empty array");
    }

    // Build transaction from backend
    const buildTxResponse = await buildAdminAddAllowlist(
      this.draftId,
      addrs,
      overrideAdminAddr
    );

    // Sign and submit using provided signer
    const txResult = await signAndSubmitTx(buildTxResponse);
    return txResult.hash;
  }
  // Get progress
  async getProgress() {
    return getMintProgress(this.draftId);
  }

  // Get draft info
  async getDraft() {
    return getDraft(this.draftId);
  }

  // Get sync status for minted NFTs
  async getSyncStatus() {
    return getSyncStatus(this.draftId);
  }
}

// ========================================================================
// COLLECTIONS AND NFTS API FUNCTIONS
// ========================================================================

// Collections API types
export interface Collection {
  _id: string;
  collection_id: string;
  collection_name: string;
  description?: string;
  uri?: string; // Banner image
  creator_address: string;
  max_supply: number;
  total_minted_v2: number;
  last_tx_version: number;
  is_draft_collection: boolean;
}

export interface CollectionsResponse {
  success: boolean;
  collections: Collection[];
  total: number;
  count: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Mintable Collections API types
export interface MintableDraft {
  draft_id: string;
  collection_id: string;
  name: string;
  desc: string;
  banner_uri: string;
  banner_image: string;
  status: string;
  salePhase: string;
  phaseMode?: string;
  total: number;
  minted: number;
  remaining: number;
  progress_percentage: number;
  adminAddr: string;
}

export interface MintableCollectionsResponse {
  success?: boolean;
  drafts: MintableDraft[];
  total: number;
  count: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Collection Details API types
export interface CollectionManifest {
  name: string;
  description: string;
  attributes: NFTAttribute[];
}

export interface CollectionDetails {
  _id: string;
  name: string;
  desc: string;
  collection_id: string;
  adminAddr: string;
  status: string;
  collectionUri: string;
  baseUri: string;
  manifest: CollectionManifest[];
  imageUris: string[];
  imageFileNames: string[];
  mintedTokenIndexes: number[];
  config: {
    supply: {
      max: number;
      perWalletCap: number;
    };
    pricing: {
      presale: string;
      public: string;
      currency: string;
    };
    schedule: {
      presaleStart: number;
      publicStart: number;
      saleEnd: number;
    };
    allowlist?: string[];
    freezeAfter: boolean;
    setPhaseManual: boolean;
    phaseManual: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDetailsResponse {
  success?: boolean;
  draft: CollectionDetails;
  progress_percentage: string;
}

// NFT API types
export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface NFT {
  _id: string;
  token_name: string;
  description?: string;
  image_uri: string; // HTTPS URL
  collection_id: string;
  current_owner?: string;
  attributes?: NFTAttribute[];
  sync_status: string;
  minted_at?: string;
}

export interface NFTsResponse {
  success: boolean;
  nfts: NFT[];
  total: number;
  count: number;
  pagination: {
    skip: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Get collections from indexer API
 */
export async function getCollections(limit = 50, offset = 0): Promise<CollectionsResponse> {
  const url = `${API_BASE_URL}/indexer/collections?limit=${limit}&offset=${offset}`;
  console.log('getCollections: Calling API with limit:', limit, 'offset:', offset);

  try {
    const response = await apiCall(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('getCollections: Raw API response:', data);

    // Validate response structure
    if (!data.success || !Array.isArray(data.collections)) {
      throw new Error("Invalid response format from collections API");
    }

    console.log('getCollections: Successfully parsed response with', data.collections.length, 'collections');
    return data;
  } catch (error) {
    console.error("Error fetching collections:", error);
    throw error;
  }
}

/**
 * Get mintable collections from API
 */
export async function getMintableCollections(limit = 50, offset = 0): Promise<MintableCollectionsResponse> {
  const url = `${API_BASE_URL}/collections/mintable?limit=${limit}&offset=${offset}`;
  console.log('getMintableCollections: Calling API with limit:', limit, 'offset:', offset);

  try {
    const response = await apiCall(url);
    if (!response.ok) {
      // If API fails, return mock data for testing
      console.warn("API not available, using mock data for mintable collections");
      return getMockMintableCollections(limit, offset);
    }

    const data = await response.json();
    console.log('getMintableCollections: Raw API response:', data);

    // Validate response structure
    if (!Array.isArray(data.drafts)) {
      throw new Error("Invalid response format from mintable collections API");
    }

    console.log('getMintableCollections: Successfully parsed response with', data.drafts.length, 'mintable collections');
    return data;
  } catch (error) {
    console.error("Error fetching mintable collections:", error);
    console.warn("Using mock data for mintable collections");
    return getMockMintableCollections(limit, offset);
  }
}

/**
 * Get collection details by ID
 */
export async function getCollectionDetails(draftId: string): Promise<CollectionDetailsResponse> {
  const url = `${API_BASE_URL}/collections/${draftId}`;
  console.log('getCollectionDetails: Calling API for draft:', draftId);

  try {
    const response = await apiCall(url);
    if (!response.ok) {
      // If API fails, return mock data for testing
      console.warn("API not available, using mock data for collection details");
      return getMockCollectionDetails(draftId);
    }

    const data = await response.json();
    console.log('getCollectionDetails: Raw API response:', data);

    // Validate response structure - check if it has required fields
    if (!data._id || !data.manifest || !data.config) {
      throw new Error("Invalid response format from collection details API");
    }

    console.log('getCollectionDetails: Successfully parsed response for draft:', draftId);

    // Wrap the response in the expected format
    return {
      success: true,
      draft: data,
      progress_percentage: data.progress_percentage || "0%"
    };
  } catch (error) {
    console.error("Error fetching collection details:", error);
    console.warn("Using mock data for collection details");
    return getMockCollectionDetails(draftId);
  }
}

/**
 * Get NFTs for a specific collection
 */
export async function getCollectionNFTs(
  collectionId: string,
  options?: {
    skip?: number;
    limit?: number;
    syncStatus?: string;
    owner?: string;
  }
) {
  const { skip = 0, limit = 50, syncStatus, owner } = options || {};

  // Build query parameters
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  if (syncStatus) params.append('syncStatus', syncStatus);
  if (owner) params.append('owner', owner);

  const url = `${API_BASE_URL}/nft-sync/collection/${collectionId}/nfts?${params.toString()}`;

  try {
    const response = await apiCall(url);
    if (!response.ok) {
      // If API fails, return mock data for testing
      console.warn("API not available, using mock data for NFTs");
    }

    const data = await response.json();

    // Validate response structure
    if (!data.nfts || !Array.isArray(data.nfts)) {
      throw new Error("Invalid response format from NFTs API");
    }

    return data;
  } catch (error) {
    console.error("Error fetching collection NFTs:", error);
    console.warn("Using mock data for NFTs");
  }
}

// Mock data functions for testing when backend is not available
function getMockMintableCollections(limit = 50, offset = 0): MintableCollectionsResponse {
  const mockDrafts: MintableDraft[] = [
    {
      draft_id: "64f8a1b2c3d4e5f6a7b8c9d0",
      collection_id: "0x1234567890abcdef1234567890abcdef12345678",
      name: "MoonFish",
      desc: "THE LEGENDARY SPLASH",
      banner_uri: "ipfs://QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML3/banner.jpg",
      banner_image: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML3/banner.jpg",
      status: "active",
      salePhase: "PUBLIC",
      phaseMode: "schedule",
      total: 1007,
      minted: 764,
      remaining: 243,
      progress_percentage: 76,
      adminAddr: "0x6d2a9e554c8c95c409dc68c5d46eb0bdef3bae901960331074231902a263d327"
    },
    {
      draft_id: "64f8a1b2c3d4e5f6a7b8c9d1",
      collection_id: "0x2345678901bcdef1234567890abcdef123456789",
      name: "WA1FU",
      desc: "Anime Collection",
      banner_uri: "ipfs://QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML4/banner.jpg",
      banner_image: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML4/banner.jpg",
      status: "active",
      salePhase: "PRESALE",
      phaseMode: "manual",
      total: 4,
      minted: 2,
      remaining: 2,
      progress_percentage: 50,
      adminAddr: "0x7c32693c1300799d49890dacdb926e024198cf0e98fd45dc63d1171857bce34f"
    },
    {
      draft_id: "64f8a1b2c3d4e5f6a7b8c9d2",
      collection_id: "0x3456789012cdef1234567890abcdef1234567890",
      name: "Crazy Beanz",
      desc: "Bean Collection",
      banner_uri: "ipfs://QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML5/banner.jpg",
      banner_image: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML5/banner.jpg",
      status: "active",
      salePhase: "PRESALE",
      phaseMode: "schedule",
      total: 3333,
      minted: 325,
      remaining: 3008,
      progress_percentage: 10,
      adminAddr: "0x8d43793c1300799d49890dacdb926e024198cf0e98fd45dc63d1171857bce34f"
    },
    {
      draft_id: "64f8a1b2c3d4e5f6a7b8c9d3",
      collection_id: "0x4567890123def1234567890abcdef1234567890",
      name: "SuiShark",
      desc: "Shark Collection",
      banner_uri: "ipfs://QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML6/banner.jpg",
      banner_image: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML6/banner.jpg",
      status: "active",
      salePhase: "PUBLIC",
      phaseMode: "manual",
      total: 1,
      minted: 1,
      remaining: 0,
      progress_percentage: 100,
      adminAddr: "0x9e54893c1300799d49890dacdb926e024198cf0e98fd45dc63d1171857bce34f"
    },
    {
      draft_id: "64f8a1b2c3d4e5f6a7b8c9d4",
      collection_id: "0x5678901234ef1234567890abcdef1234567890",
      name: "Mandelbrots Sui Homage",
      desc: "Fractal Art Collection",
      banner_uri: "ipfs://QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML7/banner.jpg",
      banner_image: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML7/banner.jpg",
      status: "active",
      salePhase: "PUBLIC",
      phaseMode: "schedule",
      total: 1,
      minted: 1,
      remaining: 0,
      progress_percentage: 100,
      adminAddr: "0xaf65993c1300799d49890dacdb926e024198cf0e98fd45dc63d1171857bce34f"
    },
    {
      draft_id: "64f8a1b2c3d4e5f6a7b8c9d5",
      collection_id: "0x6789012345f1234567890abcdef1234567890",
      name: "Quants",
      desc: "Quantitative Collection",
      banner_uri: "ipfs://QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML8/banner.jpg",
      banner_image: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML8/banner.jpg",
      status: "active",
      salePhase: "PUBLIC",
      phaseMode: "schedule",
      total: 3000,
      minted: 1034,
      remaining: 1966,
      progress_percentage: 34,
      adminAddr: "0xbf76993c1300799d49890dacdb926e024198cf0e98fd45dc63d1171857bce34f"
    }
  ];

  const startIndex = Math.floor(offset / limit) * limit;
  const endIndex = startIndex + limit;
  const paginatedDrafts = mockDrafts.slice(startIndex, endIndex);

  return {
    drafts: paginatedDrafts,
    total: mockDrafts.length,
    count: paginatedDrafts.length,
    pagination: {
      limit,
      offset: startIndex,
      hasMore: endIndex < mockDrafts.length,
    },
  };
}

function getMockCollections(limit = 50, offset = 0): CollectionsResponse {
  const mockCollections: Collection[] = [
    {
      _id: "64f8a1b2c3d4e5f6a7b8c9d0",
      collection_id: "0x1234567890abcdef1234567890abcdef12345678",
      collection_name: "MoonFish",
      description: "THE LEGENDARY SPLASH",
      uri: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML3/banner.jpg",
      creator_address: "0x6d2a9e554c8c95c409dc68c5d46eb0bdef3bae901960331074231902a263d327",
      max_supply: 1007,
      total_minted_v2: 764,
      last_tx_version: 12345,
      is_draft_collection: true,
    },
    {
      _id: "64f8a1b2c3d4e5f6a7b8c9d1",
      collection_id: "0x2345678901bcdef1234567890abcdef123456789",
      collection_name: "WA1FU",
      description: "Anime Collection",
      uri: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML4/banner.jpg",
      creator_address: "0x7c32693c1300799d49890dacdb926e024198cf0e98fd45dc63d1171857bce34f",
      max_supply: 4,
      total_minted_v2: 2,
      last_tx_version: 67890,
      is_draft_collection: true,
    },
    {
      _id: "64f8a1b2c3d4e5f6a7b8c9d2",
      collection_id: "0x3456789012cdef1234567890abcdef1234567890",
      collection_name: "Crazy Beanz",
      description: "Bean Collection",
      uri: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML5/banner.jpg",
      creator_address: "0x8d43793c1300799d49890dacdb926e024198cf0e98fd45dc63d1171857bce34f",
      max_supply: 3333,
      total_minted_v2: 325,
      last_tx_version: 54321,
      is_draft_collection: true,
    }
  ];

  const startIndex = Math.floor(offset / limit) * limit;
  const endIndex = startIndex + limit;
  const paginatedCollections = mockCollections.slice(startIndex, endIndex);

  return {
    success: true,
    collections: paginatedCollections,
    total: mockCollections.length,
    count: paginatedCollections.length,
    pagination: {
      limit,
      offset: startIndex,
      hasMore: endIndex < mockCollections.length,
    },
  };
}

function getMockCollectionDetails(collectionId: string): CollectionDetailsResponse {
  const mockManifest: CollectionManifest[] = [
    {
      name: "Fishing with my Dogs",
      description: "A peaceful fishing scene with loyal companions",
      attributes: [
        { trait_type: "Background", value: "Ocean" },
        { trait_type: "Fish", value: "Golden" },
        { trait_type: "Rarity", value: "Legendary" }
      ]
    },
    {
      name: "Fishing in Sui",
      description: "Fishing in the Sui ecosystem",
      attributes: [
        { trait_type: "Background", value: "Sui" },
        { trait_type: "Fish", value: "Blue" },
        { trait_type: "Rarity", value: "Rare" }
      ]
    },
    {
      name: "Everyone Go Fish",
      description: "Community fishing event",
      attributes: [
        { trait_type: "Background", value: "Community" },
        { trait_type: "Fish", value: "Red" },
        { trait_type: "Rarity", value: "Common" }
      ]
    }
  ];

  return {
    draft: {
      _id: "64f8a1b2c3d4e5f6a7b8c9d0",
      name: "MoonFish",
      desc: "THE LEGENDARY SPLASH",
      collection_id: collectionId,
      adminAddr: "0x6d2a9e554c8c95c409dc68c5d46eb0bdef3bae901960331074231902a263d327",
      status: "active",
      collectionUri: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML3/banner.jpg",
      baseUri: "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML3/",
      manifest: mockManifest,
      imageUris: [
        "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML3/nft_0.png",
        "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML3/nft_1.png",
        "https://ipfs.io/ipfs/QmBeCMq5sBbH8Uor9gmHaPDFpD9hUjuriee6vYsud6JML3/nft_2.png"
      ],
      imageFileNames: ["nft_0.png", "nft_1.png", "nft_2.png"],
      mintedTokenIndexes: [0, 1], // Đã mint NFT index 0 và 1
      config: {
        supply: {
          max: 1007,
          perWalletCap: 5
        },
        pricing: {
          presale: "0.91",
          public: "1.5",
          currency: "APT"
        },
        schedule: {
          presaleStart: 1696000000000,
          publicStart: 1696086400000,
          saleEnd: 1696172800000
        },
        freezeAfter: true,
        setPhaseManual: false,
        phaseManual: 0
      },
      createdAt: "2025-09-28T09:00:00.000Z",
      updatedAt: "2025-09-28T10:30:00.000Z"
    },
    progress_percentage: "76%"
  };
}



