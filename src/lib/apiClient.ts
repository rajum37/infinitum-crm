export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface ApiClientOptions extends RequestInit {
  // If true, we require the backend to return `{ success: true }` for mutations
  requireSuccessField?: boolean;
}

/**
 * Core fetch wrapper that automatically checks HTTP status and strict success signals.
 */
async function fetchWithValidation(url: string, options: ApiClientOptions = {}) {
  const { requireSuccessField = false, ...fetchOptions } = options;
  
  // Inject default headers (Content-Type and Auth)
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("nexus-token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, { ...fetchOptions, headers });
  
  // Attempt to parse JSON, fallback to text
  let data: any = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (e) {
      // Ignored
    }
  } else {
    data = await response.text();
  }

  // 1. Check HTTP Status OK
  if (!response.ok) {
    const errorMsg = data?.error || data?.message || "An error occurred during the request.";
    throw new ApiError(errorMsg, response.status, data);
  }

  // 2. Check strict success field for mutations if required
  // (We automatically skip this strict check for GET requests)
  if (requireSuccessField && fetchOptions.method && fetchOptions.method !== "GET") {
    if (data && typeof data === 'object' && data.success !== true) {
      throw new ApiError(data.error || "API did not return a explicit success confirmation.", response.status, data);
    }
  }

  return data;
}

/**
 * Standardized API client for the frontend.
 * Enforces strict error checking before resolving, preventing accidental redirects on failure.
 */
export const apiClient = {
  get: (url: string, options?: Omit<ApiClientOptions, 'method'>) => 
    fetchWithValidation(url, { ...options, method: 'GET', requireSuccessField: false }),
    
  post: (url: string, data?: any, options?: Omit<ApiClientOptions, 'method' | 'body'>) => 
    fetchWithValidation(url, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
    
  put: (url: string, data?: any, options?: Omit<ApiClientOptions, 'method' | 'body'>) => 
    fetchWithValidation(url, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
    
  patch: (url: string, data?: any, options?: Omit<ApiClientOptions, 'method' | 'body'>) => 
    fetchWithValidation(url, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
    
  delete: (url: string, options?: Omit<ApiClientOptions, 'method'>) => 
    fetchWithValidation(url, { ...options, method: 'DELETE' }),
};
