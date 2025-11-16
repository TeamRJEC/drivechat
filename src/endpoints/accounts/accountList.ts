import { createRoute, z } from '@hono/zod-openapi';

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.array(
		z.object({
			id: z.number(),
			provider: z.enum(['google', 'microsoft']),
			email: z.string(),
			created_at: z.string(),
		})
	),
});

export class AccountList {
	static route = createRoute({
		method: 'get',
		path: '/accounts',
		tags: ['Accounts'],
		summary: 'List linked accounts',
		description: 'Get all linked Google and Microsoft accounts',
		responses: {
			200: {
				description: 'List of linked accounts',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const db = c.env.DB as D1Database;

		const { results } = await db
			.prepare(
				`SELECT id, provider, provider_account_id as email, created_at
				FROM accounts
				ORDER BY created_at DESC`
			)
			.all();

		return c.json({
			success: true,
			result: results,
		});
	}
}
