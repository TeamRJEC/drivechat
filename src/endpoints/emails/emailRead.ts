import { createRoute, z } from '@hono/zod-openapi';

const ParamsSchema = z.object({
	id: z.string().regex(/^\d+$/).transform(Number),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		id: z.number(),
		account_id: z.number(),
		message_id: z.string(),
		thread_id: z.string().nullable(),
		from_address: z.string(),
		from_name: z.string().nullable(),
		to_addresses: z.string(),
		cc_addresses: z.string().nullable(),
		bcc_addresses: z.string().nullable(),
		subject: z.string().nullable(),
		body_plain: z.string().nullable(),
		body_html: z.string().nullable(),
		snippet: z.string().nullable(),
		received_at: z.string(),
		is_read: z.number(),
		is_flagged: z.number(),
		is_archived: z.number(),
		labels: z.string().nullable(),
		attachments: z.string().nullable(),
		created_at: z.string(),
	}),
});

export class EmailRead {
	static route = createRoute({
		method: 'get',
		path: '/emails/{id}',
		tags: ['Emails'],
		summary: 'Get email details',
		description: 'Get full details of a specific email',
		request: {
			params: ParamsSchema,
		},
		responses: {
			200: {
				description: 'Email details',
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

		const email = await db
			.prepare(
				`SELECT * FROM emails WHERE id = ?`
			)
			.bind(id)
			.first();

		if (!email) {
			return c.json(
				{
					success: false,
					errors: [
						{
							code: 'NOT_FOUND',
							message: 'Email not found',
						},
					],
				},
				404
			);
		}

		return c.json({
			success: true,
			result: email,
		});
	}
}
