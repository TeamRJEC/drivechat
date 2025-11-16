import { AccountRecord } from '../types';

export interface GoogleContact {
	resourceName: string;
	etag: string;
	names?: Array<{
		displayName: string;
		familyName: string;
		givenName: string;
	}>;
	emailAddresses?: Array<{
		value: string;
		type?: string;
	}>;
	phoneNumbers?: Array<{
		value: string;
		type?: string;
	}>;
	organizations?: Array<{
		name: string;
		title: string;
	}>;
	biographies?: Array<{
		value: string;
	}>;
	birthdays?: Array<{
		date: {
			year: number;
			month: number;
			day: number;
		};
	}>;
	photos?: Array<{
		url: string;
	}>;
	addresses?: Array<{
		formattedValue: string;
		type?: string;
	}>;
}

export class GoogleContactsService {
	private baseUrl = 'https://people.googleapis.com/v1';

	async listContacts(
		account: AccountRecord,
		options: {
			pageSize?: number;
			pageToken?: string;
		} = {}
	): Promise<{ contacts: GoogleContact[]; nextPageToken?: string }> {
		const params = new URLSearchParams({
			personFields:
				'names,emailAddresses,phoneNumbers,organizations,biographies,birthdays,photos,addresses',
			pageSize: (options.pageSize || 100).toString(),
		});

		if (options.pageToken) {
			params.append('pageToken', options.pageToken);
		}

		const response = await fetch(
			`${this.baseUrl}/people/me/connections?${params}`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Google Contacts API error: ${await response.text()}`);
		}

		const data = await response.json();

		return {
			contacts: data.connections || [],
			nextPageToken: data.nextPageToken,
		};
	}

	async getContact(
		account: AccountRecord,
		resourceName: string
	): Promise<GoogleContact> {
		const params = new URLSearchParams({
			personFields:
				'names,emailAddresses,phoneNumbers,organizations,biographies,birthdays,photos,addresses',
		});

		const response = await fetch(
			`${this.baseUrl}/${resourceName}?${params}`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Google Contacts API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async createContact(
		account: AccountRecord,
		contact: Partial<GoogleContact>
	): Promise<GoogleContact> {
		const response = await fetch(`${this.baseUrl}/people:createContact`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${account.access_token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(contact),
		});

		if (!response.ok) {
			throw new Error(`Google Contacts API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async updateContact(
		account: AccountRecord,
		resourceName: string,
		contact: Partial<GoogleContact>,
		etag: string
	): Promise<GoogleContact> {
		const params = new URLSearchParams({
			updatePersonFields:
				'names,emailAddresses,phoneNumbers,organizations,biographies,birthdays,addresses',
		});

		const response = await fetch(
			`${this.baseUrl}/${resourceName}:updateContact?${params}`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ ...contact, etag }),
			}
		);

		if (!response.ok) {
			throw new Error(`Google Contacts API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async deleteContact(account: AccountRecord, resourceName: string): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/${resourceName}:deleteContact`,
			{
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Google Contacts API error: ${await response.text()}`);
		}
	}
}
