import { createRoute, z } from '@hono/zod-openapi';

const QuerySchema = z.object({
	q: z.string().min(1),
	limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
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
		query: z.string(),
	}),
});

export class ContactSearch {
	static route = createRoute({
		method: 'get',
		path: '/contacts/search',
		tags: ['Contacts'],
		summary: 'Search contacts',
		description: 'Full-text search across all contact fields',
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
		const { q, limit } = c.req.valid('query');
		const db = c.env.DB as D1Database;

		// Use FTS (Full-Text Search) table for efficient searching
		const query = `
			SELECT
				c.id,
				c.account_id,
				c.first_name,
				c.last_name,
				c.display_name,
				c.email_addresses,
				c.phone_numbers,
				c.company,
				c.job_title
			FROM contacts_fts fts
			JOIN contacts c ON fts.rowid = c.id
			WHERE contacts_fts MATCH ?
			ORDER BY rank
			LIMIT ?
		`;

		const { results } = await db.prepare(query).bind(q, limit).all();

		return c.json({
			success: true,
			result: {
				contacts: results,
				query: q,
			},
		});
	}
}
