<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import AppBar from '$lib/components/AppBar.svelte';
	import NavigationDrawer from '$lib/components/NavigationDrawer.svelte';
	import MobileTabBar from '$lib/components/MobileTabBar.svelte';
	import { authStore } from '$lib/stores/auth.js';
	import type { PageData } from './$types';

	let { data, children }: { data: PageData; children: any } = $props();
	
	let drawerOpen = $state(false);
	
	function toggleDrawer() {
		drawerOpen = !drawerOpen;
	}

	// Check if user is authenticated and not on login/register pages
	const isAuthenticated = $derived(data.user !== null);
	const isPublicPage = $derived($page.url.pathname === '/login' || $page.url.pathname === '/register');
	const showSidebar = $derived(isAuthenticated && !isPublicPage);

	// Sync server-side user data with client-side auth store on mount
	onMount(() => {
		if (data.user) {
			// If we have server-side user but no client-side user, sync them
			// This ensures the avatar menu shows up immediately
			const token = localStorage.getItem('auth_token');
			if (token && !authStore.user) {
				authStore.setAuth(data.user, token);
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>THERiGHTBET - Sports Betting Analytics</title>
	<meta name="description" content="Professional sports betting analytics and insights for WNBA and NFL" />
</svelte:head>

	<div class="app-layout">
	<AppBar ontoggleDrawer={toggleDrawer} />
	
	<div class="main-content">
		{#if showSidebar}
			<NavigationDrawer bind:open={drawerOpen} />
		{/if}
		
		<main class="content-area" class:no-sidebar={!showSidebar}>
			{@render children?.()}
		</main>
	</div>
	
	{#if showSidebar}
		<MobileTabBar />
	{/if}
</div>

<style>
	.app-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: 64px; /* Account for fixed header */
	}
	
	.main-content {
		flex: 1;
		display: flex;
		position: relative;
		width: 100%;
		min-height: calc(100vh - 64px);
	}
	
	.content-area {
		flex: 1;
		padding: 0;
		margin: 0;
		background-color: #f8fafc;
		min-height: calc(100vh - 64px);
		overflow-y: auto;
		transition: margin-left 0.3s ease;
	}

	.content-area.no-sidebar {
		margin-left: 0;
		width: 100%;
	}
	
	/* Add padding for mobile tab bar */
	@media (max-width: 767px) {
		.content-area {
			padding-bottom: 64px;
		}
	}
</style>
