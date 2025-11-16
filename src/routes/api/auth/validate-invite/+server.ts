import { json } from '@sveltejs/kit';
import { authService } from '$lib/services/auth.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { invite_code } = await request.json();

		if (!invite_code) {
			return json({
				success: false,
				message: 'Invite code is required'
			}, { status: 400 });
		}

		const result = await authService.validateInvite(invite_code);

		return json({
			success: result.valid,
			email: result.email,
			message: result.message
		});
	} catch (error) {
		console.error('Invite validation error:', error);
		return json({
			success: false,
			message: 'Failed to validate invite code'
		}, { status: 500 });
	}
};
