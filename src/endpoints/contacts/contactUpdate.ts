import { createRoute, z } from '@hono/zod-openapi';

const ParamsSchema = z.object({
	id: z.string().regex(/^\d+$/).transform(Number),
});

const BodySchema = z.object({
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
		message: z.string(),
	}),
});

export class ContactUpdate {
	static route = createRoute({
		method: 'patch',
		path: '/contacts/{id}',
		tags: ['Contacts'],
		summary: 'Update contact',
		description: 'Update contact information and sync to provider account',
		request: {
			params: ParamsSchema,
			body: {
				content: {
					'application/json': {
						schema: BodySchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: 'Contact updated successfully',
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
		const data = c.req.valid('json');
		const db = c.env.DB as D1Database;

		// Build SET clause
		const fields: string[] = [];
		const params: any[] = [];

		if (data.first_name !== undefined) {
			fields.push('first_name = ?');
			params.push(data.first_name);
		}

		if (data.last_name !== undefined) {
			fields.push('last_name = ?');
			params.push(data.last_name);
		}

		if (data.display_name !== undefined) {
			fields.push('display_name = ?');
			params.push(data.display_name);
		}

		if (data.email_addresses !== undefined) {
			fields.push('email_addresses = ?');
			params.push(JSON.stringify(data.email_addresses));
		}

		if (data.phone_numbers !== undefined) {
			fields.push('phone_numbers = ?');
			params.push(JSON.stringify(data.phone_numbers));
		}

		if (data.company !== undefined) {
			fields.push('company = ?');
			params.push(data.company);
		}

		if (data.job_title !== undefined) {
			fields.push('job_title = ?');
			params.push(data.job_title);
		}

		if (data.notes !== undefined) {
			fields.push('notes = ?');
			params.push(data.notes);
		}

		if (data.birthday !== undefined) {
			fields.push('birthday = ?');
			params.push(data.birthday);
		}

		if (data.address !== undefined) {
			fields.push('address = ?');
			params.push(data.address);
		}

		if (fields.length === 0) {
			return c.json(
				{
					success: false,
					errors: [
						{
							code: 'INVALID_REQUEST',
							message: 'No valid fields to update',
						},
					],
				},
				400
			);
		}

		fields.push('updated_at = CURRENT_TIMESTAMP');
		params.push(id);

		await db
			.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`)
			.bind(...params)
			.run();

		// TODO: Trigger sync to provider account

		return c.json({
			success: true,
			result: {
				message: 'Contact updated successfully',
			},
		});
	}
}
