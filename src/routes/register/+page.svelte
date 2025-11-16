<script lang="ts">
	import { authStore } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let inviteCode = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let error = $state('');
	let isLoading = $state(false);
	let inviteValid = $state(false);
	let inviteEmail = $state('');

	// Redirect if already authenticated
	onMount(() => {
		authStore.subscribe(state => {
			if (state.isAuthenticated) {
				goto('/');
			}
		});
	});

	async function validateInvite(event: Event) {
		event.preventDefault();
		if (!inviteCode) {
			error = 'Please enter an invite code';
			return;
		}

		isLoading = true;
		error = '';

		const result = await authStore.validateInvite(inviteCode);

		if (result.success) {
			inviteValid = true;
			inviteEmail = result.email || '';
			email = result.email || '';
		} else {
			error = result.message || 'Invalid invite code';
			inviteValid = false;
		}

		isLoading = false;
	}

	async function handleRegister(event: Event) {
		event.preventDefault();
		if (!inviteValid) {
			error = 'Please validate your invite code first';
			return;
		}

		if (!email || !password || !confirmPassword) {
			error = 'Please fill in all required fields';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters long';
			return;
		}

		isLoading = true;
		error = '';

		const result = await authStore.register(email, password, inviteCode, firstName, lastName);

		if (result.success) {
			goto('/');
		} else {
			error = result.message || 'Registration failed';
		}

		isLoading = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			if (!inviteValid) {
				validateInvite(event);
			} else {
				handleRegister(event);
			}
		}
	}
</script>

<svelte:head>
	<title>Register - THERiGHTBET</title>
	<meta name="description" content="Register for your THERiGHTBET account with an invite code" />
</svelte:head>

<div class="register-container">
	<div class="register-card">
		<div class="register-header">
			<h1>THERiGHTBET</h1>
			<p class="subtitle">Join the exclusive betting analytics platform</p>
		</div>

		{#if !inviteValid}
			<!-- Invite Code Step -->
			<div class="invite-step">
				<div class="step-indicator">
					<div class="step active">1</div>
					<div class="step-line"></div>
					<div class="step">2</div>
				</div>
				<h2>Enter Invite Code</h2>
				<p class="step-description">You need a valid invite code to join THERiGHTBET</p>

				<form onsubmit={validateInvite} class="invite-form">
					<div class="form-group">
						<label for="invite-code">Invite Code</label>
						<input
							id="invite-code"
							type="text"
							bind:value={inviteCode}
							onkeydown={handleKeydown}
							placeholder="Enter your invite code"
							required
							disabled={isLoading}
							class="invite-input"
						/>
					</div>

					{#if error}
						<div class="error-message">
							{error}
						</div>
					{/if}

					<button type="submit" class="validate-button" disabled={isLoading}>
						{#if isLoading}
							<span class="loading-spinner"></span>
							Validating...
						{:else}
							Validate Invite
						{/if}
					</button>
				</form>
			</div>
		{:else}
			<!-- Registration Step -->
			<div class="register-step">
				<div class="step-indicator">
					<div class="step completed">1</div>
					<div class="step-line completed"></div>
					<div class="step active">2</div>
				</div>
				<h2>Create Your Account</h2>
				<p class="step-description">Complete your registration for {inviteEmail}</p>

				<form onsubmit={handleRegister} class="register-form">
					<div class="form-row">
						<div class="form-group">
							<label for="first-name">First Name</label>
							<input
								id="first-name"
								type="text"
								bind:value={firstName}
								placeholder="First name"
								disabled={isLoading}
							/>
						</div>
						<div class="form-group">
							<label for="last-name">Last Name</label>
							<input
								id="last-name"
								type="text"
								bind:value={lastName}
								placeholder="Last name"
								disabled={isLoading}
							/>
						</div>
					</div>

					<div class="form-group">
						<label for="email">Email</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="Enter your email"
							required
							disabled={true}
							class="disabled-input"
						/>
						<small class="field-note">Email is locked to your invite</small>
					</div>

					<div class="form-group">
						<label for="password">Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							onkeydown={handleKeydown}
							placeholder="Create a strong password"
							required
							disabled={isLoading}
						/>
					</div>

					<div class="form-group">
						<label for="confirm-password">Confirm Password</label>
						<input
							id="confirm-password"
							type="password"
							bind:value={confirmPassword}
							onkeydown={handleKeydown}
							placeholder="Confirm your password"
							required
							disabled={isLoading}
						/>
					</div>

					{#if error}
						<div class="error-message">
							{error}
						</div>
					{/if}

					<button type="submit" class="register-button" disabled={isLoading}>
						{#if isLoading}
							<span class="loading-spinner"></span>
							Creating Account...
						{:else}
							Create Account
						{/if}
					</button>
				</form>

				<button class="back-button" onclick={() => { inviteValid = false; error = ''; }} disabled={isLoading}>
					← Back to Invite Code
				</button>
			</div>
		{/if}

		<div class="register-footer">
			<p class="invite-only">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.53L12 17.27l-5.18 2.46L8 14.14l-5-4.87 6.91-1.01L12 2z"/>
				</svg>
				Exclusive invite-only platform
			</p>
			<p class="already-have-account">
				Already have an account? <a href="/login">Sign in</a>
			</p>
		</div>
	</div>
</div>

<style>
	.register-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--color-primary) 0%, #16a34a 100%);
		padding: 1rem;
	}

	.register-card {
		background: white;
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-2xl);
		padding: 2rem;
		width: 100%;
		max-width: 500px;
	}

	.register-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.register-header h1 {
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

	.step-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.step {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
		background-color: #e5e7eb;
		color: #6b7280;
	}

	.step.active {
		background-color: var(--color-primary);
		color: white;
	}

	.step.completed {
		background-color: var(--color-accent);
		color: white;
	}

	.step-line {
		width: 60px;
		height: 2px;
		background-color: #e5e7eb;
		margin: 0 1rem;
	}

	.step-line.completed {
		background-color: var(--color-accent);
	}

	.invite-step h2,
	.register-step h2 {
		text-align: center;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
	}

	.step-description {
		text-align: center;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin: 0 0 2rem 0;
	}

	.invite-form,
	.register-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
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

	.disabled-input {
		background-color: #f1f5f9 !important;
		color: var(--color-text-secondary);
	}

	.field-note {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-top: 0.25rem;
	}

	.invite-input {
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-family: monospace;
		font-weight: 600;
	}

	.error-message {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 0.75rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		border: 1px solid #fecaca;
	}

	.validate-button,
	.register-button {
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

	.validate-button:hover:not(:disabled),
	.register-button:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.validate-button:disabled,
	.register-button:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
	}

	.back-button {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		margin-top: 1rem;
		text-align: center;
		transition: color 0.2s ease;
	}

	.back-button:hover:not(:disabled) {
		color: var(--color-text-primary);
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

	.register-footer {
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

	.already-have-account {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin: 0;
	}

	.already-have-account a {
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 500;
	}

	.already-have-account a:hover {
		text-decoration: underline;
	}

	@media (max-width: 480px) {
		.register-card {
			padding: 1.5rem;
		}

		.register-header h1 {
			font-size: 1.75rem;
		}

		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
