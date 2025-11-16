<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import AppBar from '$lib/components/AppBar.svelte';
	import NavigationDrawer from '$lib/components/NavigationDrawer.svelte';

	let { children } = $props();
	
	let drawerOpen = $state(false);
	
	function toggleDrawer() {
		drawerOpen = !drawerOpen;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>THERiGHTBET - Sports Betting Analytics</title>
	<meta name="description" content="Professional sports betting analytics and insights for WNBA and NFL" />
</svelte:head>

<div class="app-layout">
	<AppBar ontoggleDrawer={toggleDrawer} />
	
	<div class="main-content">
		<NavigationDrawer bind:open={drawerOpen} />
		
		<main class="content-area">
			{@render children?.()}
		</main>
	</div>
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
	
	@media (min-width: 768px) {
		.content-area {
			/* No margin - content flows directly next to sidebar */
		}
	}
</style>
