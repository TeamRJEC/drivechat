import { createRoute, z } from '@hono/zod-openapi';
import { CalendarSchedulerService } from '../../services/calendar-scheduler';

const BodySchema = z.object({
	account_id: z.number().int(),
	calendar_id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	location: z.string().optional(),
	start_time: z.string().datetime(),
	end_time: z.string().datetime(),
	is_all_day: z.boolean().optional().default(false),
	timezone: z.string().optional().default('UTC'),
	attendees: z
		.array(
			z.object({
				email: z.string().email(),
				name: z.string().optional(),
			})
		)
		.optional(),
	reminders: z
		.array(
			z.object({
				method: z.enum(['email', 'popup']),
				minutes: z.number().int(),
			})
		)
		.optional(),
	check_conflicts: z.boolean().optional().default(true),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		id: z.number(),
		message: z.string(),
		conflicts: z
			.array(
				z.object({
					id: z.number(),
					title: z.string(),
					start_time: z.string(),
					end_time: z.string(),
					calendar_name: z.string().nullable(),
				})
			)
			.optional(),
		alternative_slots: z
			.array(
				z.object({
					start: z.string(),
					end: z.string(),
					duration_minutes: z.number(),
				})
			)
			.optional(),
	}),
});

export class CalendarEventCreate {
	static route = createRoute({
		method: 'post',
		path: '/calendar/events',
		tags: ['Calendar'],
		summary: 'Create calendar event',
		description: 'Create a new calendar event with optional conflict detection',
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
			201: {
				description: 'Event created successfully',
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

		// Check for conflicts if requested
		let conflicts = [];
		let alternativeSlots = [];

		if (data.check_conflicts) {
			const scheduler = new CalendarSchedulerService();
			conflicts = await scheduler.detectConflicts(
				db,
				data.start_time,
				data.end_time
			);

			if (conflicts.length > 0) {
				// Propose alternative times
				alternativeSlots = await scheduler.proposeAlternativeTimes(
					db,
					data.start_time,
					data.end_time
				);
			}
		}

		// Generate a temporary provider event ID (will be updated when synced)
		const providerEventId = `local-${Date.now()}`;

		const result = await db
			.prepare(
				`INSERT INTO calendar_events (
					account_id,
					provider_event_id,
					calendar_id,
					title,
					description,
					location,
					start_time,
					end_time,
					is_all_day,
					timezone,
					attendees,
					reminders,
					status
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				data.account_id,
				providerEventId,
				data.calendar_id,
				data.title,
				data.description || null,
				data.location || null,
				data.start_time,
				data.end_time,
				data.is_all_day ? 1 : 0,
				data.timezone,
				data.attendees ? JSON.stringify(data.attendees) : null,
				data.reminders ? JSON.stringify(data.reminders) : null,
				'confirmed'
			)
			.run();

		// TODO: Trigger sync to provider calendar

		const response: any = {
			id: result.meta.last_row_id,
			message:
				conflicts.length > 0
					? 'Event created with conflicts detected'
					: 'Event created successfully',
		};

		if (conflicts.length > 0) {
			response.conflicts = conflicts;
			response.alternative_slots = alternativeSlots;
		}

		return c.json(
			{
				success: true,
				result: response,
			},
			201
		);
	}
}
