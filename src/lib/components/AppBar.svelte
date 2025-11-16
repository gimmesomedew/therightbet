<script lang="ts">
	import { authStore } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	
	interface Props {
		ontoggleDrawer?: () => void;
	}
	
	const { ontoggleDrawer } = $props<Props>();
	
	let userMenuOpen = $state(false);
	let userMenuButton: HTMLButtonElement | null = $state(null);
	
	function toggleDrawer() {
		ontoggleDrawer?.();
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	function closeUserMenu() {
		userMenuOpen = false;
	}

	async function handleLogout() {
		await authStore.logout();
		closeUserMenu();
		goto('/login');
	}

	function getInitials(user: { first_name?: string; last_name?: string; email: string }): string {
		if (user.first_name && user.last_name) {
			return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
		}
		if (user.first_name) {
			return user.first_name[0].toUpperCase();
		}
		return user.email[0].toUpperCase();
	}

	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Node;
		if (userMenuButton && !userMenuButton.contains(target)) {
			const dropdown = document.querySelector('.user-dropdown');
			if (dropdown && !dropdown.contains(target)) {
				closeUserMenu();
			}
		}
	}

	let cleanup: (() => void) | null = null;

	onMount(() => {
		cleanup = () => {
			document.removeEventListener('click', handleClickOutside);
		};
		document.addEventListener('click', handleClickOutside);
		return cleanup;
	});

	onDestroy(() => {
		if (cleanup) {
			cleanup();
		}
	});
</script>

<header class="app-bar">
	<div class="app-bar-content">
		<div class="app-bar-left">
			<button class="menu-button" onclick={toggleDrawer} aria-label="Toggle navigation">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="3" y1="6" x2="21" y2="6"></line>
					<line x1="3" y1="12" x2="21" y2="12"></line>
					<line x1="3" y1="18" x2="21" y2="18"></line>
				</svg>
			</button>
			
			<div class="logo">
				<h1>THERiGHTBET</h1>
				<div class="sport-badge">WNBA Betting Analytics</div>
			</div>
		</div>
		
				<div class="app-bar-right">
			<button class="alerts-button">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
					<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
				</svg>
				<span>Alerts</span>
			</button>

			{#if $authStore.user}
				<div class="user-menu">
					<button 
						bind:this={userMenuButton}
						class="user-button" 
						aria-label="User menu"
						aria-expanded={userMenuOpen}
						onclick={toggleUserMenu}
					>
						<div class="user-avatar">
							{getInitials($authStore.user)}
						</div>
						<span class="user-name">
							{$authStore.user.first_name || $authStore.user.email.split('@')[0]}
						</span>
						<svg 
							class="dropdown-arrow" 
							class:open={userMenuOpen}
							width="16" 
							height="16" 
							viewBox="0 0 24 24" 
							fill="none" 
							stroke="currentColor" 
							stroke-width="2"
						>
							<polyline points="6,9 12,15 18,9"></polyline>
						</svg>
					</button>
					
					{#if userMenuOpen}
						<div class="user-dropdown" role="menu">
							<div class="user-info">
								<div class="user-email">{$authStore.user.email}</div>
								<div class="user-tier">{$authStore.user.subscription_tier}</div>
							</div>
							<button class="logout-button" onclick={handleLogout} role="menuitem">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
									<polyline points="16,17 21,12 16,7"></polyline>
									<line x1="21" y1="12" x2="9" y2="12"></line>
								</svg>
								Logout
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<button class="menu-dots" aria-label="Menu options">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="1"></circle>
						<circle cx="19" cy="12" r="1"></circle>
						<circle cx="5" cy="12" r="1"></circle>
					</svg>
				</button>
			{/if}
		</div>
	</div>
</header>

<style>
	.app-bar {
		background: var(--color-primary);
		box-shadow: var(--shadow-sm);
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1100;
		width: 100%;
	}
	
	.app-bar-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-md) var(--spacing-lg);
		max-width: 100%;
	}
	
	.app-bar-left {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}
	
	.menu-button {
		background: none;
		border: none;
		padding: var(--spacing-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		color: white;
		transition: background-color 0.2s ease;
	}
	
	.menu-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}
	
	.logo h1 {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: white;
		margin: 0;
	}
	
	.sport-badge {
		font-size: var(--font-size-sm);
		color: white;
		background: rgba(255, 255, 255, 0.2);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-full);
		font-weight: 500;
		margin-left: var(--spacing-sm);
	}
	
	.app-bar-right {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}
	
	.alerts-button {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.alerts-button:hover {
		background: rgba(255, 255, 255, 0.3);
	}
	
	.menu-dots {
		padding: var(--spacing-sm);
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: all 0.2s ease;
	}
	
	.menu-dots:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.user-menu {
		position: relative;
	}

	.user-button {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm);
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: background-color 0.2s ease;
		position: relative;
	}

	.user-button:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.dropdown-arrow {
		transition: transform 0.2s ease;
		margin-left: var(--spacing-xs);
	}

	.dropdown-arrow.open {
		transform: rotate(180deg);
	}

	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.user-name {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + var(--spacing-xs));
		right: 0;
		background: white;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		padding: var(--spacing-sm);
		min-width: 220px;
		z-index: 1000;
		animation: slideDown 0.2s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.user-info {
		padding: var(--spacing-sm);
		border-bottom: 1px solid var(--color-border);
		margin-bottom: var(--spacing-sm);
	}

	.user-email {
		font-size: 0.875rem;
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.user-tier {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}

	.logout-button {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		width: 100%;
		padding: var(--spacing-sm);
		background: none;
		border: none;
		color: var(--color-text-primary);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s ease;
		font-size: 0.875rem;
	}

	.logout-button:hover {
		background: #f1f5f9;
	}
	
	@media (max-width: 768px) {
		.app-bar-content {
			padding: var(--spacing-sm) var(--spacing-md);
		}
		
		.logo h1 {
			font-size: var(--font-size-lg);
		}

		.user-name {
			display: none;
		}

		.user-dropdown {
			right: -1rem;
		}
	}
</style>
