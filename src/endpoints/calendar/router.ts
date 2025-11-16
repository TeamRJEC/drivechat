import { OpenAPIHono } from '@hono/zod-openapi';
import { CalendarEventList } from './eventList';
import { CalendarEventRead } from './eventRead';
import { CalendarEventCreate } from './eventCreate';
import { CalendarEventUpdate } from './eventUpdate';
import { CalendarEventDelete } from './eventDelete';
import { CalendarConflictCheck } from './conflictCheck';
import { CalendarFindAvailableSlots } from './findAvailableSlots';

export function calendarRoutes() {
	const router = new OpenAPIHono();

	router.openapi(CalendarEventList.route, CalendarEventList.handle);
	router.openapi(CalendarEventRead.route, CalendarEventRead.handle);
	router.openapi(CalendarEventCreate.route, CalendarEventCreate.handle);
	router.openapi(CalendarEventUpdate.route, CalendarEventUpdate.handle);
	router.openapi(CalendarEventDelete.route, CalendarEventDelete.handle);
	router.openapi(CalendarConflictCheck.route, CalendarConflictCheck.handle);
	router.openapi(CalendarFindAvailableSlots.route, CalendarFindAvailableSlots.handle);

	return router;
}
