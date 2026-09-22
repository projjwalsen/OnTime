import type { Transporter } from 'nodemailer';
import { config } from '../../config/env';
import { createSmtpTransporter, verifySmtpConnection } from './email.transporter';
import { EmailQueue } from './email.queue';
import type {
  EmailQueueStats,
  OrderEmailData,
  OrganisationStatusChangeEmailData,
  SendEmailOptions,
  SentEmailRecord,
  SmtpHealthStatus,
  StaffCredentialsEmailData,
} from './email.types';
import {
  renderLoginOtpTemplate,
  renderOrderCancelledTemplate,
  renderOrderConfirmationTemplate,
  renderOrderStatusUpdateTemplate,
  renderPartialOrderAwaitingTemplate,
  renderPartialOrderApprovedTemplate,
  renderPartialOrderRejectedTemplate,
  renderOrganisationInvitationTemplate,
  renderOrganisationStatusChangeTemplate,
  renderOrganisationWelcomeTemplate,
  renderPasswordChangedTemplate,
  renderPasswordResetOtpTemplate,
  renderRegistrationOtpTemplate,
  renderStaffCredentialsTemplate,
  renderBaseTemplate,
} from './templates';

export class EmailService {
  private transporter: Transporter | null = null;
  private queue: EmailQueue;
  public sentEmails: SentEmailRecord[] = []; // In-memory history for testing / debugging

  constructor() {
    this.transporter = createSmtpTransporter();
    this.queue = new EmailQueue(3);
    // Wire the worker queue to send using the internal dispatcher
    this.queue.setHandler(async (options: SendEmailOptions) => {
      await this.sendMailImmediate(options);
    });
  }

  /**
   * Check SMTP connectivity.
   */
  public async verifyConnection(): Promise<SmtpHealthStatus> {
    return verifySmtpConnection(this.transporter);
  }

  /**
   * Get queue statistics for monitoring.
   */
  public getQueueStats(): EmailQueueStats {
    return this.queue.getStats();
  }

  /**
   * Clear in-memory history (useful in test setups).
   */
  public clearSentEmails(): void {
    this.sentEmails = [];
    this.queue.clear();
  }

  /**
   * Drain any queued emails (useful in tests).
   */
  public async drainQueue(): Promise<void> {
    await this.queue.drain();
  }

  /**
   * Helper to fetch the most recent email sent to a specific address.
   */
  public getLastEmailTo(to: string): SentEmailRecord | undefined {
    return [...this.sentEmails].reverse().find((e) => e.to.toLowerCase() === to.toLowerCase());
  }

  /**
   * Enqueue an email to be sent asynchronously in the background.
   * Does not block the HTTP request cycle.
   */
  public enqueueEmail(options: SendEmailOptions, maxAttempts = 3): string {
    return this.queue.enqueue(options, maxAttempts);
  }

