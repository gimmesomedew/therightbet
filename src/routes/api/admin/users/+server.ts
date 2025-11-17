import { json } from '@sveltejs/kit';
import { authService } from '$lib/services/auth.js';
import type { RequestHandler } from './$types';

// Helper function to verify admin token
async function verifyAdminToken(request: Request): Promise<string | null> {
	const authHeader = request.headers.get('authorization');
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.substring(7);
	const user = await authService.getUserByToken(token);
	
	// For now, we'll consider all users as admins
	// In a real app, you'd check for admin role/permissions
	return user ? user.id : null;
}

export const GET: RequestHandler = async ({ request }) => {
	try {
		const userId = await verifyAdminToken(request);
		if (!userId) {
			return json({
				success: false,
				message: 'Unauthorized'
			}, { status: 401 });
		}

		const users = await authService.getAllUsers();

		return json({
			success: true,
			data: users
		});
	} catch (error) {
		console.error('Get users error:', error);
		return json({
			success: false,
			message: 'Failed to get users'
		}, { status: 500 });
	}
};

