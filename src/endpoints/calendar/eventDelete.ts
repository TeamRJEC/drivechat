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

export class CalendarEventDelete {
	static route = createRoute({
		method: 'delete',
		path: '/calendar/events/{id}',
		tags: ['Calendar'],
		summary: 'Delete calendar event',
		description: 'Delete calendar event and sync deletion to provider',
		request: {
			params: ParamsSchema,
		},
		responses: {
			200: {
				description: 'Event deleted successfully',
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

		// TODO: Trigger deletion from provider calendar before deleting from DB

		await db.prepare('DELETE FROM calendar_events WHERE id = ?').bind(id).run();

		return c.json({
			success: true,
			result: {
				message: 'Event deleted successfully',
			},
		});
	}
}
