import { createRoute, z } from '@hono/zod-openapi';

const QuerySchema = z.object({
	limit: z.string().regex(/^\d+$/).transform(Number).optional().default('100'),
	offset: z.string().regex(/^\d+$/).transform(Number).optional().default('0'),
	account_id: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		contacts: z.array(
			z.object({
				id: z.number(),
				account_id: z.number(),
				first_name: z.string().nullable(),
				last_name: z.string().nullable(),
				display_name: z.string().nullable(),
				email_addresses: z.string().nullable(),
				phone_numbers: z.string().nullable(),
				company: z.string().nullable(),
				job_title: z.string().nullable(),
			})
		),
		total: z.number(),
		limit: z.number(),
		offset: z.number(),
	}),
});

export class ContactList {
	static route = createRoute({
		method: 'get',
		path: '/contacts',
		tags: ['Contacts'],
		summary: 'List contacts',
		description: 'Get all contacts from all linked accounts',
		request: {
			query: QuerySchema,
		},
		responses: {
			200: {
				description: 'List of contacts',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const { limit, offset, account_id } = c.req.valid('query');
		const db = c.env.DB as D1Database;

		const whereClause = account_id ? 'WHERE account_id = ?' : '';
		const params = account_id ? [account_id] : [];

		// Get total count
		const countQuery = `SELECT COUNT(*) as total FROM contacts ${whereClause}`;
		const countResult = await db.prepare(countQuery).bind(...params).first();
		const total = (countResult?.total as number) || 0;

		// Get contacts
		const query = `
			SELECT
				id,
				account_id,
				first_name,
				last_name,
				display_name,
				email_addresses,
				phone_numbers,
				company,
				job_title
			FROM contacts
			${whereClause}
			ORDER BY display_name, last_name, first_name
			LIMIT ? OFFSET ?
		`;

		const { results } = await db
			.prepare(query)
			.bind(...params, limit, offset)
			.all();

		return c.json({
			success: true,
			result: {
				contacts: results,
				total,
				limit,
				offset,
			},
		});
	}
}
