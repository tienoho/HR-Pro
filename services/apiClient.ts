/**
 * API Client for HR-Pro
 * Provides HTTP client with JWT authentication, token refresh, and error handling
 */

import { ApiResponse, ApiError, RefreshTokenResponse } from '../types/api';

// ============ Configuration ============

const getApiBaseUrl = (): string => {
  // Check for environment variable first
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback based on hostname
  return window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';
};

const API_BASE_URL = getApiBaseUrl();
const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'hr_pro_access_token';
const REFRESH_TOKEN_KEY = import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY || 'hr_pro_refresh_token';

// ============ Token Management ============

export const tokenStorage = {
  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  hasValidToken: (): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    
    // Basic JWT expiration check
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
};

// ============ Error Classes ============

export class ApiException extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export class NetworkException extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkException';
  }
}

export class UnauthorizedException extends ApiException {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedException';
  }
}

// ============ Refresh Token Logic ============

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new UnauthorizedException('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    tokenStorage.clearTokens();
    throw new UnauthorizedException('Token refresh failed');
  }

  const data: ApiResponse<RefreshTokenResponse> = await response.json();
  tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
  return data.data.accessToken;
};

// ============ Main API Client ============

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retry?: boolean;
}

const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, retry = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add Authorization header if not skipped
  if (!skipAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Handle 401 Unauthorized
    if (response.status === 401 && !skipAuth && retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);
          
          // Retry the original request
          return request<T>(endpoint, { ...options, retry: false });
        } catch (refreshError) {
          isRefreshing = false;
          tokenStorage.clearTokens();
          // Dispatch event for app to handle logout
          window.dispatchEvent(new CustomEvent('auth:logout'));
          throw new UnauthorizedException('Session expired');
        }
      } else {
        // Wait for token refresh
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
            fetch(url, { ...fetchOptions, headers })
              .then(res => res.json())
              .then(resolve)
              .catch(reject);
          });
        });
      }
    }

    // Handle other error responses
    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        success: false,
        message: `HTTP Error: ${response.status}`,
      }));
      throw new ApiException(response.status, errorData.message, errorData.errors);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new NetworkException(`Request timeout after ${TIMEOUT}ms`);
    }
    
    if (error instanceof ApiException || error instanceof UnauthorizedException) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkException('Unable to connect to server');
    }
    throw error;
  }
}

// ============ HTTP Method Helpers ============

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> => {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete: <T>(endpoint: string, options?: RequestOptions): Promise<T> => {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  // Special method for file uploads
  upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const token = tokenStorage.getAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - browser will set it with boundary

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        success: false,
        message: `Upload failed: ${response.status}`,
      }));
      throw new ApiException(response.status, errorData.message, errorData.errors);
    }

    return response.json();
  },
};

export default apiClient;
