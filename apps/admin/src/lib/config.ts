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
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+.*$/, '');

/**
 * Normalizes an image or media URL for browser display.
 * Handles full URLs, relative /uploads URLs, data URLs, etc.
 */
export function getMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If it's a relative path starting with /uploads or /api
  if (trimmed.startsWith('/uploads') || trimmed.startsWith('/api')) {
    return `${SERVER_BASE_URL}${trimmed}`;
  }

  return trimmed;
}

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ontime_admin_access_token',
  REFRESH_TOKEN: 'ontime_admin_refresh_token',
  USER: 'ontime_admin_user',
} as const;
