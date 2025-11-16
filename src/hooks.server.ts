import { authService } from '$lib/services/auth.js';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/validate-invite'];

function isPublicRoute(pathname: string): boolean {
	return publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies, request } = event;
	const pathname = url.pathname;

	// Allow public routes
	if (isPublicRoute(pathname)) {
		return resolve(event);
	}

	// Check for authentication token (prefer cookie, fallback to header)
	let authToken = cookies.get('auth_token');
	if (!authToken) {
		const authHeader = request.headers.get('authorization');
		if (authHeader?.startsWith('Bearer ')) {
			authToken = authHeader.replace('Bearer ', '');
		}
	}

	if (!authToken) {
		// No token found, redirect to login
		if (pathname !== '/login') {
			throw redirect(302, '/login');
		}
		return resolve(event);
	}

	// Verify token
	const decoded = authService.verifyToken(authToken);
	if (!decoded) {
		// Invalid or expired token, clear cookie and redirect
		cookies.delete('auth_token', { path: '/' });
		if (pathname !== '/login') {
			throw redirect(302, '/login');
		}
		return resolve(event);
	}

	// Token is valid, get user and attach to event
	try {
		const user = await authService.getUserById(decoded.userId);
		if (!user) {
			// User not found, clear cookie and redirect
			cookies.delete('auth_token', { path: '/' });
			if (pathname !== '/login') {
				throw redirect(302, '/login');
			}
			return resolve(event);
		}

		// Attach user to event locals for use in load functions
		event.locals.user = user;
		event.locals.token = authToken;
	} catch (error) {
		console.error('Error verifying user:', error);
		cookies.delete('auth_token', { path: '/' });
		if (pathname !== '/login') {
			throw redirect(302, '/login');
		}
		return resolve(event);
	}

	return resolve(event);
};

