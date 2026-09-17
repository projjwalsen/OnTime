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

  /**
   * JWT Authentication configuration
   */
  jwtSecret: optionalEnv(
    'JWT_SECRET',
    'ontime_dev_secret_key_change_in_production_min_32_chars_long',
  ),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '1d'),
  jwtRefreshSecret: optionalEnv(
    'JWT_REFRESH_SECRET',
    'ontime_dev_refresh_secret_key_change_in_production_min_32_chars_long',
  ),
  jwtRefreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  bcryptSaltRounds: parseInt(optionalEnv('BCRYPT_SALT_ROUNDS', '10'), 10),

  /**
   * Email / SMTP configuration
   */
  smtpHost: optionalEnv('SMTP_HOST', ''),
  smtpPort: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
  smtpSecure: optionalEnv('SMTP_SECURE', 'false') === 'true',
  smtpUser: optionalEnv('SMTP_USER', ''),
  smtpPass: optionalEnv('SMTP_PASS', ''),
  emailFrom: optionalEnv('EMAIL_FROM', 'OnTime Platform <noreply@ontime.com>'),

  /**
   * OTP Configuration
   */
  otpExpiryMinutes: parseInt(optionalEnv('OTP_EXPIRY_MINUTES', '10'), 10),
  otpMaxAttempts: parseInt(optionalEnv('OTP_MAX_ATTEMPTS', '5'), 10),
  otpCooldownSeconds: parseInt(optionalEnv('OTP_COOLDOWN_SECONDS', '60'), 10),

  /**
   * Supabase Storage / S3 Configuration
   */
  supabaseUrl: (() => {
    let rawUrl = optionalEnv('SUPABASE_URL', '');
    if (rawUrl && rawUrl.includes('.storage.supabase.co')) {
      const match = rawUrl.match(/https?:\/\/([^.]+)\.storage\.supabase\.co/);
      if (match && match[1]) {
        rawUrl = `https://${match[1]}.supabase.co`;
      }
    }
    return rawUrl ? rawUrl.replace(/\/+$/, '') : '';
  })(),
  supabaseKey: optionalEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    optionalEnv('SUPABASE_KEY', optionalEnv('SUPABASE_ANON_KEY', '')),
  ),
  supabaseBucket: optionalEnv('SUPABASE_STORAGE_BUCKET', 'product-images'),
} as const;

