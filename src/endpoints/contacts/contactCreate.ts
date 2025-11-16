import { createRoute, z } from '@hono/zod-openapi';

const BodySchema = z.object({
	account_id: z.number().int(),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	display_name: z.string().optional(),
	email_addresses: z.array(z.object({ address: z.string().email(), type: z.string().optional() })).optional(),
	phone_numbers: z.array(z.object({ number: z.string(), type: z.string().optional() })).optional(),
	company: z.string().optional(),
	job_title: z.string().optional(),
	notes: z.string().optional(),
	birthday: z.string().optional(),
	address: z.string().optional(),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		id: z.number(),
		message: z.string(),
	}),
});

export class ContactCreate {
	static route = createRoute({
		method: 'post',
		path: '/contacts',
		tags: ['Contacts'],
		summary: 'Create contact',
		description: 'Create a new contact and sync to the provider account',
		request: {
			body: {
				content: {
					'application/json': {
						schema: BodySchema,
					},
				},
			},
		},
		responses: {
			201: {
				description: 'Contact created successfully',
				content: {
					'application/json': {
						schema: ResponseSchema,
					},
				},
			},
		},
	});

	static async handle(c: any) {
		const data = c.req.valid('json');
		const db = c.env.DB as D1Database;

		// Generate a temporary provider contact ID (will be updated when synced)
		const providerContactId = `local-${Date.now()}`;

		const result = await db
			.prepare(
				`INSERT INTO contacts (
					account_id,
					provider_contact_id,
					first_name,
					last_name,
					display_name,
					email_addresses,
					phone_numbers,
					company,
					job_title,
					notes,
					birthday,
					address
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				data.account_id,
				providerContactId,
				data.first_name || null,
				data.last_name || null,
				data.display_name || null,
				data.email_addresses ? JSON.stringify(data.email_addresses) : null,
				data.phone_numbers ? JSON.stringify(data.phone_numbers) : null,
				data.company || null,
				data.job_title || null,
				data.notes || null,
				data.birthday || null,
				data.address || null
			)
			.run();

		// TODO: Trigger sync to provider account

		return c.json(
			{
				success: true,
				result: {
					id: result.meta.last_row_id,
					message: 'Contact created successfully',
				},
			},
			201
		);
	}
}
