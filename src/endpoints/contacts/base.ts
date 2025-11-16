import { z } from 'zod';

export const ContactModel = {
	tableName: 'contacts',
	schema: z.object({
		id: z.number().int().optional(),
		account_id: z.number().int(),
		provider_contact_id: z.string(),
		first_name: z.string().nullable().optional(),
		last_name: z.string().nullable().optional(),
		display_name: z.string().nullable().optional(),
		email_addresses: z.string().nullable().optional(),
		phone_numbers: z.string().nullable().optional(),
		company: z.string().nullable().optional(),
		job_title: z.string().nullable().optional(),
		notes: z.string().nullable().optional(),
		photo_url: z.string().nullable().optional(),
		birthday: z.string().nullable().optional(),
		address: z.string().nullable().optional(),
		synced_at: z.string().datetime().optional(),
		created_at: z.string().datetime().optional(),
		updated_at: z.string().datetime().optional(),
	}),
	primaryKey: 'id',
};
