import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/env';

export interface SentEmailRecord {
  to: string;
  subject: string;
  text: string;
  html: string;
  timestamp: Date;
}

export class EmailService {
  private transporter: Transporter | null = null;
  public sentEmails: SentEmailRecord[] = []; // In-memory history for testing / debugging

  constructor() {
    if (config.smtpHost && config.smtpUser) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
    }
  }

  /**
   * Helper to send or log an email.
   */
  async sendMail(options: { to: string; subject: string; text: string; html: string }): Promise<void> {
    const record: SentEmailRecord = {
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      timestamp: new Date(),
    };

    if (config.isTest) {
      this.sentEmails.push(record);
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: config.emailFrom,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        return;
      } catch (err) {
        console.error('[EmailService] Failed to send email via SMTP transporter:', err);
        // Fallback to logging in dev if SMTP fails
        if (!config.isProduction) {
          console.warn('[EmailService] Falling back to console log.');
        } else {
          throw err;
        }
      }
    }

    // Dev/Test fallback logging
    if (config.isDevelopment || config.isTest) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 [EMAIL SENT (DEV/MOCK)]`);
      console.log(`To:      ${options.to}`);
      console.log(`From:    ${config.emailFrom}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Message: \n${options.text}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }

  /**
   * Send Login OTP Email.
   */
  async sendLoginOtpEmail(email: string, otp: string, expiresInMinutes = 10): Promise<void> {
    const subject = `${otp} is your OnTime verification code for Login`;
    const text = `Hello,\n\nYour One-Time Password (OTP) for logging into OnTime is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes. If you did not request this code, please ignore this email or contact support if you suspect unauthorized access.\n\nBest regards,\nOnTime Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #2563eb; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .description { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .otp-card { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: 'Courier New', Courier, monospace; margin: 0; }
    .meta-text { font-size: 13px; color: #64748b; margin-top: 8px; margin-bottom: 0; }
    .warning { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OnTime</h1>
    </div>
    <div class="content">
      <div class="greeting">Sign in to your account</div>
      <p class="description">Use the verification code below to complete your login. This code is valid for <strong>${expiresInMinutes} minutes</strong>.</p>
      
      <div class="otp-card">
        <p class="otp-code">${otp}</p>
        <p class="meta-text">Valid for ${expiresInMinutes} minutes</p>
      </div>

      <div class="warning">
        <strong>Security Notice:</strong> Never share this code with anyone. OnTime staff will never ask for your verification code. If you did not initiate this login request, please contact support.
      </div>
    </div>
  </div>
  <div class="footer">
    &copy; ${new Date().getFullYear()} OnTime. All rights reserved.
  </div>
</body>
</html>
    `;

    await this.sendMail({ to: email, subject, text, html });
  }

  /**
   * Send Password Reset OTP Email.
   */
  async sendPasswordResetOtpEmail(email: string, otp: string, expiresInMinutes = 10): Promise<void> {
    const subject = `${otp} is your OnTime password reset code`;
    const text = `Hello,\n\nWe received a request to reset your password for OnTime. Your password reset code is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes. If you did not request a password reset, please ignore this email or secure your account.\n\nBest regards,\nOnTime Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #2563eb; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .description { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .otp-card { background: #fef2f2; border: 2px dashed #fecaca; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #dc2626; font-family: 'Courier New', Courier, monospace; margin: 0; }
    .meta-text { font-size: 13px; color: #991b1b; margin-top: 8px; margin-bottom: 0; }
    .warning { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OnTime</h1>
    </div>
    <div class="content">
      <div class="greeting">Reset your password</div>
      <p class="description">We received a request to reset your password. Use the verification code below to set a new password. This code is valid for <strong>${expiresInMinutes} minutes</strong>.</p>
      
      <div class="otp-card">
        <p class="otp-code">${otp}</p>
        <p class="meta-text">Valid for ${expiresInMinutes} minutes</p>
      </div>

      <div class="warning">
        <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email or update your security settings immediately.
      </div>
    </div>
  </div>
  <div class="footer">
    &copy; ${new Date().getFullYear()} OnTime. All rights reserved.
  </div>
</body>
</html>
    `;

    await this.sendMail({ to: email, subject, text, html });
  }
}

export const emailService = new EmailService();