  /**
   * Immediate email dispatch with automatic retries and timeout protection.
   */
  public async sendMailImmediate(
    options: SendEmailOptions,
    retries = 2,
  ): Promise<SentEmailRecord> {
    const toAddress = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const record: SentEmailRecord = {
      to: toAddress,
      subject: options.subject,
      text: options.text || '',
      html: options.html || '',
      timestamp: new Date(),
    };

    // Store in-memory for testing/development inspection
    this.sentEmails.push(record);

    if (this.transporter) {
      let attempt = 0;
      let lastError: unknown;

      while (attempt <= retries) {
        try {
          const info = await this.transporter.sendMail({
            from: config.emailFrom,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            replyTo: options.replyTo,
            cc: options.cc,
            bcc: options.bcc,
            attachments: options.attachments,
            priority: options.priority,
          });

          record.messageId = info?.messageId;
          return record;
        } catch (err) {
          attempt++;
          lastError = err;
          if (attempt <= retries) {
            // Jittered backoff: 300ms, 600ms...
            const delay = Math.floor(300 * Math.pow(2, attempt - 1) + Math.random() * 100);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      console.error('[EmailService] Failed to send email via SMTP transporter after retries:', lastError);

      if (!config.isProduction) {
        console.warn('[EmailService] Development fallback: email captured in memory / console.');
      } else {
        throw lastError;
      }
    }

    // Dev/Test fallback logging
    if (config.isDevelopment || config.isTest) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 [EMAIL SENT (DEV/MOCK)]`);
      console.log(`To:      ${toAddress}`);
      console.log(`From:    ${config.emailFrom}`);
      console.log(`Subject: ${options.subject}`);
      if (options.text) {
        console.log(`Message: \n${options.text}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return record;
  }

  /**
   * Standard alias for backward compatibility.
   */
  public async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    await this.sendMailImmediate(options);
  }

  // ============================================================
  // AUTHENTICATION & SECURITY TRANSACTIONAL EMAILS
  // ============================================================

  /**
   * Send Login OTP verification code.
   */
  public async sendLoginOtpEmail(email: string, otp: string, expiresInMinutes = 10): Promise<void> {
    const rendered = renderLoginOtpTemplate(otp, expiresInMinutes);
    await this.sendMailImmediate({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      priority: 'high',
    });
  }

  /**
   * Send Password Reset OTP verification code.
   */
  public async sendPasswordResetOtpEmail(
    email: string,
    otp: string,
    expiresInMinutes = 10,
  ): Promise<void> {
    const rendered = renderPasswordResetOtpTemplate(otp, expiresInMinutes);
    await this.sendMailImmediate({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      priority: 'high',
    });
  }

  /**
   * Send Retailer Registration OTP code.
   */
  public async sendRegistrationOtpEmail(
    email: string,
    otp: string,
    expiresInMinutes = 10,
    businessName?: string,
  ): Promise<void> {
    const rendered = renderRegistrationOtpTemplate(otp, expiresInMinutes, businessName);
    await this.sendMailImmediate({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      priority: 'high',
    });
  }

  /**
   * Send Auto-Generated Staff Credentials Welcome email.
   */
  public async sendStaffCredentialsEmail(
    email: string,
    data: StaffCredentialsEmailData,
  ): Promise<void> {
    const rendered = renderStaffCredentialsTemplate(data);
    // Staff credentials can be sent immediately or enqueued in background
    await this.sendMailImmediate({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  /**
   * Send Password Changed Security Notification.
   */
  public async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const rendered = renderPasswordChangedTemplate(name);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  // ============================================================
  // ORDER TRANSACTIONAL EMAILS
  // ============================================================

  /**
   * Send Order Confirmation Email to retailer.
   */
  public async sendOrderConfirmationEmail(email: string, data: OrderEmailData): Promise<void> {
    const rendered = renderOrderConfirmationTemplate(data);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  /**
   * Send Order Status Update Email.
   */
  public async sendOrderStatusUpdateEmail(
    email: string,
    data: OrderEmailData,
    previousStatus: string,
    newStatus: string,
  ): Promise<void> {
    const rendered = renderOrderStatusUpdateTemplate(data, previousStatus, newStatus);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  /**
   * Send Order Cancellation Email.
   */
  public async sendOrderCancelledEmail(email: string, data: OrderEmailData): Promise<void> {
    const rendered = renderOrderCancelledTemplate(data);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  /**
   * Send Partial / Modified Order Notification Email to Retailer.
   */
  public async sendPartialOrderAwaitingEmail(
    email: string,
    data: OrderEmailData,
  ): Promise<void> {
    const rendered = renderPartialOrderAwaitingTemplate(data);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      priority: 'high',
    });
  }

  /**
   * Send Partial Order Approved Notification to Super Admin.
   */
  public async sendPartialOrderApprovedEmail(
    email: string | string[],
    data: OrderEmailData,
  ): Promise<void> {
    const rendered = renderPartialOrderApprovedTemplate(data);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      priority: 'high',
    });
  }

  /**
   * Send Partial Order Rejected Notification to Super Admin.
   */
  public async sendPartialOrderRejectedEmail(
    email: string | string[],
    data: OrderEmailData,
  ): Promise<void> {
    const rendered = renderPartialOrderRejectedTemplate(data);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      priority: 'high',
    });
  }


  // ============================================================
  // ORGANISATION TRANSACTIONAL EMAILS
  // ============================================================

  /**
   * Send Welcome Email when a retailer organisation is activated.
   */
  public async sendOrganisationWelcomeEmail(
    email: string,
    orgName: string,
    contactName: string,
    portalUrl?: string,
  ): Promise<void> {
    const rendered = renderOrganisationWelcomeTemplate(orgName, contactName, portalUrl);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  /**
   * Send Notification when an organisation's status is modified.
   */
  public async sendOrganisationStatusChangeEmail(
    email: string,
    data: OrganisationStatusChangeEmailData,
  ): Promise<void> {
    const rendered = renderOrganisationStatusChangeTemplate(data);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  /**
   * Send Staff Invitation link to join an organisation.
   */
  public async sendOrganisationInvitationEmail(
    email: string,
    orgName: string,
    inviteLink: string,
    role = 'STAFF',
    inviterName?: string,
  ): Promise<void> {
    const rendered = renderOrganisationInvitationTemplate(orgName, inviteLink, role, inviterName);
    this.enqueueEmail({
      to: email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  /**
   * Send Custom Branded Email.
   */
  public async sendCustomEmail(
    to: string,
    subject: string,
    title: string,
    contentHtml: string,
    contentText: string,
  ): Promise<void> {
    const html = renderBaseTemplate({
      title,
      content: contentHtml,
    });

    this.enqueueEmail({
      to,
      subject,
      text: contentText,
      html,
    });
  }
}

export const emailService = new EmailService();
