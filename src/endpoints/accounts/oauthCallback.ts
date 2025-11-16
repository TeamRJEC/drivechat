import { createRoute, z } from '@hono/zod-openapi';
import { OAuthService } from '../../services/oauth';
import { OAuthProvider } from '../../types';

const ParamsSchema = z.object({
	provider: z.enum(['google', 'microsoft']),
});

const QuerySchema = z.object({
	code: z.string(),
	state: z.string().optional(),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		account_id: z.number(),
		provider: z.enum(['google', 'microsoft']),
		email: z.string(),
	}),
});

export class AccountOAuthCallback {
	static route = createRoute({
		method: 'get',
		path: '/accounts/oauth/{provider}/callback',
		tags: ['Accounts'],
		summary: 'OAuth callback endpoint',
		description: 'Handle OAuth callback from Google or Microsoft',
		request: {
			params: ParamsSchema,
			query: QuerySchema,
		},
		responses: {
			200: {
				description: 'Account successfully linked',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const { provider } = c.req.valid('param');
		const { code } = c.req.valid('query');
		const db = c.env.DB as D1Database;

		// Get OAuth configuration from environment
		const googleConfig = {
			clientId: c.env.GOOGLE_CLIENT_ID || '',
			clientSecret: c.env.GOOGLE_CLIENT_SECRET || '',
			redirectUri: c.env.GOOGLE_REDIRECT_URI || '',
		};

		const microsoftConfig = {
			clientId: c.env.MICROSOFT_CLIENT_ID || '',
			clientSecret: c.env.MICROSOFT_CLIENT_SECRET || '',
			redirectUri: c.env.MICROSOFT_REDIRECT_URI || '',
		};

		const oauthService = new OAuthService(googleConfig, microsoftConfig);

		try {
			// Exchange code for tokens
			const tokens = await oauthService.exchangeCodeForTokens(
				provider as OAuthProvider,
				code
			);

			// Get user info
			const userInfo = await oauthService.getUserInfo(
				provider as OAuthProvider,
				tokens.access_token
			);

			// Calculate token expiration time
			const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

			// Check if account already exists
			const existing = await db
				.prepare(
					'SELECT id FROM accounts WHERE provider = ? AND provider_account_id = ?'
				)
				.bind(provider, userInfo.email)
				.first();

			let accountId: number;

			if (existing) {
				// Update existing account
				await db
					.prepare(
						`UPDATE accounts
						SET access_token = ?,
						    refresh_token = ?,
						    token_expires_at = ?,
						    scopes = ?,
						    updated_at = CURRENT_TIMESTAMP
						WHERE id = ?`
					)
					.bind(
						tokens.access_token,
						tokens.refresh_token,
						expiresAt,
						tokens.scope,
						existing.id
					)
					.run();
				accountId = existing.id as number;
			} else {
				// Insert new account
				const result = await db
					.prepare(
						`INSERT INTO accounts (provider, provider_account_id, access_token, refresh_token, token_expires_at, scopes)
						VALUES (?, ?, ?, ?, ?, ?)`
					)
					.bind(
						provider,
						userInfo.email,
						tokens.access_token,
						tokens.refresh_token,
						expiresAt,
						tokens.scope
					)
					.run();
				accountId = result.meta.last_row_id;
			}

			return c.json({
				success: true,
				result: {
					account_id: accountId,
					provider,
					email: userInfo.email,
				},
			});
		} catch (error: any) {
			return c.json(
				{
					success: false,
					errors: [
						{
							code: 'OAUTH_ERROR',
							message: error.message || 'Failed to complete OAuth flow',
						},
					],
				},
				400
			);
		}
	}
}
