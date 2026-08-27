/**
 * Platform-level constants for the OnTime Distributor Order Management Platform.
 */

export const PLATFORM_NAME = 'OnTime' as const;

export const API_VERSION = 'v1' as const;

export const API_PREFIX = `/api/${API_VERSION}` as const;

/** Default invitation expiry in days */
export const INVITATION_EXPIRY_DAYS = 7 as const;

/** Default page size for paginated endpoints */
export const DEFAULT_PAGE_SIZE = 20 as const;

/** Maximum page size allowed for paginated endpoints */
export const MAX_PAGE_SIZE = 100 as const;
