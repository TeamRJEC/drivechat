import { OpenAPIHono } from '@hono/zod-openapi';
import { EmailList } from './emailList';
import { EmailRead } from './emailRead';
import { EmailUpdate } from './emailUpdate';
import { EmailSearch } from './emailSearch';

export function emailRoutes() {
	const router = new OpenAPIHono();

	router.openapi(EmailList.route, EmailList.handle);
	router.openapi(EmailRead.route, EmailRead.handle);
	router.openapi(EmailUpdate.route, EmailUpdate.handle);
	router.openapi(EmailSearch.route, EmailSearch.handle);

	return router;
}
