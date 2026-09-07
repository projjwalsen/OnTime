import bcrypt from 'bcryptjs';
import { config } from '../config/env';

/**
 * Hash a plain text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
