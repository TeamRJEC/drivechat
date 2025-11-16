import { createRoute, z } from '@hono/zod-openapi';

const ParamsSchema = z.object({
	id: z.string().regex(/^\d+$/).transform(Number),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		message: z.string(),
	}),
});

export class AccountDelete {
	static route = createRoute({
		method: 'delete',
		path: '/accounts/{id}',
		tags: ['Accounts'],
		summary: 'Unlink account',
		description: 'Remove a linked account and all associated data',
		request: {
			params: ParamsSchema,
		},
		responses: {
			200: {
				description: 'Account successfully unlinked',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const { id } = c.req.valid('param');
		const db = c.env.DB as D1Database;

		// Delete account (cascade will handle related data)
		await db.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run();

		return c.json({
			success: true,
			result: {
				message: 'Account unlinked successfully',
			},
		});
	}
}
