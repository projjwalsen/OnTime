import { type NotificationPreference } from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import { type UpdateNotificationPreferencesInput } from './validator';

export class NotificationsService {
  /**
   * Get user's notification preferences.
   * If not created yet, returns default preferences and creates the record.
   */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId,
          orderUpdates: true,
          draftReminders: true,
          marketingUpdates: false,
        },
      });
    }

    return {
      id: pref.id,
      userId: pref.userId,
      orderUpdates: pref.orderUpdates,
      draftReminders: pref.draftReminders,
      marketingUpdates: pref.marketingUpdates,
      createdAt: pref.createdAt,
      updatedAt: pref.updatedAt,
    };
  }

  /**
   * Update user's notification preferences.
   */
  async updatePreferences(
    userId: string,
    data: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreference> {
    const pref = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        orderUpdates: data.orderUpdates !== undefined ? data.orderUpdates : true,
        draftReminders: data.draftReminders !== undefined ? data.draftReminders : true,
        marketingUpdates: data.marketingUpdates !== undefined ? data.marketingUpdates : false,
      },
      update: {
        ...(data.orderUpdates !== undefined && { orderUpdates: data.orderUpdates }),
        ...(data.draftReminders !== undefined && { draftReminders: data.draftReminders }),
        ...(data.marketingUpdates !== undefined && { marketingUpdates: data.marketingUpdates }),
      },
    });

    return {
      id: pref.id,
      userId: pref.userId,
      orderUpdates: pref.orderUpdates,
      draftReminders: pref.draftReminders,
      marketingUpdates: pref.marketingUpdates,
      createdAt: pref.createdAt,
      updatedAt: pref.updatedAt,
    };
  }
}

export const notificationsService = new NotificationsService();
