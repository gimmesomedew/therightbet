import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Vercel adapter for serverless deployment
		adapter: adapter({
			// Optional: Configure runtime regions, edge functions, etc.
			// See https://kit.svelte.dev/docs/adapter-vercel for options
		})
	}
};

export default config;
