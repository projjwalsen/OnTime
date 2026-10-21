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
 * Strips accidental localhost:4000 / 127.0.0.1:4000 prefixes so images
 * correctly load from the current server domain / IP or through Next.js rewrites.
 */
export function getMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If the URL contains /uploads/...
  const uploadsIdx = trimmed.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const relativePath = trimmed.slice(uploadsIdx); // e.g. "/uploads/products/2026-10/xxx.png"

    if (typeof window !== 'undefined') {
      const rawApi = process.env.NEXT_PUBLIC_API_URL;
      // If NEXT_PUBLIC_API_URL is an external origin (not localhost), point there:
      if (
        rawApi &&
        (rawApi.startsWith('http://') || rawApi.startsWith('https://')) &&
        !rawApi.includes('localhost') &&
        !rawApi.includes('127.0.0.1')
      ) {
        const origin = rawApi.replace(/\/api\/v\d+.*$/, '');
        return `${origin}${relativePath}`;
      }

      // Root-relative path: browser fetches from current origin (rewritten by Next.js / Nginx)
      return relativePath;
    }

    return `${SERVER_BASE_URL}${relativePath}`;
  }

  // If it's a relative path starting with /api
  if (trimmed.startsWith('/api')) {
    return `${SERVER_BASE_URL}${trimmed}`;
  }

  return trimmed;
}

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ontime_admin_access_token',
  REFRESH_TOKEN: 'ontime_admin_refresh_token',
  USER: 'ontime_admin_user',
} as const;
