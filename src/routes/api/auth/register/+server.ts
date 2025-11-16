import { json } from '@sveltejs/kit';
import { authService } from '$lib/services/auth.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, password, first_name, last_name, invite_code } = await request.json();

		if (!email || !password || !invite_code) {
			return json({
				success: false,
				message: 'Email, password, and invite code are required'
			}, { status: 400 });
		}

		// Validate password strength
		if (password.length < 8) {
			return json({
				success: false,
				message: 'Password must be at least 8 characters long'
			}, { status: 400 });
		}

		const result = await authService.register({
			email,
			password,
			first_name,
			last_name,
			invite_code
		});

		if (result.success) {
			return json({
				success: true,
				user: result.user,
				token: result.token,
				message: result.message
			});
		} else {
			return json({
				success: false,
				message: result.message
			}, { status: 400 });
		}
	} catch (error) {
		console.error('Registration error:', error);
		return json({
			success: false,
			message: 'Registration failed'
		}, { status: 500 });
	}
};
