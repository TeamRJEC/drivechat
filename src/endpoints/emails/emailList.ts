import { createRoute, z } from '@hono/zod-openapi';

const QuerySchema = z.object({
	limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
	offset: z.string().regex(/^\d+$/).transform(Number).optional().default('0'),
	is_read: z.enum(['0', '1']).optional(),
	is_flagged: z.enum(['0', '1']).optional(),
	is_archived: z.enum(['0', '1']).optional(),
	account_id: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		emails: z.array(
			z.object({
				id: z.number(),
				account_id: z.number(),
				from_address: z.string(),
				from_name: z.string().nullable(),
				subject: z.string().nullable(),
				snippet: z.string().nullable(),
				received_at: z.string(),
				is_read: z.number(),
				is_flagged: z.number(),
				is_archived: z.number(),
				attachments: z.string().nullable(),
			})
		),
		total: z.number(),
		limit: z.number(),
		offset: z.number(),
	}),
});

export class EmailList {
	static route = createRoute({
		method: 'get',
		path: '/emails',
		tags: ['Emails'],
		summary: 'List emails from unified inbox',
		description: 'Get all emails from all linked accounts with filtering and pagination',
		request: {
			query: QuerySchema,
		},
		responses: {
			200: {
				description: 'List of emails',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const { limit, offset, is_read, is_flagged, is_archived, account_id } =
			c.req.valid('query');
		const db = c.env.DB as D1Database;

		// Build WHERE clause
		const conditions: string[] = [];
		const params: any[] = [];

		if (is_read !== undefined) {
			conditions.push('is_read = ?');
			params.push(parseInt(is_read));
		}

		if (is_flagged !== undefined) {
			conditions.push('is_flagged = ?');
			params.push(parseInt(is_flagged));
		}

		if (is_archived !== undefined) {
			conditions.push('is_archived = ?');
			params.push(parseInt(is_archived));
		}

		if (account_id !== undefined) {
			conditions.push('account_id = ?');
			params.push(account_id);
		}

		const whereClause =
			conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		// Get total count
		const countQuery = `SELECT COUNT(*) as total FROM emails ${whereClause}`;
		const countResult = await db.prepare(countQuery).bind(...params).first();
		const total = (countResult?.total as number) || 0;

		// Get emails
		const query = `
			SELECT
				id,
				account_id,
				from_address,
				from_name,
				subject,
				snippet,
				received_at,
				is_read,
				is_flagged,
				is_archived,
				attachments
			FROM emails
			${whereClause}
			ORDER BY received_at DESC
			LIMIT ? OFFSET ?
		`;

		const { results } = await db
			.prepare(query)
			.bind(...params, limit, offset)
			.all();

		return c.json({
			success: true,
			result: {
				emails: results,
				total,
				limit,
				offset,
			},
		});
	}
}
