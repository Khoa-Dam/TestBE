import { apiCall, API_BASE_URL } from "./config";
import { Draft } from "./types";

// ========================================================================
// STEP 1: CREATE COMPLETE DRAFT
// ========================================================================
export async function createCompleteDraft(formData: FormData): Promise<Draft> {
  const res = await apiCall(`${API_BASE_URL}/collections/create-complete`, {
    method: "POST",
    body: formData, // FormData includes files
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

// Get the correct Collection ID to use for API calls
export async function getCollectionIdentifier(id: string): Promise<{
  draftId: string; // MongoDB _id (use this for API endpoints)
  collectionId?: string; // Backend collection ID (if set)
  resourceAccount?: string; // On-chain resource account
  recommendation: string; // Which ID to use
}> {
  const draft = await getDraft(id);

  const result = {
    draftId: draft._id,
    collectionId: draft.collectionId,
    resourceAccount: draft.ownerAddr,
    recommendation: "Use draftId for all API calls",
  };

  console.log("🎯 Collection ID Recommendation:", result);
  return result;
}

// ========================================================================
// BASIC DRAFT OPERATIONS
// ========================================================================
export async function getDraft(id: string): Promise<Draft> {
  const res = await apiCall(`${API_BASE_URL}/collections/${id}`);
  if (!res.ok) throw new Error(await res.text());
  const draft = await res.json();

  // Debug logging to clarify Collection ID
  console.log("📊 Draft Debug Info:");
  console.log(`   MongoDB _id: ${draft._id}`);
  console.log(`   Collection ID: ${draft.collectionId || "Not set"}`);
  console.log(`   Resource Account: ${draft.ownerAddr || "Not set"}`);
  console.log(`   Status: ${draft.status}`);

  return draft;
}

export async function getManifest(id: string) {
  const res = await apiCall(`${API_BASE_URL}/collections/${id}/manifest`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ========================================================================
// STEP 2: PUBLISH TO IPFS
// ========================================================================
export async function publishIPFS(id: string, startIndex = 0) {
  const res = await apiCall(`${API_BASE_URL}/collections/${id}/publish-ipfs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startIndex }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
