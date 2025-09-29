// 🔥 ENHANCED NFT MINT WORKFLOW WITH AUTO-SYNC
// Example usage of the new streamlined API

import { NFTCollectionWorkflow } from "../api";

async function enhancedMintWorkflow(draftId: string, userAddress: string) {
  const workflow = new NFTCollectionWorkflow(draftId);

  try {
    console.log("🎲 Starting enhanced mint process...");

    // 1. Mint NFT (this now includes auto-sync!)
    const result = await workflow.randomMint(
      userAddress,
      async (transaction: any) => {
        // Your wallet signing logic here - replace 'wallet' with your actual wallet instance
        // return await wallet.signAndSubmitTransaction(transaction);
        throw new Error("Replace with your wallet signing logic");
      },
      userAddress
    );

    console.log("✅ Mint successful:");
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   NFT Name: ${result.metadata.name}`);
    console.log(`   Token Index: ${result.tokenIndex}`);

    // 2. 🔥 NFT data is automatically synced in background!
    console.log("🔄 NFT sync initiated automatically...");

    // 3. Check sync status (optional)
    setTimeout(async () => {
      try {
        const syncStatus = await workflow.getSyncStatus();
        console.log("📊 Sync Status:", syncStatus);

        if (syncStatus.syncProgress === 100) {
          console.log("🎉 All NFTs fully synced and ready for marketplace!");
        } else {
          console.log(`⏳ Sync in progress: ${syncStatus.syncProgress}%`);
        }
      } catch (error) {
        console.warn("Could not fetch sync status:", error);
      }
    }, 5000); // Check after 5 seconds

    return result;
  } catch (error) {
    console.error("❌ Enhanced mint failed:", error);
    throw error;
  }
}

// 📋 Usage Example:
/*
const draftId = "your-draft-id";
const userAddr = "0x1234...";

enhancedMintWorkflow(draftId, userAddr)
  .then(result => {
    console.log("🎉 Enhanced mint complete!");
    // NFT is minted AND automatically synced!
    // Check your marketplace in a few seconds
  })
  .catch(error => {
    console.error("💥 Mint failed:", error);
  });
*/

export { enhancedMintWorkflow };
