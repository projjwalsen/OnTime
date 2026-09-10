export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ontime_admin_access_token',
  REFRESH_TOKEN: 'ontime_admin_refresh_token',
  USER: 'ontime_admin_user',
} as const;
