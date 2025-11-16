import { AccountRecord } from '../types';

export interface GmailMessage {
	id: string;
	threadId: string;
	labelIds: string[];
	snippet: string;
	payload: {
		headers: Array<{ name: string; value: string }>;
		body?: { data?: string };
		parts?: Array<{
			mimeType: string;
			body?: { data?: string };
			parts?: any[];
		}>;
	};
	internalDate: string;
}

export class GmailService {
	private baseUrl = 'https://gmail.googleapis.com/gmail/v1';

	async listMessages(
		account: AccountRecord,
		options: {
			maxResults?: number;
			pageToken?: string;
			q?: string;
		} = {}
	): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
		const params = new URLSearchParams({
			maxResults: (options.maxResults || 100).toString(),
		});

		if (options.pageToken) {
			params.append('pageToken', options.pageToken);
		}

		if (options.q) {
			params.append('q', options.q);
		}

		const response = await fetch(
			`${this.baseUrl}/users/me/messages?${params}`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Gmail API error: ${await response.text()}`);
		}

		const data = await response.json();

		// Fetch full message details
		const messages: GmailMessage[] = [];
		if (data.messages) {
			for (const msg of data.messages) {
				const fullMessage = await this.getMessage(account, msg.id);
				messages.push(fullMessage);
			}
		}

		return {
			messages,
			nextPageToken: data.nextPageToken,
		};
	}

	async getMessage(account: AccountRecord, messageId: string): Promise<GmailMessage> {
		const response = await fetch(
			`${this.baseUrl}/users/me/messages/${messageId}?format=full`,
			{
				headers: {
					Authorization: `Bearer ${account.access_token}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Gmail API error: ${await response.text()}`);
		}

		return await response.json();
	}

	async modifyMessage(
		account: AccountRecord,
		messageId: string,
		modifications: {
			addLabelIds?: string[];
			removeLabelIds?: string[];
		}
	): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/users/me/messages/${messageId}/modify`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${account.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(modifications),
			}
		);

		if (!response.ok) {
			throw new Error(`Gmail API error: ${await response.text()}`);
		}
	}

	parseMessage(message: GmailMessage): {
		from: { address: string; name?: string };
		to: Array<{ address: string; name?: string }>;
		cc: Array<{ address: string; name?: string }>;
		subject: string;
		bodyPlain: string;
		bodyHtml: string;
		attachments: Array<{ filename: string; mimeType: string; size: number }>;
	} {
		const headers = message.payload.headers;

		const getHeader = (name: string) =>
			headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

		const parseAddresses = (addressString: string) => {
			if (!addressString) return [];
			return addressString.split(',').map((addr) => {
				const match = addr.match(/(?:"?([^"]*)"?\s)?<?([^>]+)>?/);
				return {
					address: match?.[2]?.trim() || addr.trim(),
					name: match?.[1]?.trim(),
				};
			});
		};

		const from = parseAddresses(getHeader('from'))[0] || { address: '', name: '' };
		const to = parseAddresses(getHeader('to'));
		const cc = parseAddresses(getHeader('cc'));
		const subject = getHeader('subject');

		let bodyPlain = '';
		let bodyHtml = '';
		const attachments: Array<{ filename: string; mimeType: string; size: number }> = [];

		const extractBody = (parts: any[], parentType?: string) => {
			for (const part of parts) {
				if (part.mimeType === 'text/plain' && part.body?.data) {
					bodyPlain = this.decodeBase64(part.body.data);
				} else if (part.mimeType === 'text/html' && part.body?.data) {
					bodyHtml = this.decodeBase64(part.body.data);
				} else if (part.filename && part.body?.size) {
					attachments.push({
						filename: part.filename,
						mimeType: part.mimeType,
						size: part.body.size,
					});
				}

				if (part.parts) {
					extractBody(part.parts, part.mimeType);
				}
			}
		};

		if (message.payload.parts) {
			extractBody(message.payload.parts);
		} else if (message.payload.body?.data) {
			const decoded = this.decodeBase64(message.payload.body.data);
			if (message.payload.mimeType === 'text/plain') {
				bodyPlain = decoded;
			} else if (message.payload.mimeType === 'text/html') {
				bodyHtml = decoded;
			}
		}

		return {
			from,
			to,
			cc,
			subject,
			bodyPlain,
			bodyHtml,
			attachments,
		};
	}

	private decodeBase64(data: string): string {
		// Gmail uses URL-safe base64
		const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
		try {
			return atob(base64);
		} catch (e) {
			return '';
		}
	}
}
