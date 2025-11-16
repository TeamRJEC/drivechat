import { OpenAPIHono } from '@hono/zod-openapi';
import { AccountOAuthCallback } from './oauthCallback';
import { AccountList } from './accountList';
import { AccountDelete } from './accountDelete';
import { AccountSync } from './accountSync';

export function accountRoutes() {
	const router = new OpenAPIHono();

	router.openapi(AccountOAuthCallback.route, AccountOAuthCallback.handle);
	router.openapi(AccountList.route, AccountList.handle);
	router.openapi(AccountDelete.route, AccountDelete.handle);
	router.openapi(AccountSync.route, AccountSync.handle);

	return router;
}
