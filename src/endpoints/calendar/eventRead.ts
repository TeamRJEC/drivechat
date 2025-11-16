import { createRoute, z } from '@hono/zod-openapi';

const ParamsSchema = z.object({
	id: z.string().regex(/^\d+$/).transform(Number),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		id: z.number(),
		account_id: z.number(),
		provider_event_id: z.string(),
		calendar_id: z.string(),
		calendar_name: z.string().nullable(),
		title: z.string(),
		description: z.string().nullable(),
		location: z.string().nullable(),
		start_time: z.string(),
		end_time: z.string(),
		is_all_day: z.number(),
		timezone: z.string(),
		recurrence_rule: z.string().nullable(),
		attendees: z.string().nullable(),
		organizer: z.string().nullable(),
		status: z.string(),
		color: z.string().nullable(),
		reminders: z.string().nullable(),
		created_at: z.string(),
		updated_at: z.string(),
	}),
});

export class CalendarEventRead {
	static route = createRoute({
		method: 'get',
		path: '/calendar/events/{id}',
		tags: ['Calendar'],
		summary: 'Get event details',
		description: 'Get full details of a specific calendar event',
		request: {
			params: ParamsSchema,
		},
		responses: {
			200: {
				description: 'Event details',
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

		const event = await db
			.prepare('SELECT * FROM calendar_events WHERE id = ?')
			.bind(id)
			.first();

		if (!event) {
			return c.json(
				{
					success: false,
					errors: [
						{
							code: 'NOT_FOUND',
							message: 'Event not found',
						},
					],
				},
				404
			);
		}

		return c.json({
			success: true,
			result: event,
		});
	}
}
