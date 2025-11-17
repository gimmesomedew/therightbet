import { json } from '@sveltejs/kit';
import { authService } from '$lib/services/auth.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Get auth token from cookie or header
		const authToken = cookies.get('auth_token') || request.headers.get('authorization')?.replace('Bearer ', '');

		if (!authToken) {
			return json({
				success: false,
				message: 'Unauthorized'
			}, { status: 401 });
		}

		// Verify token and get user
		const user = await authService.getUserByToken(authToken);
		if (!user) {
			return json({
				success: false,
				message: 'Unauthorized'
			}, { status: 401 });
		}

		const { currentPassword, newPassword } = await request.json();

		if (!currentPassword || !newPassword) {
			return json({
				success: false,
				message: 'Current password and new password are required'
			}, { status: 400 });
		}

		const result = await authService.changePassword(user.id, currentPassword, newPassword);

		if (result.success) {
			return json({
				success: true,
				message: result.message
			});
		} else {
			return json({
				success: false,
				message: result.message
			}, { status: 400 });
		}
	} catch (error) {
		console.error('Change password error:', error);
		return json({
			success: false,
			message: 'Failed to change password'
		}, { status: 500 });
	}
};

