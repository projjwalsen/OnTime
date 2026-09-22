export interface ActiveSession {
  id: string;
  tokenPreview: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
  isCurrentSession: boolean;
  createdAt: Date | string;
  lastActiveAt: Date | string;
  expiresAt: Date | string;
}

export interface SignInActivityItem {
  id: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  device?: string | null;
  location?: string | null;
  isSuccess: boolean;
  createdAt: Date | string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
}

export interface ToggleTwoFactorDto {
  enabled: boolean;
  password?: string;
}
