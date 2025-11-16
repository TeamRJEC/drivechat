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

export class ContactDelete {
	static route = createRoute({
		method: 'delete',
		path: '/contacts/{id}',
		tags: ['Contacts'],
		summary: 'Delete contact',
		description: 'Delete a contact and sync deletion to provider account',
		request: {
			params: ParamsSchema,
		},
		responses: {
			200: {
				description: 'Contact deleted successfully',
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

		// TODO: Trigger deletion from provider account before deleting from DB

		await db.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();

		return c.json({
			success: true,
			result: {
				message: 'Contact deleted successfully',
			},
		});
	}
}
