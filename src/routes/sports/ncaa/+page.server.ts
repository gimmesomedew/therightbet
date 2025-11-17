import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Authentication is handled by hooks.server.ts
	// This page requires authentication
	return {
		user: locals.user
	};
};

