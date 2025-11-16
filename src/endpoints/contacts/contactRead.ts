import { createRoute, z } from '@hono/zod-openapi';

const ParamsSchema = z.object({
	id: z.string().regex(/^\d+$/).transform(Number),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		id: z.number(),
		account_id: z.number(),
		provider_contact_id: z.string(),
		first_name: z.string().nullable(),
		last_name: z.string().nullable(),
		display_name: z.string().nullable(),
		email_addresses: z.string().nullable(),
		phone_numbers: z.string().nullable(),
		company: z.string().nullable(),
		job_title: z.string().nullable(),
		notes: z.string().nullable(),
		photo_url: z.string().nullable(),
		birthday: z.string().nullable(),
		address: z.string().nullable(),
		created_at: z.string(),
		updated_at: z.string(),
	}),
});

export class ContactRead {
	static route = createRoute({
		method: 'get',
		path: '/contacts/{id}',
		tags: ['Contacts'],
		summary: 'Get contact details',
		description: 'Get full details of a specific contact',
		request: {
			params: ParamsSchema,
		},
		responses: {
			200: {
				description: 'Contact details',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const { id } = c.req.valid('param');
		const db = c.env.DB as D1Database;

		const contact = await db
			.prepare('SELECT * FROM contacts WHERE id = ?')
			.bind(id)
			.first();

		if (!contact) {
			return c.json(
				{
					success: false,
					errors: [
						{
							code: 'NOT_FOUND',
							message: 'Contact not found',
						},
					],
				},
				404
			);
		}

		return c.json({
			success: true,
			result: contact,
		});
	}
}
