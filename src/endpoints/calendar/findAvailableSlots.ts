import { createRoute, z } from '@hono/zod-openapi';
import { CalendarSchedulerService } from '../../services/calendar-scheduler';

const BodySchema = z.object({
	start_date: z.string().datetime(),
	end_date: z.string().datetime(),
	duration_minutes: z.number().int().min(15),
	working_hours_start: z.number().int().min(0).max(23).optional().default(9),
	working_hours_end: z.number().int().min(0).max(23).optional().default(17),
	exclude_weekends: z.boolean().optional().default(true),
	max_results: z.number().int().min(1).max(50).optional().default(10),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		available_slots: z.array(
			z.object({
				start: z.string(),
				end: z.string(),
				duration_minutes: z.number(),
			})
		),
		query: z.object({
			start_date: z.string(),
			end_date: z.string(),
			duration_minutes: z.number(),
		}),
	}),
});

export class CalendarFindAvailableSlots {
	static route = createRoute({
		method: 'post',
		path: '/calendar/find-available-slots',
		tags: ['Calendar'],
		summary: 'Find available time slots',
		description:
			'Find available time slots across all calendars for scheduling new meetings',
		request: {
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
				description: 'Available time slots',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const data = c.req.valid('json');
		const db = c.env.DB as D1Database;

		const scheduler = new CalendarSchedulerService();

		const availableSlots = await scheduler.findAvailableSlots(db, {
			startDate: data.start_date,
			endDate: data.end_date,
			durationMinutes: data.duration_minutes,
			workingHoursStart: data.working_hours_start,
			workingHoursEnd: data.working_hours_end,
			excludeWeekends: data.exclude_weekends,
			maxResults: data.max_results,
		});

		return c.json({
			success: true,
			result: {
				available_slots: availableSlots,
				query: {
					start_date: data.start_date,
					end_date: data.end_date,
					duration_minutes: data.duration_minutes,
				},
			},
		});
	}
}
