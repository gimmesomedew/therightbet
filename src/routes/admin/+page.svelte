<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';

	let invites = $state([]);
	let loading = $state(true);
	let error = $state('');
	let newInviteEmail = $state('');
	let creatingInvite = $state(false);

	// Redirect if not authenticated
	onMount(() => {
		authStore.subscribe(state => {
			if (!state.isAuthenticated) {
				goto('/login');
				return;
			}
			loadInvites();
		});
	});

	async function loadInvites() {
		try {
			const response = await fetch('/api/admin/invites', {
				headers: {
					'Authorization': `Bearer ${$authStore.token}`
				}
			});

			const data = await response.json();

			if (data.success) {
				invites = data.data;
			} else {
				error = data.message || 'Failed to load invites';
			}
		} catch (err) {
			error = 'Failed to load invites';
		} finally {
			loading = false;
		}
	}

	async function createInvite() {
		if (!newInviteEmail.trim()) {
			error = 'Please enter an email address';
			return;
		}

		creatingInvite = true;
		error = '';

		try {
			const response = await fetch('/api/admin/invites', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${$authStore.token}`
				},
				body: JSON.stringify({ email: newInviteEmail })
			});

			const data = await response.json();

			if (data.success) {
				newInviteEmail = '';
				await loadInvites();
			} else {
				error = data.message || 'Failed to create invite';
			}
		} catch (err) {
			error = 'Failed to create invite';
		} finally {
			creatingInvite = false;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusColor(used: boolean, expiresAt: string): string {
		if (used) return '#ef4444';
		if (new Date(expiresAt) < new Date()) return '#f59e0b';
		return 'var(--color-primary)';
	}

	function getStatusText(used: boolean, expiresAt: string): string {
		if (used) return 'Used';
		if (new Date(expiresAt) < new Date()) return 'Expired';
		return 'Active';
	}
</script>

<svelte:head>
	<title>Admin Panel - THERiGHTBET</title>
	<meta name="description" content="Admin panel for managing invites and users" />
</svelte:head>

<div class="admin-page">
	<div class="admin-header">
		<h1>Admin Panel</h1>
		<p>Manage invites and platform settings</p>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading admin data...</p>
		</div>
	{:else}
		<!-- Create New Invite -->
		<div class="create-invite-section">
			<h2>Create New Invite</h2>
			<div class="invite-form">
				<input
					type="email"
					bind:value={newInviteEmail}
					placeholder="Enter email address"
					disabled={creatingInvite}
				/>
				<button onclick={createInvite} disabled={creatingInvite || !newInviteEmail.trim()}>
					{#if creatingInvite}
						<span class="loading-spinner small"></span>
						Creating...
					{:else}
						Create Invite
					{/if}
				</button>
			</div>
		</div>

		{#if error}
			<div class="error-message">
				{error}
			</div>
		{/if}

		<!-- Invites List -->
		<div class="invites-section">
			<h2>Invite Management</h2>
			<div class="invites-table">
				<div class="table-header">
					<div class="col-email">Email</div>
					<div class="col-code">Invite Code</div>
					<div class="col-status">Status</div>
					<div class="col-created">Created</div>
					<div class="col-expires">Expires</div>
				</div>
				<div class="table-body">
					{#each invites as invite}
						<div class="table-row">
							<div class="col-email">{invite.email}</div>
							<div class="col-code">
								<code class="invite-code">{invite.invite_code}</code>
							</div>
							<div class="col-status">
								<span class="status-badge" style="color: {getStatusColor(invite.used, invite.expires_at)}">
									{getStatusText(invite.used, invite.expires_at)}
								</span>
							</div>
							<div class="col-created">{formatDate(invite.created_at)}</div>
							<div class="col-expires">{formatDate(invite.expires_at)}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.admin-page {
		padding: 1rem 1.5rem;
		background-color: #f8fafc;
		min-height: calc(100vh - 64px);
	}

	.admin-header {
		margin-bottom: 2rem;
	}

	.admin-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
	}

	.admin-header p {
		color: var(--color-text-secondary);
		margin: 0;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		text-align: center;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e5e7eb;
		border-top: 4px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.loading-spinner.small {
		width: 16px;
		height: 16px;
		border-width: 2px;
		margin-bottom: 0;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.create-invite-section,
	.invites-section {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.create-invite-section h2,
	.invites-section h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
	}

	.invite-form {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.invite-form input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 1rem;
	}

	.invite-form input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
	}

	.invite-form button {
		display: flex;
		align-items: center;
		padding: 0.75rem 1.5rem;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.invite-form button:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.invite-form button:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
	}

	.error-message {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 0.75rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		border: 1px solid #fecaca;
		margin-bottom: 1.5rem;
	}

	.invites-table {
		overflow-x: auto;
	}

	.table-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1.5fr 1.5fr;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 2px solid var(--color-border);
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 0.875rem;
	}

	.table-body {
		display: flex;
		flex-direction: column;
	}

	.table-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1.5fr 1.5fr;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--color-border);
		align-items: center;
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.col-email {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.invite-code {
		background: #f1f5f9;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-family: monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.status-badge {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.col-created,
	.col-expires {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	@media (max-width: 768px) {
		.admin-page {
			padding: 1rem;
		}

		.invite-form {
			flex-direction: column;
			align-items: stretch;
		}

		.table-header,
		.table-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.table-header {
			display: none;
		}

		.table-row {
			background: #f8fafc;
			border-radius: var(--radius-md);
			padding: 1rem;
			margin-bottom: 0.5rem;
		}

		.table-row > div {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.table-row > div::before {
			content: attr(data-label);
			font-weight: 600;
			color: var(--color-text-secondary);
			font-size: 0.75rem;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
	}
</style>
