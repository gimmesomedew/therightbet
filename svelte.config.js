import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto detects the deployment environment
		// It will use adapter-vercel when deployed to Vercel
		// See https://kit.svelte.dev/docs/adapter-auto for more info
		adapter: adapter()
	}
};

export default config;
