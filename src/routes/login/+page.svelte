<script lang="ts">
	import { authStore } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let isLoading = $state(false);

	// Redirect if already authenticated
	onMount(() => {
		authStore.subscribe(state => {
			if (state.isAuthenticated) {
				goto('/');
			}
		});
	});

	async function handleLogin(event: Event) {
		event.preventDefault();
		if (!email || !password) {
			error = 'Please fill in all fields';
			return;
		}

		isLoading = true;
		error = '';

		const result = await authStore.login(email, password);

		if (result.success) {
			goto('/');
		} else {
			error = result.message || 'Login failed';
		}

		isLoading = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleLogin(event);
		}
	}
</script>

<svelte:head>
	<title>Login - THERiGHTBET</title>
	<meta name="description" content="Login to your THERiGHTBET account" />
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="login-header">
			<h1>THERiGHTBET</h1>
			<p class="subtitle">Professional Sports Betting Analytics</p>
		</div>

		<form onsubmit={handleLogin} class="login-form">
			<div class="form-group">
				<label for="email">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					onkeydown={handleKeydown}
					placeholder="Enter your email"
					required
					disabled={isLoading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					onkeydown={handleKeydown}
					placeholder="Enter your password"
					required
					disabled={isLoading}
				/>
			</div>

			{#if error}
				<div class="error-message">
					{error}
				</div>
			{/if}

			<button type="submit" class="login-button" disabled={isLoading}>
				{#if isLoading}
					<span class="loading-spinner"></span>
					Signing In...
				{:else}
					Sign In
				{/if}
			</button>
		</form>

		<div class="login-footer">
			<p class="invite-only">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.53L12 17.27l-5.18 2.46L8 14.14l-5-4.87 6.91-1.01L12 2z"/>
				</svg>
				Invite-only platform
			</p>
			<p class="need-invite">
				Need an invite? Contact your administrator.
			</p>
		</div>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--color-primary) 0%, #16a34a 100%);
		padding: 1rem;
	}

	.login-card {
		background: white;
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-2xl);
		padding: 2rem;
		width: 100%;
		max-width: 400px;
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-primary);
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin: 0;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-weight: 500;
		color: var(--color-text-primary);
		font-size: 0.875rem;
	}

	.form-group input {
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 1rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
	}

	.form-group input:disabled {
		background-color: #f8fafc;
		cursor: not-allowed;
	}

	.error-message {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 0.75rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		border: 1px solid #fecaca;
	}

	.login-button {
		background-color: var(--color-primary);
		color: white;
		border: none;
		padding: 0.875rem 1.5rem;
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.login-button:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.login-button:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.login-footer {
		margin-top: 2rem;
		text-align: center;
	}

	.invite-only {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: var(--color-accent);
		font-weight: 500;
		font-size: 0.875rem;
		margin: 0 0 0.5rem 0;
	}

	.need-invite {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		margin: 0;
	}

	@media (max-width: 480px) {
		.login-card {
			padding: 1.5rem;
		}

		.login-header h1 {
			font-size: 1.75rem;
		}
	}
</style>
