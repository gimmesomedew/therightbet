// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { User } from '$lib/services/auth.js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
			token: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};