import 'dotenv/config';

/**
 * Validated environment configuration.
 * All required env vars are checked at startup.
 * The application will fail fast if any required variable is missing.
 *
 * Never hardcode secrets here — always read from process.env.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Config] Missing required environment variable: ${key}\n` +
        `  Hint: Copy .env.example to .env and fill in the values.`,
    );
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  /**
   * Server configuration
   */
  port: parseInt(optionalEnv('PORT', '4000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: optionalEnv('NODE_ENV', 'development') === 'production',
  isTest: optionalEnv('NODE_ENV', 'development') === 'test',

  /**
   * Database configuration
   * Validated at startup — app will not start without a valid DATABASE_URL.
   */
  databaseUrl: requireEnv('DATABASE_URL'),

  /**
   * CORS configuration
   * Comma-separated list of allowed origins.
   */
  corsOrigin: optionalEnv('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
} as const;
