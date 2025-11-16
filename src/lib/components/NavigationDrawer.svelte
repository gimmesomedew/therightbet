<script lang="ts">
	import { page } from '$app/stores';
	
	let { open = $bindable(false) } = $props();
	
	const sportsItems = [
		{
			title: 'WNBA',
		href: '/',
			icon: 'basketball',
			badge: null
		},
		{
			title: 'NFL',
			href: '/sports/nfl',
			icon: 'football',
		badge: null
		},
		{
			title: 'MLB',
			href: '/sports/mlb',
			icon: 'baseball',
			badge: 'Coming Soon'
		}
	];
	
	const toolsItems = [
		{
			title: 'Analytics',
			href: '/analytics',
			icon: 'bar-chart',
			active: false
		},
		{
			title: 'Bet History',
			href: '/history',
			icon: 'clock',
			active: false
		},
		{
			title: 'Favorites',
			href: '/favorites',
			icon: 'star',
			active: false
		},
		{
			title: 'Admin Panel',
			href: '/admin',
			icon: 'settings',
			active: false
		}
	];
	
	function getIconPath(iconName: string): string {
		const icons: Record<string, string> = {
			basketball: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2a10 10 0 100 20 10 10 0 000-20z',
			football: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2a10 10 0 100 20 10 10 0 000-20z',
			baseball: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2a10 10 0 100 20 10 10 0 000-20z',
			'bar-chart': 'M12 20V10 M18 20V4 M6 20v-4',
			clock: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2',
			star: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
			settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'
		};
		return icons[iconName] || icons.basketball;
	}
</script>

<!-- Mobile Overlay -->
{#if open}
	<div 
		class="drawer-overlay" 
		role="button"
		tabindex="0"
		onclick={() => open = false}
		onkeydown={(e) => e.key === 'Escape' && (open = false)}
		aria-label="Close navigation drawer"
	></div>
{/if}

<!-- Navigation Drawer -->
<nav class="navigation-drawer" class:open>
	<div class="drawer-content">
		<!-- Sports Section -->
		<div class="nav-section">
			<h3 class="section-title">SPORTS</h3>
			<ul class="nav-list">
				{#each sportsItems as item}
					<li class="nav-item">
						<a
							href={item.href}
							class="nav-link"
							class:active={$page.url.pathname === item.href || $page.url.pathname.startsWith(item.href + '/') }
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d={getIconPath(item.icon)} />
							</svg>
							<span>{item.title}</span>
							{#if item.badge}
								<span class="badge">{item.badge}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</div>
		
		<!-- Tools Section -->
		<div class="nav-section">
			<h3 class="section-title">TOOLS</h3>
			<ul class="nav-list">
				{#each toolsItems as item}
					<li class="nav-item">
						<a href={item.href} class="nav-link" class:active={$page.url.pathname === item.href}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d={getIconPath(item.icon)} />
							</svg>
							<span>{item.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</nav>

<style>
	.drawer-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 999;
	}
	
	.navigation-drawer {
		position: fixed;
		top: 64px;
		left: 0;
		width: 240px;
		height: calc(100vh - 64px);
		background: white;
		border-right: 1px solid #e5e7eb;
		box-shadow: var(--shadow-lg);
		transform: translateX(-100%);
		transition: transform 0.3s ease;
		z-index: 1050;
		overflow-y: auto;
	}
	
	.navigation-drawer.open {
		transform: translateX(0);
	}
	
	@media (min-width: 768px) {
		.navigation-drawer {
			transform: translateX(0);
		}
	}
	
	.drawer-content {
		padding: var(--spacing-lg) 0;
	}
	
	.nav-section {
		margin-bottom: var(--spacing-xl);
	}
	
	.section-title {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 var(--spacing-md) var(--spacing-lg);
	}
	
	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	
	.nav-item {
		margin: 0;
	}
	
	.nav-link {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md) var(--spacing-lg);
		color: var(--color-text-primary);
		text-decoration: none;
		transition: all 0.2s ease;
		position: relative;
	}
	
	.nav-link:hover {
		background-color: #f8fafc;
		color: var(--color-primary);
	}
	
	.nav-link.active {
		background-color: var(--color-primary);
		color: white;
		border-radius: var(--radius-md);
		margin: 0 var(--spacing-sm);
	}
	
	.nav-link.disabled {
		opacity: 0.5;
		pointer-events: none;
	}
	
	.nav-link svg {
		flex-shrink: 0;
	}
	
	.nav-link span {
		flex: 1;
		font-weight: 500;
	}
	
	.badge {
		font-size: var(--font-size-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-full);
		background-color: #e5e7eb;
		color: var(--color-text-secondary);
		font-weight: 500;
	}
	

	
	@media (min-width: 768px) {
		.drawer-overlay {
			display: none;
		}
		
		.navigation-drawer {
			position: static;
			transform: translateX(0);
			box-shadow: none;
			border-right: 1px solid #e5e7eb;
		}
	}
</style>
