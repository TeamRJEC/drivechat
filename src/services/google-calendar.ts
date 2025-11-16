import { AccountRecord } from '../types';

export interface GoogleCalendarEvent {
	id: string;
	status: 'confirmed' | 'tentative' | 'cancelled';
	summary: string;
	description?: string;
	location?: string;
	start: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	end: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	recurrence?: string[];
	attendees?: Array<{
		email: string;
		displayName?: string;
		responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
	}>;
	organizer?: {
		email: string;
		displayName?: string;
	};
	reminders?: {
		useDefault: boolean;
		overrides?: Array<{
			method: 'email' | 'popup';
			minutes: number;
		}>;
	};
	colorId?: string;
}

export interface GoogleCalendar {
	id: string;
	summary: string;
	description?: string;
	timeZone: string;
	primary?: boolean;
}

export class GoogleCalendarService {
	private baseUrl = 'https://www.googleapis.com/calendar/v3';

	async listCalendars(
		account: AccountRecord
	): Promise<{ calendars: GoogleCalendar[] }> {
		const response = await fetch(`${this.baseUrl}/users/me/calendarList`, {
			headers: {
				Authorization: `Bearer ${account.access_token}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Google Calendar API error: ${await response.text()}`);
		}

		const data = await response.json();

		return {
			calendars: data.items || [],
		};
	}

	async listEvents(
		account: AccountRecord,
		calendarId: string,
		options: {
			maxResults?: number;
			pageToken?: string;
			timeMin?: string;
			timeMax?: string;
		} = {}
	): Promise<{ events: GoogleCalendarEvent[]; nextPageToken?: string }> {
		const params = new URLSearchParams({
			maxResults: (options.maxResults || 100).toString(),
			singleEvents: 'true',
			orderBy: 'startTime',
		});

		if (options.pageToken) {
			params.append('pageToken', options.pageToken);
		}

		if (options.timeMin) {
			params.append('timeMin', options.timeMin);
		}

		if (options.timeMax) {
			params.append('timeMax', options.timeMax);
		}

		const response = await fetch(
			`${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Google Calendar API error: ${await response.text()}`);
		}

		const data = await response.json();

		return {
			events: data.items || [],
			nextPageToken: data.nextPageToken,
		};
	}

	async getEvent(
		account: AccountRecord,
		calendarId: string,
		eventId: string
	): Promise<GoogleCalendarEvent> {
		const response = await fetch(
			`${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Google Calendar API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async createEvent(
		account: AccountRecord,
		calendarId: string,
		event: Partial<GoogleCalendarEvent>
	): Promise<GoogleCalendarEvent> {
		const response = await fetch(
			`${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(event),
			}
		);

		if (!response.ok) {
			throw new Error(`Google Calendar API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async updateEvent(
		account: AccountRecord,
		calendarId: string,
		eventId: string,
		event: Partial<GoogleCalendarEvent>
	): Promise<GoogleCalendarEvent> {
		const response = await fetch(
			`${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(event),
			}
		);

		if (!response.ok) {
			throw new Error(`Google Calendar API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async deleteEvent(
		account: AccountRecord,
		calendarId: string,
		eventId: string
	): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
			{
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Google Calendar API error: ${await response.text()}`);
		}
	}

	async findAvailableTimes(
		account: AccountRecord,
		options: {
			timeMin: string;
			timeMax: string;
			items: Array<{ id: string }>;
			timeZone?: string;
		}
	): Promise<{
		calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
	}> {
		const response = await fetch(`${this.baseUrl}/freeBusy`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${account.access_token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(options),
		});

		if (!response.ok) {
			throw new Error(`Google Calendar API error: ${await response.text()}`);
		}

		return await response.json();
	}
}
