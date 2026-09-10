function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return 'http://localhost:4000/api/v1';

  let url = raw.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }

  return url;
}

export const API_BASE_URL = getApiBaseUrl();

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ontime_admin_access_token',
  REFRESH_TOKEN: 'ontime_admin_refresh_token',
  USER: 'ontime_admin_user',
} as const;
