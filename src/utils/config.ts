// Environment configuration
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  appName: import.meta.env.VITE_APP_NAME || 'Task Management',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
};
