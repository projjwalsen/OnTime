import { z } from 'zod';
import { UserRole } from '@ontime/shared';

export const updateUserProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').trim().optional(),
  mobile: z.string().trim().optional(),
});

export const inviteUserSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  role: z.enum([UserRole.ADMIN, UserRole.STAFF], {
    message: 'Role must be either ADMIN or STAFF',
  }),
  organisationId: z.string().optional(),
});


// Alias for backwards compatibility
export const inviteStaffSchema = inviteUserSchema;

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type InviteStaffInput = InviteUserInput;
