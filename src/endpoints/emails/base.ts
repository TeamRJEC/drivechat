import { z } from 'zod';

export const EmailModel = {
	tableName: 'emails',
	schema: z.object({
		id: z.number().int().optional(),
		account_id: z.number().int(),
		message_id: z.string(),
		thread_id: z.string().nullable().optional(),
		from_address: z.string(),
		from_name: z.string().nullable().optional(),
		to_addresses: z.string(),
		cc_addresses: z.string().nullable().optional(),
		bcc_addresses: z.string().nullable().optional(),
		subject: z.string().nullable().optional(),
		body_plain: z.string().nullable().optional(),
		body_html: z.string().nullable().optional(),
		snippet: z.string().nullable().optional(),
		received_at: z.string().datetime(),
		is_read: z.number().int().min(0).max(1).default(0),
		is_flagged: z.number().int().min(0).max(1).default(0),
		is_archived: z.number().int().min(0).max(1).default(0),
		labels: z.string().nullable().optional(),
		attachments: z.string().nullable().optional(),
		synced_at: z.string().datetime().optional(),
		created_at: z.string().datetime().optional(),
	}),
	primaryKey: 'id',
};
