import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	// Logout is handled client-side by clearing the token
	// This endpoint can be used for server-side cleanup if needed
	return json({
		success: true,
		message: 'Logged out successfully'
	});
};

