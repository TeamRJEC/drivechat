import { OAuthProvider, OAuthTokens } from '../types';

export interface OAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

export class OAuthService {
	private googleConfig: OAuthConfig;
	private microsoftConfig: OAuthConfig;

	constructor(googleConfig: OAuthConfig, microsoftConfig: OAuthConfig) {
		this.googleConfig = googleConfig;
		this.microsoftConfig = microsoftConfig;
	}

	/**
	 * Get authorization URL for OAuth2 flow
	 */
	getAuthorizationUrl(provider: OAuthProvider, state: string): string {
		const scopes = this.getScopes(provider);

		if (provider === 'google') {
			const params = new URLSearchParams({
				client_id: this.googleConfig.clientId,
				redirect_uri: this.googleConfig.redirectUri,
				response_type: 'code',
				scope: scopes.join(' '),
				access_type: 'offline',
				prompt: 'consent',
				state,
			});
			return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
		} else {
			const params = new URLSearchParams({
				client_id: this.microsoftConfig.clientId,
				redirect_uri: this.microsoftConfig.redirectUri,
				response_type: 'code',
				scope: scopes.join(' '),
				response_mode: 'query',
				state,
			});
			return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
		}
	}

	/**
	 * Exchange authorization code for tokens
	 */
	async exchangeCodeForTokens(
		provider: OAuthProvider,
		code: string
	): Promise<OAuthTokens> {
		const config = provider === 'google' ? this.googleConfig : this.microsoftConfig;
		const tokenUrl = this.getTokenUrl(provider);

		const params = new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			code,
			redirect_uri: config.redirectUri,
			grant_type: 'authorization_code',
		});

		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to exchange code for tokens: ${error}`);
		}

		return await response.json();
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refreshAccessToken(
		provider: OAuthProvider,
		refreshToken: string
	): Promise<OAuthTokens> {
		const config = provider === 'google' ? this.googleConfig : this.microsoftConfig;
		const tokenUrl = this.getTokenUrl(provider);

		const params = new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		});

		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to refresh access token: ${error}`);
		}

		const tokens = await response.json();

		// Some providers don't return a new refresh token
		if (!tokens.refresh_token) {
			tokens.refresh_token = refreshToken;
		}

		return tokens;
	}

	/**
	 * Get required scopes for each provider
	 */
	private getScopes(provider: OAuthProvider): string[] {
		if (provider === 'google') {
			return [
				'https://www.googleapis.com/auth/gmail.readonly',
				'https://www.googleapis.com/auth/gmail.modify',
				'https://www.googleapis.com/auth/contacts',
				'https://www.googleapis.com/auth/calendar',
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile',
			];
		} else {
			return [
				'https://graph.microsoft.com/Mail.ReadWrite',
				'https://graph.microsoft.com/Contacts.ReadWrite',
				'https://graph.microsoft.com/Calendars.ReadWrite',
				'https://graph.microsoft.com/User.Read',
				'offline_access',
			];
		}
	}

	/**
	 * Get token endpoint URL for provider
	 */
	private getTokenUrl(provider: OAuthProvider): string {
		if (provider === 'google') {
			return 'https://oauth2.googleapis.com/token';
		} else {
			return 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
		}
	}

	/**
	 * Get user info from provider
	 */
	async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<{
		id: string;
		email: string;
		name: string;
	}> {
		let url: string;

		if (provider === 'google') {
			url = 'https://www.googleapis.com/oauth2/v2/userinfo';
		} else {
			url = 'https://graph.microsoft.com/v1.0/me';
		}

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to get user info: ${error}`);
		}

		const data = await response.json();

		if (provider === 'google') {
			return {
				id: data.id,
				email: data.email,
				name: data.name || data.email,
			};
		} else {
			return {
				id: data.id,
				email: data.userPrincipalName || data.mail,
				name: data.displayName || data.userPrincipalName,
			};
		}
	}
}
