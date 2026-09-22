/**
 * Types and interfaces for the OnTime Email Service.
 */

export interface SentEmailRecord {
  to: string;
  subject: string;
  text: string;
  html: string;
  timestamp: Date;
  messageId?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailJob {
  id: string;
  options: SendEmailOptions;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface EmailQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
}

export interface SmtpHealthStatus {
  configured: boolean;
  connected: boolean;
  host: string;
  port: number;
  secure: boolean;
  pool: boolean;
  error?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// Order item payload for emails
export interface OrderEmailItem {
  name: string;
  sku?: string;
  variant?: string | null;
  quantity: number;
  originalQuantity?: number | null;
  unitPrice: number;
  totalPrice: number;
}

// Order payload for emails
export interface OrderEmailData {
  orderNumber: string;
  organisationName: string;
  customerName: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  items: OrderEmailItem[];
  deliveryAddress?: string | null;
  notes?: string | null;
  modificationNote?: string | null;
  status?: string;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  createdAt: Date | string;
}

// Staff Credentials email payload
export interface StaffCredentialsEmailData {
  name: string;
  username: string;
  temporaryPassword: string;
  organisationName?: string;
  loginUrl?: string;
}

// Organisation status change email payload
export interface OrganisationStatusChangeEmailData {
  organisationName: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
}
