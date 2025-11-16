import { createRoute, z } from '@hono/zod-openapi';
import { CalendarSchedulerService } from '../../services/calendar-scheduler';

const BodySchema = z.object({
	start_time: z.string().datetime(),
	end_time: z.string().datetime(),
	exclude_event_id: z.number().int().optional(),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		has_conflicts: z.boolean(),
		conflicts: z.array(
			z.object({
				id: z.number(),
				title: z.string(),
				start_time: z.string(),
				end_time: z.string(),
				calendar_name: z.string().nullable(),
			})
		),
		alternative_slots: z.array(
			z.object({
				start: z.string(),
				end: z.string(),
				duration_minutes: z.number(),
			})
		),
	}),
});

export class CalendarConflictCheck {
	static route = createRoute({
		method: 'post',
		path: '/calendar/check-conflicts',
		tags: ['Calendar'],
		summary: 'Check for scheduling conflicts',
		description:
			'Check if a proposed time slot conflicts with existing events and get alternative suggestions',
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
				description: 'Conflict check results',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const { start_time, end_time, exclude_event_id } = c.req.valid('json');
		const db = c.env.DB as D1Database;

		const scheduler = new CalendarSchedulerService();

		// Detect conflicts
		const conflicts = await scheduler.detectConflicts(
			db,
			start_time,
			end_time,
			exclude_event_id
		);

		// If there are conflicts, propose alternative times
		let alternativeSlots = [];
		if (conflicts.length > 0) {
			alternativeSlots = await scheduler.proposeAlternativeTimes(
				db,
				start_time,
				end_time
			);
		}

		return c.json({
			success: true,
			result: {
				has_conflicts: conflicts.length > 0,
				conflicts,
				alternative_slots: alternativeSlots,
			},
		});
	}
}
