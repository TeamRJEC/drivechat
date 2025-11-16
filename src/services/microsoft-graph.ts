import { AccountRecord } from '../types';

export interface GraphMessage {
	id: string;
	conversationId: string;
	subject: string;
	bodyPreview: string;
	body: {
		contentType: 'text' | 'html';
		content: string;
	};
	from: {
		emailAddress: {
			name: string;
			address: string;
		};
	};
	toRecipients: Array<{
		emailAddress: {
			name: string;
			address: string;
		};
	}>;
	ccRecipients: Array<{
		emailAddress: {
			name: string;
			address: string;
		};
	}>;
	bccRecipients: Array<{
		emailAddress: {
			name: string;
			address: string;
		};
	}>;
	receivedDateTime: string;
	isRead: boolean;
	flag: {
		flagStatus: 'notFlagged' | 'flagged' | 'complete';
	};
	categories: string[];
	hasAttachments: boolean;
}

export interface GraphContact {
	id: string;
	displayName: string;
	givenName: string;
	surname: string;
	emailAddresses: Array<{
		address: string;
		name?: string;
	}>;
	mobilePhone: string;
	businessPhones: string[];
	homePhones: string[];
	companyName: string;
	jobTitle: string;
	birthday: string;
}

export interface GraphEvent {
	id: string;
	subject: string;
	body: {
		contentType: 'text' | 'html';
		content: string;
	};
	start: {
		dateTime: string;
		timeZone: string;
	};
	end: {
		dateTime: string;
		timeZone: string;
	};
	location: {
		displayName: string;
	};
	isAllDay: boolean;
	recurrence: any;
	attendees: Array<{
		emailAddress: {
			name: string;
			address: string;
		};
		status: {
			response: string;
		};
	}>;
	organizer: {
		emailAddress: {
			name: string;
			address: string;
		};
	};
	showAs: string;
}

export class MicrosoftGraphService {
	private baseUrl = 'https://graph.microsoft.com/v1.0';

	// Email Methods
	async listMessages(
		account: AccountRecord,
		options: {
			top?: number;
			skip?: number;
			filter?: string;
		} = {}
	): Promise<{ messages: GraphMessage[]; nextLink?: string }> {
		const params = new URLSearchParams({
			$top: (options.top || 100).toString(),
		});

		if (options.skip) {
			params.append('$skip', options.skip.toString());
		}

		if (options.filter) {
			params.append('$filter', options.filter);
		}

		const response = await fetch(
			`${this.baseUrl}/me/messages?${params}`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}

		const data = await response.json();

		return {
			messages: data.value || [],
			nextLink: data['@odata.nextLink'],
		};
	}

	async updateMessage(
		account: AccountRecord,
		messageId: string,
		updates: {
			isRead?: boolean;
			flag?: { flagStatus: string };
			categories?: string[];
		}
	): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/me/messages/${messageId}`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updates),
			}
		);

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}
	}

	// Contact Methods
	async listContacts(
		account: AccountRecord,
		options: {
			top?: number;
			skip?: number;
		} = {}
	): Promise<{ contacts: GraphContact[]; nextLink?: string }> {
		const params = new URLSearchParams({
			$top: (options.top || 100).toString(),
		});

		if (options.skip) {
			params.append('$skip', options.skip.toString());
		}

		const response = await fetch(
			`${this.baseUrl}/me/contacts?${params}`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}

		const data = await response.json();

		return {
			contacts: data.value || [],
			nextLink: data['@odata.nextLink'],
		};
	}

	async createContact(
		account: AccountRecord,
		contact: Partial<GraphContact>
	): Promise<GraphContact> {
		const response = await fetch(`${this.baseUrl}/me/contacts`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${account.access_token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(contact),
		});

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async updateContact(
		account: AccountRecord,
		contactId: string,
		updates: Partial<GraphContact>
	): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/me/contacts/${contactId}`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updates),
			}
		);

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}
	}

	async deleteContact(account: AccountRecord, contactId: string): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/me/contacts/${contactId}`,
			{
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}
	}

	// Calendar Methods
	async listEvents(
		account: AccountRecord,
		options: {
			top?: number;
			skip?: number;
			startDateTime?: string;
			endDateTime?: string;
		} = {}
	): Promise<{ events: GraphEvent[]; nextLink?: string }> {
		const params = new URLSearchParams({
			$top: (options.top || 100).toString(),
		});

		if (options.skip) {
			params.append('$skip', options.skip.toString());
		}

		if (options.startDateTime && options.endDateTime) {
			params.append('startDateTime', options.startDateTime);
			params.append('endDateTime', options.endDateTime);
		}

		const response = await fetch(
			`${this.baseUrl}/me/calendar/events?${params}`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}

		const data = await response.json();

		return {
			events: data.value || [],
			nextLink: data['@odata.nextLink'],
		};
	}

	async createEvent(
		account: AccountRecord,
		event: Partial<GraphEvent>
	): Promise<GraphEvent> {
		const response = await fetch(`${this.baseUrl}/me/calendar/events`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${account.access_token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(event),
		});

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async updateEvent(
		account: AccountRecord,
		eventId: string,
		updates: Partial<GraphEvent>
	): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/me/calendar/events/${eventId}`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updates),
			}
		);

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}
	}

	async deleteEvent(account: AccountRecord, eventId: string): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/me/calendar/events/${eventId}`,
			{
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Microsoft Graph API error: ${await response.text()}`);
		}
	}
}
