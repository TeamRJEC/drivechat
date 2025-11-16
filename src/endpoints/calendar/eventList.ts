import { createRoute, z } from '@hono/zod-openapi';

const QuerySchema = z.object({
	limit: z.string().regex(/^\d+$/).transform(Number).optional().default('100'),
	offset: z.string().regex(/^\d+$/).transform(Number).optional().default('0'),
	start_time: z.string().datetime().optional(),
	end_time: z.string().datetime().optional(),
	account_id: z.string().regex(/^\d+$/).transform(Number).optional(),
	status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		events: z.array(
			z.object({
				id: z.number(),
				account_id: z.number(),
				calendar_name: z.string().nullable(),
				title: z.string(),
				description: z.string().nullable(),
				location: z.string().nullable(),
				start_time: z.string(),
				end_time: z.string(),
				is_all_day: z.number(),
				status: z.string(),
				attendees: z.string().nullable(),
			})
		),
		total: z.number(),
		limit: z.number(),
		offset: z.number(),
	}),
});

export class CalendarEventList {
	static route = createRoute({
		method: 'get',
		path: '/calendar/events',
		tags: ['Calendar'],
		summary: 'List calendar events',
		description: 'Get calendar events from all linked accounts with filtering',
		request: {
			query: QuerySchema,
		},
		responses: {
			200: {
				description: 'List of calendar events',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const { limit, offset, start_time, end_time, account_id, status } =
			c.req.valid('query');
		const db = c.env.DB as D1Database;

		const conditions: string[] = [];
		const params: any[] = [];

		if (start_time) {
			conditions.push('start_time >= ?');
			params.push(start_time);
		}

		if (end_time) {
			conditions.push('end_time <= ?');
			params.push(end_time);
		}

		if (account_id) {
			conditions.push('account_id = ?');
			params.push(account_id);
		}

		if (status) {
			conditions.push('status = ?');
			params.push(status);
		}

		const whereClause =
			conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		// Get total count
		const countQuery = `SELECT COUNT(*) as total FROM calendar_events ${whereClause}`;
		const countResult = await db.prepare(countQuery).bind(...params).first();
		const total = (countResult?.total as number) || 0;

		// Get events
		const query = `
			SELECT
				id,
				account_id,
				calendar_name,
				title,
				description,
				location,
				start_time,
				end_time,
				is_all_day,
				status,
				attendees
			FROM calendar_events
			${whereClause}
			ORDER BY start_time ASC
			LIMIT ? OFFSET ?
		`;

		const { results } = await db
			.prepare(query)
			.bind(...params, limit, offset)
			.all();

		return c.json({
			success: true,
			result: {
				events: results,
				total,
				limit,
				offset,
			},
		});
	}
}
