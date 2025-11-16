import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { User } from '$lib/services/auth.js';

interface AuthState {
	user: User | null;
	token: string | null;
	isLoading: boolean;
	isAuthenticated: boolean;
}

class AuthStore {
	private state = writable<AuthState>({
		user: null,
		token: null,
		isLoading: true,
		isAuthenticated: false
	});

	constructor() {
		if (browser) {
			this.initializeFromStorage();
		}
	}

	private initializeFromStorage() {
		try {
			const token = localStorage.getItem('auth_token');
			const userStr = localStorage.getItem('auth_user');
			
			if (token && userStr) {
				const user = JSON.parse(userStr);
				this.state.update(state => ({
					...state,
					token,
					user,
					isAuthenticated: true,
					isLoading: false
				}));
			} else {
				this.state.update(state => ({
					...state,
					isLoading: false
				}));
			}
		} catch (error) {
			console.error('Error initializing auth from storage:', error);
			this.clearAuth();
		}
	}

	private saveToStorage() {
		if (browser) {
			this.state.subscribe(state => {
				if (state.token && state.user) {
					localStorage.setItem('auth_token', state.token);
					localStorage.setItem('auth_user', JSON.stringify(state.user));
				} else {
					this.clearStorage();
				}
			})();
		}
	}

	private clearStorage() {
		if (browser) {
			localStorage.removeItem('auth_token');
			localStorage.removeItem('auth_user');
		}
	}

	setAuth(user: User, token: string) {
		this.state.update(state => ({
			...state,
			user,
			token,
			isAuthenticated: true,
			isLoading: false
		}));
		this.saveToStorage();
	}

	clearAuth() {
		this.state.update(state => ({
			...state,
			user: null,
			token: null,
			isAuthenticated: false,
			isLoading: false
		}));
		this.clearStorage();
	}

	setLoading(loading: boolean) {
		this.state.update(state => ({
			...state,
			isLoading: loading
		}));
	}

	async login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
		this.setLoading(true);
		
		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (data.success) {
				this.setAuth(data.user, data.token);
				return { success: true };
			} else {
				return { success: false, message: data.message };
			}
		} catch (error) {
			console.error('Login error:', error);
			return { success: false, message: 'Login failed' };
		} finally {
			this.setLoading(false);
		}
	}

	async register(email: string, password: string, inviteCode: string, firstName?: string, lastName?: string): Promise<{ success: boolean; message?: string }> {
		this.setLoading(true);
		
		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email,
					password,
					first_name: firstName,
					last_name: lastName,
					invite_code: inviteCode
				})
			});

			const data = await response.json();

			if (data.success) {
				this.setAuth(data.user, data.token);
				return { success: true };
			} else {
				return { success: false, message: data.message };
			}
		} catch (error) {
			console.error('Registration error:', error);
			return { success: false, message: 'Registration failed' };
		} finally {
			this.setLoading(false);
		}
	}

	async validateInvite(inviteCode: string): Promise<{ success: boolean; email?: string; message?: string }> {
		try {
			const response = await fetch('/api/auth/validate-invite', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ invite_code: inviteCode })
			});

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Invite validation error:', error);
			return { success: false, message: 'Failed to validate invite code' };
		}
	}

	async logout() {
		this.clearAuth();
	}

	async refreshUser(): Promise<boolean> {
		let currentToken: string | null = null;
		this.state.subscribe(state => {
			currentToken = state.token;
		})();

		if (!currentToken) {
			return false;
		}

		try {
			const response = await fetch('/api/auth/me', {
				headers: {
					'Authorization': `Bearer ${currentToken}`
				}
			});

			const data = await response.json();

			if (data.success) {
				this.state.update(state => ({
					...state,
					user: data.user
				}));
				this.saveToStorage();
				return true;
			} else {
				this.clearAuth();
				return false;
			}
		} catch (error) {
			console.error('Refresh user error:', error);
			this.clearAuth();
			return false;
		}
	}

	// Getters
	get user() {
		let currentUser: User | null = null;
		this.state.subscribe(state => {
			currentUser = state.user;
		})();
		return currentUser;
	}

	get token() {
		let currentToken: string | null = null;
		this.state.subscribe(state => {
			currentToken = state.token;
		})();
		return currentToken;
	}

	get isLoading() {
		let loading = false;
		this.state.subscribe(state => {
			loading = state.isLoading;
		})();
		return loading;
	}

	get isAuthenticated() {
		let authenticated = false;
		this.state.subscribe(state => {
			authenticated = state.isAuthenticated;
		})();
		return authenticated;
	}

	// Subscribe method for reactive updates
	subscribe(callback: (state: AuthState) => void) {
		return this.state.subscribe(callback);
	}
}

// Export singleton instance
export const authStore = new AuthStore();
