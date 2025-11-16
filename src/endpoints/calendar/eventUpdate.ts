import { createRoute, z } from '@hono/zod-openapi';

const ParamsSchema = z.object({
	id: z.string().regex(/^\d+$/).transform(Number),
});

const BodySchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	location: z.string().optional(),
	start_time: z.string().datetime().optional(),
	end_time: z.string().datetime().optional(),
	status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
	attendees: z
		.array(
			z.object({
				email: z.string().email(),
				name: z.string().optional(),
			})
		)
		.optional(),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		message: z.string(),
	}),
});

export class CalendarEventUpdate {
	static route = createRoute({
		method: 'patch',
		path: '/calendar/events/{id}',
		tags: ['Calendar'],
		summary: 'Update calendar event',
		description: 'Update calendar event and sync to provider',
		request: {
			params: ParamsSchema,
			body: {
				content: {
					'application/json': {
						schema: BodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: 'Event updated successfully',
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
		const data = c.req.valid('json');
		const db = c.env.DB as D1Database;

		const fields: string[] = [];
		const params: any[] = [];

		if (data.title !== undefined) {
			fields.push('title = ?');
			params.push(data.title);
		}

		if (data.description !== undefined) {
			fields.push('description = ?');
			params.push(data.description);
		}

		if (data.location !== undefined) {
			fields.push('location = ?');
			params.push(data.location);
		}

		if (data.start_time !== undefined) {
			fields.push('start_time = ?');
			params.push(data.start_time);
		}

		if (data.end_time !== undefined) {
			fields.push('end_time = ?');
			params.push(data.end_time);
		}

		if (data.status !== undefined) {
			fields.push('status = ?');
			params.push(data.status);
		}

		if (data.attendees !== undefined) {
			fields.push('attendees = ?');
			params.push(JSON.stringify(data.attendees));
		}

		if (fields.length === 0) {
			return c.json(
				{
					success: false,
					errors: [
						{
							code: 'INVALID_REQUEST',
							message: 'No valid fields to update',
						},
					],
				},
				400
			);
		}

		fields.push('updated_at = CURRENT_TIMESTAMP');
		params.push(id);

		await db
			.prepare(`UPDATE calendar_events SET ${fields.join(', ')} WHERE id = ?`)
			.bind(...params)
			.run();

		// TODO: Trigger sync to provider calendar

		return c.json({
			success: true,
			result: {
				message: 'Event updated successfully',
			},
		});
	}
}
