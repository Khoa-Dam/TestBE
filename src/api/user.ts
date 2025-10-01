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

// Clear authentication data
export const clearAuthData = () => {
  localStorage.removeItem("token");
  console.log("🔐 Authentication data cleared");
};
