// Backend API configuration
export const API_BASE_URL = "http://localhost:3000/api";
// Note: Using HTTP instead of HTTPS for localhost development

// Helper function to log API calls for debugging
export const apiCall = async (url: string, options?: RequestInit) => {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const finalOptions: RequestInit = { ...options, headers };
  console.log(`🌐 API Call: ${url}`, finalOptions);
  const response = await fetch(url, finalOptions);
  console.log(`📡 API Response: ${response.status} ${response.statusText}`);
  return response;
};
