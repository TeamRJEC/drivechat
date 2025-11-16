import { createRoute, z } from '@hono/zod-openapi';

const QuerySchema = z.object({
	q: z.string().min(1),
	limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
	offset: z.string().regex(/^\d+$/).transform(Number).optional().default('0'),
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
			})
		),
		total: z.number(),
		query: z.string(),
	}),
});

export class EmailSearch {
	static route = createRoute({
		method: 'get',
		path: '/emails/search',
		tags: ['Emails'],
		summary: 'Search emails',
		description: 'Search emails by subject, from, to, or body content',
		request: {
			query: QuerySchema,
		},
		responses: {
			200: {
				description: 'Search results',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const { q, limit, offset } = c.req.valid('query');
		const db = c.env.DB as D1Database;

		const searchPattern = `%${q}%`;

		// Get total count
		const countQuery = `
			SELECT COUNT(*) as total
			FROM emails
			WHERE subject LIKE ? OR from_address LIKE ? OR body_plain LIKE ?
		`;
		const countResult = await db
			.prepare(countQuery)
			.bind(searchPattern, searchPattern, searchPattern)
			.first();
		const total = (countResult?.total as number) || 0;

		// Search emails
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
				is_archived
			FROM emails
			WHERE subject LIKE ? OR from_address LIKE ? OR body_plain LIKE ?
			ORDER BY received_at DESC
			LIMIT ? OFFSET ?
		`;

		const { results } = await db
			.prepare(query)
			.bind(searchPattern, searchPattern, searchPattern, limit, offset)
			.all();

		return c.json({
			success: true,
			result: {
				emails: results,
				total,
				query: q,
			},
		});
	}
}
