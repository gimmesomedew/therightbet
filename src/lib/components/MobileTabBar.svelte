<script lang="ts">
	import { page } from '$app/stores';
	
	const sportsItems = [
		{
			title: 'WNBA',
			href: '/',
			icon: 'basketball'
		},
		{
			title: 'NBA',
			href: '/sports/nba',
			icon: 'basketball'
		},
		{
			title: 'NFL',
			href: '/sports/nfl',
			icon: 'football'
		},
		{
			title: 'NCAA',
			href: '/sports/ncaa',
			icon: 'football'
		}
		// MLB excluded because it has "Coming Soon" badge
	];
	
	function getIconPath(iconName: string): string {
		const icons: Record<string, string> = {
			basketball: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
			football: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'
		};
		return icons[iconName] || icons.basketball;
	}
	
	function isActive(href: string): boolean {
		const currentPath = $page.url.pathname;
		if (href === '/') {
			return currentPath === '/';
		}
		return currentPath === href || currentPath.startsWith(href + '/');
	}
</script>

<nav class="mobile-tab-bar">
	{#each sportsItems as item}
		<a
			href={item.href}
			class="tab-item"
			class:active={isActive(item.href)}
			role="tab"
			aria-label={item.title}
			aria-selected={isActive(item.href)}
		>
			{#if item.icon === 'basketball'}
				<svg 
					width="24" 
					height="24" 
					viewBox="0 0 24 24" 
					fill={isActive(item.href) ? "currentColor" : "none"} 
					stroke="currentColor" 
					stroke-width="2" 
					stroke-linecap="round" 
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10"></circle>
					<path d="M12 2v20M2 12h20M6.34 6.34l11.32 11.32M17.66 6.34l-11.32 11.32"></path>
				</svg>
			{:else if item.icon === 'football'}
				<svg 
					width="24" 
					height="24" 
					viewBox="0 0 24 24" 
					fill={isActive(item.href) ? "currentColor" : "none"} 
					stroke="currentColor" 
					stroke-width="2" 
					stroke-linecap="round" 
					stroke-linejoin="round"
				>
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
					<path d="M12 2v20M2 12h20"></path>
					<path d="M6.34 6.34l11.32 11.32M17.66 6.34l-11.32 11.32"></path>
				</svg>
			{/if}
			<span class="tab-label">{item.title}</span>
		</a>
	{/each}
</nav>

<style>
	.mobile-tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		border-top: 1px solid #e5e7eb;
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		padding-bottom: env(safe-area-inset-bottom);
		height: 64px;
		/* Hide on desktop by default */
		display: none;
	}
	
	.tab-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-sm) var(--spacing-xs);
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: all 0.2s ease;
		min-height: 56px;
		gap: 4px;
	}
	
	.tab-item:hover {
		background-color: #f8fafc;
	}
	
	.tab-item.active {
		color: var(--color-primary);
		background-color: rgba(59, 130, 246, 0.05);
	}
	
	.tab-item svg {
		flex-shrink: 0;
	}
	
	.tab-label {
		font-size: 0.75rem;
		font-weight: 500;
		text-align: center;
	}
	
	.tab-item.active .tab-label {
		font-weight: 600;
	}
	
	/* Show only on mobile */
	@media (max-width: 767px) {
		.mobile-tab-bar {
			display: flex;
		}
	}
</style>

