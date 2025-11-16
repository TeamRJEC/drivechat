import type { Context } from "hono";

export type AppContext = Context<{ Bindings: Env }>;
export type HandleArgs = [AppContext];

// OAuth2 Provider Types
export type OAuthProvider = 'google' | 'microsoft';

export interface OAuthTokens {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
}

export interface AccountRecord {
	id: number;
	user_id: number;
	provider: OAuthProvider;
	provider_account_id: string;
	access_token: string;
	refresh_token: string;
	token_expires_at: string;
	scopes: string;
	created_at: string;
	updated_at: string;
}

export interface EmailRecord {
	id: number;
	account_id: number;
	message_id: string;
	thread_id: string | null;
	from_address: string;
	from_name: string | null;
	to_addresses: string;
	cc_addresses: string | null;
	bcc_addresses: string | null;
	subject: string | null;
	body_plain: string | null;
	body_html: string | null;
	snippet: string | null;
	received_at: string;
	is_read: number;
	is_flagged: number;
	is_archived: number;
	labels: string | null;
	attachments: string | null;
	synced_at: string;
	created_at: string;
}

export interface ContactRecord {
	id: number;
	account_id: number;
	provider_contact_id: string;
	first_name: string | null;
	last_name: string | null;
	display_name: string | null;
	email_addresses: string | null;
	phone_numbers: string | null;
	company: string | null;
	job_title: string | null;
	notes: string | null;
	photo_url: string | null;
	birthday: string | null;
	address: string | null;
	synced_at: string;
	created_at: string;
	updated_at: string;
}

export interface CalendarEventRecord {
	id: number;
	account_id: number;
	provider_event_id: string;
	calendar_id: string;
	calendar_name: string | null;
	title: string;
	description: string | null;
	location: string | null;
	start_time: string;
	end_time: string;
	is_all_day: number;
	timezone: string;
	recurrence_rule: string | null;
	attendees: string | null;
	organizer: string | null;
	status: 'confirmed' | 'tentative' | 'cancelled';
	color: string | null;
	reminders: string | null;
	synced_at: string;
	created_at: string;
	updated_at: string;
}
