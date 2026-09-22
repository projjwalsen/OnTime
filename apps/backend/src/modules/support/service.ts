import {
  type SupportTicket,
  type SupportTopicOption,
  SupportTopic,
  TicketStatus,
  UserRole,
  type AuthContext,
} from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import { type CreateSupportTicketInput } from './validator';

export class SupportError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'SupportError';
  }
}

export class SupportService {
  /**
   * Get predefined list of support topics with titles and descriptions.
   */
  getTopics(): SupportTopicOption[] {
    return [
      {
        id: SupportTopic.ORDER_DELIVERY,
        title: 'Order & delivery help',
        description: 'Tracking, delays, cancellations and returns',
      },
      {
        id: SupportTopic.PAYMENTS_BILLING,
        title: 'Payments & billing',
        description: 'Invoices, payment issues and tax documents',
      },
      {
        id: SupportTopic.PRODUCTS_STOCK,
        title: 'Products & stock',
        description: 'Availability, variants and pricing questions',
      },
      {
        id: SupportTopic.ACCOUNT_ACCESS,
        title: 'Account & access',
        description: 'Profile, password and login support',
      },
      {
        id: SupportTopic.GENERAL_INQUIRY,
        title: 'General inquiry',
        description: 'Other questions or general distributor assistance',
      },
    ];
  }

  /**
   * Submit a new support ticket.
   */
  async createTicket(caller: AuthContext, data: CreateSupportTicketInput): Promise<SupportTicket> {
    const organisationId = caller.organisationId;
    if (!organisationId) {
      throw new SupportError('Organisation context required to submit support ticket.', 400);
    }

    // Generate unique sequential ticket number: TKT-10001
    const count = await prisma.supportTicket.count();
    const ticketNumber = `TKT-${(10000 + count + 1).toString()}`;

    const created = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        organisationId,
        userId: caller.userId,
        topic: data.topic,
        orderNumber: data.orderNumber?.trim() || null,
        subject: data.subject.trim(),
        message: data.message.trim(),
        attachments: data.attachments || [],
        status: TicketStatus.OPEN,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organisation: { select: { id: true, name: true } },
      },
    });

    return {
      id: created.id,
      ticketNumber: created.ticketNumber,
      organisationId: created.organisationId,
      userId: created.userId,
      topic: created.topic as SupportTopic,
      orderNumber: created.orderNumber,
      subject: created.subject,
      message: created.message,
      attachments: created.attachments,
      status: created.status as TicketStatus,
      user: created.user,
      organisation: created.organisation,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  /**
   * List support tickets scoped to caller's organisation (or all for Super Admin).
   */
  async listTickets(caller: AuthContext): Promise<SupportTicket[]> {
    const where: any = {};
    if (caller.role !== UserRole.SUPER_ADMIN) {
      where.organisationId = caller.organisationId;
    }

    const list = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        organisation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      organisationId: t.organisationId,
      userId: t.userId,
      topic: t.topic as SupportTopic,
      orderNumber: t.orderNumber,
      subject: t.subject,
      message: t.message,
      attachments: t.attachments,
      status: t.status as TicketStatus,
      user: t.user,
      organisation: t.organisation,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  /**
   * Get support ticket by ID.
   */
  async getTicketById(id: string, caller: AuthContext): Promise<SupportTicket | null> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organisation: { select: { id: true, name: true } },
      },
    });

    if (!ticket) return null;

    if (caller.role !== UserRole.SUPER_ADMIN && ticket.organisationId !== caller.organisationId) {
      throw new SupportError('Forbidden: Cannot access ticket from another organisation.', 403);
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      organisationId: ticket.organisationId,
      userId: ticket.userId,
      topic: ticket.topic as SupportTopic,
      orderNumber: ticket.orderNumber,
      subject: ticket.subject,
      message: ticket.message,
      attachments: ticket.attachments,
      status: ticket.status as TicketStatus,
      user: ticket.user,
      organisation: ticket.organisation,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}

export const supportService = new SupportService();
