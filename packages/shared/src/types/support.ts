export enum SupportTopic {
  ORDER_DELIVERY = 'ORDER_DELIVERY',
  PAYMENTS_BILLING = 'PAYMENTS_BILLING',
  PRODUCTS_STOCK = 'PRODUCTS_STOCK',
  ACCOUNT_ACCESS = 'ACCOUNT_ACCESS',
  GENERAL_INQUIRY = 'GENERAL_INQUIRY',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface SupportTopicOption {
  id: SupportTopic;
  title: string;
  description: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  organisationId: string;
  userId: string;
  topic: SupportTopic;
  orderNumber?: string | null;
  subject: string;
  message: string;
  attachments: string[];
  status: TicketStatus;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  organisation?: {
    id: string;
    name: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSupportTicketDto {
  topic: SupportTopic;
  orderNumber?: string;
  subject: string;
  message: string;
  attachments?: string[];
}
