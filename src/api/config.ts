// Backend API configuration
export const API_BASE_URL = "http://localhost:3000/api";
// Note: Using HTTP instead of HTTPS for localhost development

// Helper function to log API calls for debugging
export const apiCall = async (url: string, options?: RequestInit) => {
  console.log(`🌐 API Call: ${url}`, options);
  const response = await fetch(url, options);
  console.log(`📡 API Response: ${response.status} ${response.statusText}`);
  return response;
};
