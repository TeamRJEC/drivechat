import { z } from 'zod';

export const CalendarEventModel = {
	tableName: 'calendar_events',
	schema: z.object({
		id: z.number().int().optional(),
		account_id: z.number().int(),
		provider_event_id: z.string(),
		calendar_id: z.string(),
		calendar_name: z.string().nullable().optional(),
		title: z.string(),
		description: z.string().nullable().optional(),
		location: z.string().nullable().optional(),
		start_time: z.string().datetime(),
		end_time: z.string().datetime(),
		is_all_day: z.number().int().min(0).max(1).default(0),
		timezone: z.string().default('UTC'),
		recurrence_rule: z.string().nullable().optional(),
		attendees: z.string().nullable().optional(),
		organizer: z.string().nullable().optional(),
		status: z.enum(['confirmed', 'tentative', 'cancelled']).default('confirmed'),
		color: z.string().nullable().optional(),
		reminders: z.string().nullable().optional(),
		synced_at: z.string().datetime().optional(),
		created_at: z.string().datetime().optional(),
		updated_at: z.string().datetime().optional(),
	}),
	primaryKey: 'id',
};
