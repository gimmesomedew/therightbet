import { json } from '@sveltejs/kit';
import { authService } from '$lib/services/auth.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({
				success: false,
				message: 'Email and password are required'
			}, { status: 400 });
		}

		const result = await authService.login({ email, password });

		if (result.success && result.token && result.user) {
			// Set HTTP-only cookie for security
			cookies.set('auth_token', result.token, {
				path: '/',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 30 * 60 // 30 minutes
			});

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
			}, { status: 401 });
		}
	} catch (error) {
		console.error('Login error:', error);
		return json({
			success: false,
			message: 'Login failed'
		}, { status: 500 });
	}
};
