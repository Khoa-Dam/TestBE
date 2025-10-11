// User-related API functions
import { API_BASE_URL, apiCall } from "./config";

// Get current user information
export const getCurrentUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get current user: ${response.status} ${errorText}`
    );
  }

  return response.json();
};

// Get user overview
export const getUserOverview = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(`${API_BASE_URL}/me/overview`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get user overview: ${response.status} ${errorText}`
    );
  }

  return response.json();
};

// Get user NFTs with pagination
export const getUserNfts = async (page: number = 1, limit: number = 10) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(
    `${API_BASE_URL}/me/nfts?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log("Check response:fsdfsdfsdfdsfd", response);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get user NFTs: ${response.status} ${errorText}`);
  }

  return response.json();
};

// Check if user is authenticated (has valid token)
export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  return !!token;
};

// Get current JWT token
export const getCurrentToken = () => {
  return localStorage.getItem("token");
};

// List NFT for sale - returns transaction metadata for signing
export const listNftForSale = async (nftId: string, price: number, currency: string) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const requestData = {
    price,
    currency,
  };

  console.log(`🚀 NFT List API - NFT ID: ${nftId}`);
  console.log("📦 Request data:", requestData);
  console.log("🔑 Token:", token.substring(0, 20) + "...");

  const response = await fetch(`${API_BASE_URL}/nft/${nftId}/list`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  console.log(`📡 Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error response:", errorText);
    throw new Error(`Failed to list NFT for sale: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log("✅ API Response:", responseData);
  return responseData;
};

// Relist NFT (update price) - returns transaction metadata for signing
export const relistNft = async (nftId: string, newPrice: number, currency: string) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const requestData = {
    newPrice,
    currency,
  };

  console.log(`🚀 NFT Relist API - NFT ID: ${nftId}`);
  console.log("📦 Request data:", requestData);
  console.log("🔑 Token:", token.substring(0, 20) + "...");

  const response = await fetch(`${API_BASE_URL}/nft/${nftId}/relist`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  console.log(`📡 Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error response:", errorText);
    throw new Error(`Failed to relist NFT: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log("✅ API Response:", responseData);
  return responseData;
};

// Buy NFT - prepare transaction for buying listed NFT
export const buyNft = async (nftId: string) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  console.log(`🚀 NFT Buy API - NFT ID: ${nftId}`);
  console.log("🔑 Token:", token.substring(0, 20) + "...");

  const response = await fetch(`${API_BASE_URL}/nft/${nftId}/buy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  console.log(`📡 Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error response:", errorText);
    throw new Error(`Failed to prepare NFT purchase: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log("✅ API Response:", responseData);
  return responseData;
};

// Cancel NFT listing
export const cancelNftListing = async (nftId: string) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  console.log(`🚀 NFT Cancel Listing API - NFT ID: ${nftId}`);
  console.log("🔑 Token:", token.substring(0, 20) + "...");

  const response = await fetch(`${API_BASE_URL}/nft/${nftId}/list`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  console.log(`📡 Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error response:", errorText);
    throw new Error(`Failed to cancel NFT listing: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log("✅ API Response:", responseData);
  return responseData;
};

// Confirm transaction after signing and submitting to blockchain
export const confirmTransaction = async (
  trackingId: string,
  transactionHash: string,
  blockNumber?: number,
  gasUsed?: number
) => {
  const requestData: any = {
    transactionHash,
  };
  if (typeof blockNumber === "number") requestData.blockNumber = blockNumber;
  if (typeof gasUsed === "number") requestData.gasUsed = gasUsed;

  console.log(`🚀 Transaction Confirm API - Tracking ID: ${trackingId}`);
  console.log("📦 Request data:", requestData);

  const response = await fetch(`${API_BASE_URL}/transactions/${trackingId}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  console.log(`📡 Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error response:", errorText);
    throw new Error(`Failed to confirm transaction: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log("✅ API Response:", responseData);
  return responseData;
};

// Clear authentication data
export const clearAuthData = () => {
  localStorage.removeItem("token");
  console.log("🔐 Authentication data cleared");
};

// ========================================================================
// BID APIs
// ========================================================================

// Place bid on NFT - returns transaction metadata for signing
export const placeBid = async (nftId: string, amount: number, expiry?: number, currency: string = 'APT') => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const requestData = {
    amount,
    expiry: expiry || 0,
    currency,
  };

  console.log(`🚀 Place Bid API - NFT ID: ${nftId}`);
  console.log("📦 Request data:", requestData);
  console.log("🔑 Token:", token.substring(0, 20) + "...");

  const response = await fetch(`${API_BASE_URL}/nft/${nftId}/bid`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  console.log(`📡 Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error response:", errorText);
    throw new Error(`Failed to place bid: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log("✅ Place Bid API Response:", responseData);
  return responseData;
};

// Cancel bid on NFT - returns transaction metadata for signing
export const cancelBid = async (nftId: string) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  console.log(`🚀 Cancel Bid API - NFT ID: ${nftId}`);
  console.log("🔑 Token:", token.substring(0, 20) + "...");

  const response = await fetch(`${API_BASE_URL}/nft/${nftId}/bid/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log(`📡 Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error response:", errorText);
    throw new Error(`Failed to cancel bid: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log("✅ Cancel Bid API Response:", responseData);
  return responseData;
};

// Accept bid on NFT - returns transaction metadata for signing
export const acceptBid = async (nftId: string, bidderAddress: string) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  console.log(`🚀 Accept Bid API - NFT ID: ${nftId}, Bidder: ${bidderAddress}`);
  console.log("🔑 Token:", token.substring(0, 20) + "...");

  const response = await fetch(`${API_BASE_URL}/nft/${nftId}/bid/${bidderAddress}/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log(`📡 Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error response:", errorText);
    throw new Error(`Failed to accept bid: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log("✅ Accept Bid API Response:", responseData);
  return responseData;
};


