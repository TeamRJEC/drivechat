import { createRoute, z } from '@hono/zod-openapi';

const ParamsSchema = z.object({
	id: z.string().regex(/^\d+$/).transform(Number),
});

const BodySchema = z.object({
	is_read: z.number().int().min(0).max(1).optional(),
	is_flagged: z.number().int().min(0).max(1).optional(),
	is_archived: z.number().int().min(0).max(1).optional(),
});

const ResponseSchema = z.object({
	success: z.boolean(),
	result: z.object({
		message: z.string(),
	}),
});

export class EmailUpdate {
	static route = createRoute({
		method: 'patch',
		path: '/emails/{id}',
		tags: ['Emails'],
		summary: 'Update email',
		description: 'Update email properties (read, flagged, archived)',
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
				description: 'Email updated successfully',
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
		const updates = c.req.valid('json');
		const db = c.env.DB as D1Database;

		// Build SET clause
		const fields: string[] = [];
		const params: any[] = [];

		if (updates.is_read !== undefined) {
			fields.push('is_read = ?');
			params.push(updates.is_read);
		}

		if (updates.is_flagged !== undefined) {
			fields.push('is_flagged = ?');
			params.push(updates.is_flagged);
		}

		if (updates.is_archived !== undefined) {
			fields.push('is_archived = ?');
			params.push(updates.is_archived);
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

		params.push(id);

		await db
			.prepare(`UPDATE emails SET ${fields.join(', ')} WHERE id = ?`)
			.bind(...params)
			.run();

		return c.json({
			success: true,
			result: {
				message: 'Email updated successfully',
			},
		});
	}
}
