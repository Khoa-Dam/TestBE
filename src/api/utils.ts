import { aptos } from "../lib.aptosClient";

// Utility function to convert to u64 BigInt
export const toU64 = (n: number | string | bigint) => BigInt(n);

// Helper function to parse BuildTxResponse and convert numeric fields to BigInt
export function parseBuildTxResponse(buildTxResponse: any) {
  const parsed = { ...buildTxResponse };

  if (parsed.payload && parsed.payload.functionArguments) {
    const args = parsed.payload.functionArguments;

    // Fields that need to be converted to BigInt (by position in admin_configure_all)
    const bigIntFields = [1, 2, 4, 5, 9, 10, 11, 13];

    // Fields that are timestamps (require special handling)
    const timestampFields = [9, 10, 11]; // presaleStart, publicStart, saleEnd

    console.log("🔄 Converting numeric fields to u64 BigInt...");

    // Check if this is the admin_configure_all function
    const isConfigureAll =
      parsed.payload.function &&
      parsed.payload.function.includes("admin_configure_all");

    parsed.payload.functionArguments = args.map((arg: any, index: number) => {
      // Log original value for debugging
      console.log(`Original arg[${index}]:`, arg, typeof arg);

      if (
        bigIntFields.includes(index) &&
        (typeof arg === "number" || typeof arg === "string")
      ) {
        // Convert timestamps to string without modification
        if (isConfigureAll && timestampFields.includes(index)) {
          const argValue = Number(arg);
          console.log(
            `   Timestamp field ${index}: ${argValue} (using as-is from database)`
          );
          return argValue.toString();
        }

        // Convert to BigInt for validation, but send as string for compatibility
        const u64Value = toU64(arg);
        const strValue = u64Value.toString();
        console.log(
          `   Index ${index}: ${arg} → ${strValue} (String from BigInt)`
        );
        return strValue; // Return string, not BigInt for compatibility
      }
      return arg;
    });

    console.log(
      "✅ BuildTxResponse parsed with u64 BigInt → String conversion"
    );
  }

  return parsed;
}

// Helper function to get Collection Address from smart contract
export async function getCollectionAddress(
  contractAddress: string,
  resourceAccount: string,
  collectionName: string
): Promise<string | null> {
  try {
    console.log(`🔍 Calling get_collection_address view function...`);
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Resource Account: ${resourceAccount}`);
    console.log(`   Collection Name: ${collectionName}`);

    const viewRequest = {
      function:
        `${contractAddress}::Mint_NFT_Marketplace::get_collection_address` as `${string}::${string}::${string}`,
      type_arguments: [],
      arguments: [resourceAccount, collectionName],
    };

    console.log("📡 View request:", viewRequest);

    const response = await aptos.view({ payload: viewRequest });

    console.log("✅ View response:", response);

    // Response should be [address] array
    if (response && response.length > 0) {
      const collectionAddress = response[0] as string;
      console.log(`🎯 Collection Address: ${collectionAddress}`);
      return collectionAddress;
    }

    console.log("❌ No collection address in response");
    return null;
  } catch (error) {
    console.error("❌ Failed to get collection address:", error);
    return null;
  }
}

// Helper function to check if collection exists
export async function checkCollectionExists(
  contractAddress: string,
  resourceAccount: string,
  collectionName: string
): Promise<boolean> {
  try {
    console.log(`🔍 Checking if collection exists...`);

    const viewRequest = {
      function:
        `${contractAddress}::Mint_NFT_Marketplace::collection_exists` as `${string}::${string}::${string}`,
      type_arguments: [],
      arguments: [resourceAccount, collectionName],
    };

    const response = await aptos.view({ payload: viewRequest });

    // Response should be [boolean] array
    if (response && response.length > 0) {
      const exists = response[0] as boolean;
      console.log(`🎯 Collection exists: ${exists}`);
      return exists;
    }

    return false;
  } catch (error) {
    console.error("❌ Failed to check collection exists:", error);
    return false;
  }
}

// Helper function to extract Resource Account from transaction
// Extract Resource Account from deploy transaction (simplified version)
export async function extractResourceAccountFromTx(txHash: string): Promise<{
  resourceAccount: string | null;
  collectionAddress: string | null;
}> {
  try {
    console.log(`🔍 Extracting Resource Account from deploy TX: ${txHash}`);

    // For now, return null - this is complex transaction parsing
    // Backend onchainSync should handle the actual extraction
    console.log("⚠️ Transaction parsing not fully implemented");
    console.log(
      "💡 Backend should extract Resource Account from transaction events/changes"
    );

    return { resourceAccount: null, collectionAddress: null };
  } catch (error) {
    console.error("❌ Failed to extract Resource Account:", error);
    return { resourceAccount: null, collectionAddress: null };
  }
}
