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
    collection_id: string;
    collection_name: string;
    creator_address: string;
    max_supply: number;
    last_tx_version: number;
    synced_nft_ids: string[];
    uri?: string;
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

// NFT API types
export interface NFTAttribute {
    trait_type: string;
    value: string;
}

export interface NFT {
    token_data_id: string;
    token_name: string;
    description: string;
    image_uri: string;
    attributes: NFTAttribute[];
    sync_source: "draft" | "indexer";
}

export interface NFTsResponse {
    success: boolean;
    collectionId: string;
    source: "draft" | "indexer";
    nfts: NFT[];
    total: number;
    synced: number;
    errors: number;
}

/**
 * Get collections from indexer API
 */
export async function getCollections(limit = 50, offset = 0): Promise<CollectionsResponse> {
    const url = `${API_BASE_URL}/indexer/collections?limit=${limit}&offset=${offset}`;

    try {
        const response = await apiCall(url);
        if (!response.ok) {
            // If API fails, return mock data for testing
            console.warn("API not available, using mock data for collections");
            return getMockCollections(limit, offset);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching collections:", error);
        console.warn("Using mock data for collections");
        return getMockCollections(limit, offset);
    }
}

/**
 * Get NFTs for a specific collection
 */
export async function getCollectionNFTs(collectionId: string): Promise<NFTsResponse> {
    const url = `${API_BASE_URL}/nft-sync/collection/${collectionId}/unified`;

    try {
        const response = await apiCall(url);
        if (!response.ok) {
            // If API fails, return mock data for testing
            console.warn("API not available, using mock data for NFTs");
            return getMockNFTs(collectionId);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching collection NFTs:", error);
        console.warn("Using mock data for NFTs");
        return getMockNFTs(collectionId);
    }
}

// Mock data functions for testing when backend is not available
function getMockCollections(limit = 50, offset = 0): CollectionsResponse {
    const mockCollections: Collection[] = [
        {
            collection_id: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            collection_name: "Aptos Monkeys",
            creator_address: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            max_supply: 1000,
            last_tx_version: 12345,
            synced_nft_ids: ["0x111", "0x222", "0x333", "0x444", "0x555"],
            uri: "https://example.com/collection1.jpg",
        },
        {
            collection_id: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
            collection_name: "Crypto Punks Clone",
            creator_address: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            max_supply: 500,
            last_tx_version: 67890,
            synced_nft_ids: ["0x666", "0x777", "0x888"],
            uri: "https://example.com/collection2.jpg",
        },
        {
            collection_id: "0xa1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
            collection_name: "Digital Art Gallery",
            creator_address: "0x567890123456789012345678901234567890123456789012345678901234567890",
            max_supply: 2000,
            last_tx_version: 54321,
            synced_nft_ids: ["0x999", "0xaaa", "0xbbb", "0xccc", "0xddd", "0xeee"],
            uri: "https://example.com/collection3.jpg",
        },
        {
            collection_id: "0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000",
            collection_name: "Pixel Heroes",
            creator_address: "0x999888777666555444333222111000999888777666555444333222111000999888",
            max_supply: 800,
            last_tx_version: 98765,
            synced_nft_ids: ["0xfff", "0xggg", "0xhhh", "0xiii"],
            uri: "https://example.com/collection4.jpg",
        },
        {
            collection_id: "0x1234123412341234123412341234123412341234123412341234123412341234",
            collection_name: "Meta Warriors",
            creator_address: "0x4321432143214321432143214321432143214321432143214321432143214321",
            max_supply: 1500,
            last_tx_version: 13579,
            synced_nft_ids: ["0xjjj", "0xkkk", "0xlll", "0xmmm", "0xnnn"],
            uri: "https://example.com/collection5.jpg",
        },
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

function getMockNFTs(collectionId: string): NFTsResponse {
    console.log('getMockNFTs: Generating mock NFTs for collection:', collectionId);

    // Generate a collection name based on the collection ID
    const collectionNames: Record<string, string> = {
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef": "Aptos Monkeys",
        "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba": "Crypto Punks Clone",
        "0xa1b2c3d4e5f6789012345678901234567890123456789012345678901234567890": "Digital Art Gallery",
        "0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000": "Pixel Heroes",
        "0x1234123412341234123412341234123412341234123412341234123412341234": "Meta Warriors",
    };

    const collectionName = collectionNames[collectionId] || `Collection ${collectionId.slice(0, 8)}...`;
    console.log('getMockNFTs: Collection name:', collectionName);

    const mockNFTs: NFT[] = Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => {
        const attributes = [
            {
                trait_type: "Background",
                value: ["Blue", "Red", "Green", "Purple", "Yellow"][Math.floor(Math.random() * 5)],
            },
            {
                trait_type: "Rarity",
                value: ["Common", "Uncommon", "Rare", "Epic", "Legendary"][Math.floor(Math.random() * 5)],
            },
        ];

        // Sometimes add a third attribute
        if (Math.random() > 0.5) {
            attributes.push({
                trait_type: "Type",
                value: ["Digital Art", "Collectible", "Gaming", "Utility"][Math.floor(Math.random() * 4)],
            });
        }

        const nft: NFT = {
            token_data_id: `${collectionId.slice(0, 20)}${i.toString().padStart(3, '0')}`,
            token_name: `${collectionName} #${i + 1}`,
            description: `A unique NFT from the ${collectionName} collection. This digital artwork represents creativity and innovation in the blockchain space.`,
            image_uri: `https://picsum.photos/400/400?random=${collectionId.slice(-4)}${i}`,
            attributes,
            sync_source: Math.random() > 0.5 ? "draft" : "indexer",
        };

        console.log('getMockNFTs: Generated NFT:', nft);
        return nft;
    });

    return {
        success: true,
        collectionId,
        source: Math.random() > 0.5 ? "draft" : "indexer",
        nfts: mockNFTs,
        total: mockNFTs.length,
        synced: mockNFTs.length,
        errors: 0,
    };
}

