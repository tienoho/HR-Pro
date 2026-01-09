/**
 * Error Handler for HR-Pro
 * Centralized error handling with user-friendly messages
 */

import { ApiException, NetworkException, UnauthorizedException } from './apiClient';

// ============ Error Types ============

export interface FormattedError {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  details?: string[];
}

// ============ Error Messages ============

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu bị trùng lặp hoặc xung đột.',
  422: 'Dữ liệu không đúng định dạng.',
  429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  500: 'Lỗi hệ thống. Vui lòng thử lại sau.',
  502: 'Không thể kết nối đến máy chủ.',
  503: 'Dịch vụ tạm thời không khả dụng.',
};

// ============ Error Handler ============

export const formatError = (error: unknown): FormattedError => {
  // Network errors
  if (error instanceof NetworkException) {
    return {
      title: 'Lỗi kết nối',
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
      type: 'error',
    };
  }

  // Unauthorized
  if (error instanceof UnauthorizedException) {
    return {
      title: 'Phiên hết hạn',
      message: 'Vui lòng đăng nhập lại để tiếp tục.',
      type: 'warning',
    };
  }

  // API errors
  if (error instanceof ApiException) {
    const message = ERROR_MESSAGES[error.statusCode] || error.message;
    const details = error.errors?.map(e => e.message);

    return {
      title: `Lỗi (${error.statusCode})`,
      message,
      type: 'error',
      details,
    };
  }

  // Standard errors
  if (error instanceof Error) {
    return {
      title: 'Đã xảy ra lỗi',
      message: error.message,
      type: 'error',
    };
  }

  // Unknown errors
  return {
    title: 'Lỗi không xác định',
    message: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.',
    type: 'error',
  };
};

// ============ Error Logger ============

export const logError = (error: unknown, context?: string): void => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : '';
  
  if (error instanceof ApiException) {
    console.error(`${timestamp} ${contextStr} API Error:`, {
      status: error.statusCode,
      message: error.message,
      errors: error.errors,
    });
  } else if (error instanceof Error) {
    console.error(`${timestamp} ${contextStr} Error:`, error.message, error.stack);
  } else {
    console.error(`${timestamp} ${contextStr} Unknown Error:`, error);
  }
};

// ============ Toast Helper ============

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

// Simple toast state management - can be replaced with a library like react-hot-toast
let toastListeners: Array<(toast: ToastMessage) => void> = [];

export const toast = {
  subscribe: (listener: (toast: ToastMessage) => void): (() => void) => {
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  },

  show: (type: ToastType, title: string, message: string, duration: number = 5000): void => {
    const toastMessage: ToastMessage = {
      id: Date.now().toString(),
      type,
      title,
      message,
      duration,
    };
    toastListeners.forEach(listener => listener(toastMessage));
  },

  success: (message: string, title: string = 'Thành công'): void => {
    toast.show('success', title, message);
  },

  error: (message: string, title: string = 'Lỗi'): void => {
    toast.show('error', title, message, 8000);
  },

  warning: (message: string, title: string = 'Cảnh báo'): void => {
    toast.show('warning', title, message);
  },

  info: (message: string, title: string = 'Thông báo'): void => {
    toast.show('info', title, message);
  },

  // Show formatted error from exception
  fromError: (error: unknown, context?: string): void => {
    logError(error, context);
    const formatted = formatError(error);
    toast.show(formatted.type, formatted.title, formatted.message);
  },
};

export default toast;
