import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { type JwtPayload } from '@ontime/shared';
import { config } from '../config/env';

/**
 * Sign a JWT access token containing the authenticated user's AuthContext.
 */
export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as unknown as number,
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

/**
 * Sign a JWT refresh token containing the user ID with a unique jwtid.
 */
export function signRefreshToken(payload: { userId: string }): string {
  const options: SignOptions = {
    expiresIn: config.jwtRefreshExpiresIn as unknown as number,
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign(payload, config.jwtRefreshSecret, options);
}

/**
 * Verify and decode a JWT access token.
 * Throws an error if invalid or expired.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

/**
 * Verify and decode a JWT refresh token.
 * Throws an error if invalid or expired.
 */
export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, config.jwtRefreshSecret) as { userId: string };
}

/**
 * Calculate token expiry duration in seconds from a duration string (e.g. '15m', '1h', '7d').
 */
export function parseDurationToSeconds(duration?: string): number {
  if (!duration) return 900;
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match || !match[1] || !match[2]) return 900; // default 15m (900 seconds)
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return val;
    case 'm':
      return val * 60;
    case 'h':
      return val * 3600;
    case 'd':
      return val * 86400;
    default:
      return 900;
  }
}
