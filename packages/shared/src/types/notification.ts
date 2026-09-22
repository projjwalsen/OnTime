export interface NotificationPreference {
  id: string;
  userId: string;
  orderUpdates: boolean;
  draftReminders: boolean;
  marketingUpdates: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpdateNotificationPreferenceDto {
  orderUpdates?: boolean;
  draftReminders?: boolean;
  marketingUpdates?: boolean;
}
