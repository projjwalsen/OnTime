import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ message: 'Refresh token is required' })
    .min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ message: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(8, 'New password must be at least 8 characters long'),
});

export const acceptInvitationSchema = z.object({
  token: z
    .string({ message: 'Invitation token is required' })
    .min(1, 'Invitation token is required'),
  name: z
    .string({ message: 'Name is required' })
    .min(2, 'Name must be at least 2 characters long')
    .trim(),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  mobile: z.string().optional(),
});

export const verifyInvitationQuerySchema = z.object({
  token: z
    .string({ message: 'Invitation token is required' })
    .min(1, 'Invitation token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string({ message: 'Reset token is required' }).min(1, 'Reset token is required'),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(8, 'New password must be at least 8 characters long'),
});

export const registerRetailerSchema = z.object({
  name: z
    .string({ message: 'Full name is required' })
    .min(2, 'Name must be at least 2 characters long')
    .trim(),
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  mobile: z.string().optional(),
  businessName: z
    .string({ message: 'Business name is required' })
    .min(2, 'Business name must be at least 2 characters long')
    .trim(),
  address: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  taxNumber: z.string().optional(),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RegisterRetailerInput = z.infer<typeof registerRetailerSchema>;
