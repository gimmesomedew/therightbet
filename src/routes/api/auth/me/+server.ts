import { json } from '@sveltejs/kit';
import { authService } from '$lib/services/auth.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	try {
		const authHeader = request.headers.get('authorization');
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({
				success: false,
				message: 'No valid authorization token provided'
			}, { status: 401 });
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix
		const user = await authService.getUserByToken(token);

		if (!user) {
			return json({
				success: false,
				message: 'Invalid or expired token'
			}, { status: 401 });
		}

		return json({
			success: true,
			user
		});
	} catch (error) {
		console.error('Get user error:', error);
		return json({
			success: false,
			message: 'Failed to get user information'
		}, { status: 500 });
	}
};
