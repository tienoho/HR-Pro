/**
 * Authentication Service for HR-Pro
 * Handles login, logout, token management, and user info
 */

import { apiClient, tokenStorage, UnauthorizedException } from './apiClient';
import { 
  LoginRequest, 
  LoginResponse, 
  User, 
  ChangePasswordRequest,
  ApiResponse 
} from '../types/api';

// ============ Auth State ============

let currentUser: User | null = null;

// ============ Auth Service ============

export const authService = {
  /**
   * Login with username and password
   */
  login: async (username: string, password: string): Promise<{ user: User; accessToken: string }> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      { username, password } as LoginRequest,
      { skipAuth: true }
    );

    const { accessToken, refreshToken, user } = response.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    currentUser = user;

    return { user, accessToken };
  },

  /**
   * Logout user and clear tokens
   */
  logout: (): void => {
    tokenStorage.clearTokens();
    currentUser = null;
  },

  /**
   * Check if user has a valid token
   */
  hasValidToken: (): boolean => {
    return tokenStorage.hasValidToken();
  },

  /**
   * Get current user info from API
   */
  getCurrentUser: async (): Promise<User> => {
    if (currentUser) {
      return currentUser;
    }

    if (!tokenStorage.hasValidToken()) {
      throw new UnauthorizedException('Not authenticated');
    }

    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    currentUser = response.data;
    return currentUser;
  },

  /**
   * Get cached current user (synchronous)
   */
  getCachedUser: (): User | null => {
    return currentUser;
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post<ApiResponse<void>>(
      '/auth/change-password',
      { currentPassword, newPassword } as ChangePasswordRequest
    );
  },

  /**
   * Register new user (Admin only)
   */
  register: async (userData: {
    username: string;
    password: string;
    email?: string;
    fullName?: string;
    role?: 'ADMIN' | 'HR' | 'USER';
  }): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/auth/register', userData);
    return response.data;
  },

  /**
   * Initialize auth state from stored tokens
   * Call this on app startup
   */
  initialize: async (): Promise<User | null> => {
    if (!tokenStorage.hasValidToken()) {
      return null;
    }

    try {
      const user = await authService.getCurrentUser();
      return user;
    } catch (error) {
      // Token invalid or expired
      tokenStorage.clearTokens();
      return null;
    }
  },
};

// ============ Auth Event Listener ============

// Listen for logout events from apiClient (token refresh failure)
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    authService.logout();
    // Optionally redirect to login or show notification
    window.location.href = '/';
  });
}

export default authService;
