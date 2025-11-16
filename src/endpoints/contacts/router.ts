import { OpenAPIHono } from '@hono/zod-openapi';
import { ContactList } from './contactList';
import { ContactRead } from './contactRead';
import { ContactCreate } from './contactCreate';
import { ContactUpdate } from './contactUpdate';
import { ContactDelete } from './contactDelete';
import { ContactSearch } from './contactSearch';

export function contactRoutes() {
	const router = new OpenAPIHono();

	router.openapi(ContactList.route, ContactList.handle);
	router.openapi(ContactRead.route, ContactRead.handle);
	router.openapi(ContactCreate.route, ContactCreate.handle);
	router.openapi(ContactUpdate.route, ContactUpdate.handle);
	router.openapi(ContactDelete.route, ContactDelete.handle);
	router.openapi(ContactSearch.route, ContactSearch.handle);

	return router;
}
