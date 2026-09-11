import { z } from 'zod';
import { UserRole } from '@ontime/shared';

export const updateUserProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').trim().optional(),
  mobile: z.string().trim().optional(),
});

export const onboardUserSchema = z.object({
  name: z
    .string({ message: 'Full name is required' })
    .min(2, 'Name must be at least 2 characters long')
    .trim(),
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  role: z.enum([UserRole.ADMIN, UserRole.STAFF], {
    message: 'Role must be either ADMIN or STAFF',
  }),
  mobile: z.string().trim().optional(),
  organisationId: z.string().optional(),
});

// Alias for backwards compatibility
export const inviteUserSchema = onboardUserSchema;
export const inviteStaffSchema = onboardUserSchema;

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type OnboardUserInput = z.infer<typeof onboardUserSchema>;
export type InviteUserInput = OnboardUserInput;
export type InviteStaffInput = OnboardUserInput;

