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

		const invites = await authService.getInvites();

		return json({
			success: true,
			data: invites
		});
	} catch (error) {
		console.error('Get invites error:', error);
		return json({
			success: false,
			message: 'Failed to get invites'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const userId = await verifyAdminToken(request);
		if (!userId) {
			return json({
				success: false,
				message: 'Unauthorized'
			}, { status: 401 });
		}

		const { email } = await request.json();

		if (!email) {
			return json({
				success: false,
				message: 'Email is required'
			}, { status: 400 });
		}

		const result = await authService.createInvite(email, userId);

		return json({
			success: result.success,
			invite_code: result.invite_code,
			message: result.message
		});
	} catch (error) {
		console.error('Create invite error:', error);
		return json({
			success: false,
			message: 'Failed to create invite'
		}, { status: 500 });
	}
};
