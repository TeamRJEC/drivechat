import { z } from 'zod';

export const AccountModel = {
	tableName: 'accounts',
	schema: z.object({
		id: z.number().int().optional(),
		user_id: z.number().int().default(1),
		provider: z.enum(['google', 'microsoft']),
		provider_account_id: z.string().email(),
		access_token: z.string(),
		refresh_token: z.string(),
		token_expires_at: z.string().datetime(),
		scopes: z.string(),
		created_at: z.string().datetime().optional(),
		updated_at: z.string().datetime().optional(),
	}),
	primaryKey: 'id',
};
