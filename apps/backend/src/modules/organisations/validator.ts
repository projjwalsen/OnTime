import { z } from 'zod';
import { OrganisationStatus } from '@ontime/shared';

export const createOrganisationSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .trim(),
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  taxNumber: z.string().optional(),
});

export const updateOrganisationSchema = z.object({
  name: z.string().min(2).trim().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  taxNumber: z.string().optional(),
  status: z
    .enum([OrganisationStatus.ACTIVE, OrganisationStatus.INACTIVE, OrganisationStatus.SUSPENDED])
    .optional(),
});

export const organisationFilterQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z
    .enum([OrganisationStatus.ACTIVE, OrganisationStatus.INACTIVE, OrganisationStatus.SUSPENDED])
    .optional(),
  city: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;
export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>;
export type OrganisationFilterInput = z.infer<typeof organisationFilterQuerySchema>;
