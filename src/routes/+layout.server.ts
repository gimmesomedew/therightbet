import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// If user is not authenticated and not on login/register page, redirect
	if (!locals.user && url.pathname !== '/login' && url.pathname !== '/register') {
		throw redirect(302, '/login');
	}

	return {
		user: locals.user || null
	};
};

