import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../../config/env';
import type { SmtpHealthStatus } from './email.types';

export interface TransporterOptions {
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
  rateDelta?: number;
  rateLimit?: number;
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
}

/**
 * Creates and configures a pooled Nodemailer SMTP transporter.
 */
export function createSmtpTransporter(options?: TransporterOptions): Transporter | null {
  if (!config.smtpHost || !config.smtpUser) {
    return null;
  }

  const pool = options?.pool ?? true;
  const maxConnections = options?.maxConnections ?? 5;
  const maxMessages = options?.maxMessages ?? 100;
  const connectionTimeout = options?.connectionTimeout ?? 10000; // 10s
  const greetingTimeout = options?.greetingTimeout ?? 5000; // 5s
  const socketTimeout = options?.socketTimeout ?? 15000; // 15s

  // Auto-detect secure mode:
  // Port 465 requires implicit TLS (secure: true).
  // Port 587, 25, 2525 use explicit STARTTLS (secure: false).
  const isSecure = config.smtpPort === 465 ? true : config.smtpSecure;

  return nodemailer.createTransport({
    pool,
    maxConnections,
    maxMessages,
    host: config.smtpHost,
    port: config.smtpPort,
    secure: isSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    ...(options?.rateDelta && options?.rateLimit
      ? { rateDelta: options.rateDelta, rateLimit: options.rateLimit }
      : {}),
  } as any);
}

/**
 * Checks connectivity to the SMTP server.
 */
export async function verifySmtpConnection(
  transporter: Transporter | null,
): Promise<SmtpHealthStatus> {
  const isConfigured = Boolean(config.smtpHost && config.smtpUser);
  const isSecure = config.smtpPort === 465 ? true : config.smtpSecure;

  if (!isConfigured || !transporter) {
    return {
      configured: false,
      connected: false,
      host: config.smtpHost || 'none',
      port: config.smtpPort,
      secure: isSecure,
      pool: false,
    };
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP connection verification timed out after 2000ms')), 2000),
    );
    await Promise.race([transporter.verify(), timeoutPromise]);
    return {
      configured: true,
      connected: true,
      host: config.smtpHost,
      port: config.smtpPort,
      secure: isSecure,
      pool: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      connected: false,
      host: config.smtpHost,
      port: config.smtpPort,
      secure: isSecure,
      pool: true,
      error: errorMsg,
    };
  }
}
