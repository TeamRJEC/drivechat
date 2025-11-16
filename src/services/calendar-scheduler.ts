import { CalendarEventRecord } from '../types';

export interface TimeSlot {
	start: string;
	end: string;
}

export interface ConflictingEvent {
	id: number;
	title: string;
	start_time: string;
	end_time: string;
	calendar_name: string | null;
}

export interface AvailableSlot {
	start: string;
	end: string;
	duration_minutes: number;
}

export class CalendarSchedulerService {
	/**
	 * Check if two time ranges overlap
	 */
	private doTimesOverlap(
		start1: string,
		end1: string,
		start2: string,
		end2: string
	): boolean {
		const s1 = new Date(start1).getTime();
		const e1 = new Date(end1).getTime();
		const s2 = new Date(start2).getTime();
		const e2 = new Date(end2).getTime();

		return s1 < e2 && s2 < e1;
	}

	/**
	 * Detect conflicts for a proposed time slot
	 */
	async detectConflicts(
		db: D1Database,
		proposedStart: string,
		proposedEnd: string,
		excludeEventId?: number
	): Promise<ConflictingEvent[]> {
		let query = `
			SELECT
				id,
				title,
				start_time,
				end_time,
				calendar_name
			FROM calendar_events
			WHERE status != 'cancelled'
			AND (
				(start_time < ? AND end_time > ?)
				OR (start_time >= ? AND start_time < ?)
				OR (end_time > ? AND end_time <= ?)
			)
		`;

		const params = [
			proposedEnd,
			proposedStart,
			proposedStart,
			proposedEnd,
			proposedStart,
			proposedEnd,
		];

		if (excludeEventId) {
			query += ' AND id != ?';
			params.push(excludeEventId.toString());
		}

		const { results } = await db.prepare(query).bind(...params).all();

		return results as ConflictingEvent[];
	}

	/**
	 * Find all busy time slots across all calendars
	 */
	async findBusySlots(
		db: D1Database,
		startDate: string,
		endDate: string
	): Promise<TimeSlot[]> {
		const query = `
			SELECT
				start_time,
				end_time
			FROM calendar_events
			WHERE status != 'cancelled'
			AND start_time < ?
			AND end_time > ?
			ORDER BY start_time
		`;

		const { results } = await db.prepare(query).bind(endDate, startDate).all();

		return results.map((r: any) => ({
			start: r.start_time,
			end: r.end_time,
		}));
	}

	/**
	 * Merge overlapping busy slots
	 */
	private mergeBusySlots(slots: TimeSlot[]): TimeSlot[] {
		if (slots.length === 0) return [];

		const sorted = [...slots].sort(
			(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
		);

		const merged: TimeSlot[] = [sorted[0]];

		for (let i = 1; i < sorted.length; i++) {
			const current = sorted[i];
			const last = merged[merged.length - 1];

			if (new Date(current.start) <= new Date(last.end)) {
				// Overlapping, merge them
				last.end =
					new Date(current.end) > new Date(last.end) ? current.end : last.end;
			} else {
				// No overlap, add as new slot
				merged.push(current);
			}
		}

		return merged;
	}

	/**
	 * Find available time slots for a meeting
	 */
	async findAvailableSlots(
		db: D1Database,
		options: {
			startDate: string;
			endDate: string;
			durationMinutes: number;
			workingHoursStart?: number; // Hour (0-23)
			workingHoursEnd?: number; // Hour (0-23)
			excludeWeekends?: boolean;
			maxResults?: number;
		}
	): Promise<AvailableSlot[]> {
		const {
			startDate,
			endDate,
			durationMinutes,
			workingHoursStart = 9,
			workingHoursEnd = 17,
			excludeWeekends = true,
			maxResults = 10,
		} = options;

		// Get all busy slots
		const busySlots = await this.findBusySlots(db, startDate, endDate);
		const mergedBusySlots = this.mergeBusySlots(busySlots);

		const availableSlots: AvailableSlot[] = [];
		let currentDate = new Date(startDate);
		const endDateTime = new Date(endDate);

		while (currentDate < endDateTime && availableSlots.length < maxResults) {
			// Skip weekends if requested
			const dayOfWeek = currentDate.getDay();
			if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
				currentDate.setDate(currentDate.getDate() + 1);
				currentDate.setHours(0, 0, 0, 0);
				continue;
			}

			// Set working hours for this day
			const dayStart = new Date(currentDate);
			dayStart.setHours(workingHoursStart, 0, 0, 0);

			const dayEnd = new Date(currentDate);
			dayEnd.setHours(workingHoursEnd, 0, 0, 0);

			// Find free slots in this day
			let slotStart = dayStart;

			for (const busySlot of mergedBusySlots) {
				const busyStart = new Date(busySlot.start);
				const busyEnd = new Date(busySlot.end);

				// Skip if busy slot is outside current day
				if (busyEnd <= dayStart || busyStart >= dayEnd) {
					continue;
				}

				// Check if there's a gap before this busy slot
				const gapStart = slotStart < dayStart ? dayStart : slotStart;
				const gapEnd = busyStart > dayEnd ? dayEnd : busyStart;

				const gapDuration = (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60);

				if (gapDuration >= durationMinutes) {
					availableSlots.push({
						start: gapStart.toISOString(),
						end: new Date(
							gapStart.getTime() + durationMinutes * 60 * 1000
						).toISOString(),
						duration_minutes: durationMinutes,
					});

					if (availableSlots.length >= maxResults) {
						return availableSlots;
					}
				}

				// Move slot start to after this busy period
				slotStart = busyEnd > slotStart ? busyEnd : slotStart;
			}

			// Check if there's time left at the end of the day
			if (slotStart < dayEnd) {
				const remainingDuration = (dayEnd.getTime() - slotStart.getTime()) / (1000 * 60);

				if (remainingDuration >= durationMinutes) {
					availableSlots.push({
						start: slotStart.toISOString(),
						end: new Date(
							slotStart.getTime() + durationMinutes * 60 * 1000
						).toISOString(),
						duration_minutes: durationMinutes,
					});

					if (availableSlots.length >= maxResults) {
						return availableSlots;
					}
				}
			}

			// Move to next day
			currentDate.setDate(currentDate.getDate() + 1);
			currentDate.setHours(0, 0, 0, 0);
		}

		return availableSlots;
	}

	/**
	 * Propose alternative meeting times when there's a conflict
	 */
	async proposeAlternativeTimes(
		db: D1Database,
		proposedStart: string,
		proposedEnd: string,
		options?: {
			searchDaysAhead?: number;
			workingHoursStart?: number;
			workingHoursEnd?: number;
			excludeWeekends?: boolean;
		}
	): Promise<AvailableSlot[]> {
		const start = new Date(proposedStart);
		const end = new Date(proposedEnd);
		const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

		const searchDaysAhead = options?.searchDaysAhead || 7;
		const searchEnd = new Date(start);
		searchEnd.setDate(searchEnd.getDate() + searchDaysAhead);

		return this.findAvailableSlots(db, {
			startDate: start.toISOString(),
			endDate: searchEnd.toISOString(),
			durationMinutes,
			workingHoursStart: options?.workingHoursStart,
			workingHoursEnd: options?.workingHoursEnd,
			excludeWeekends: options?.excludeWeekends,
			maxResults: 5,
		});
	}
}
