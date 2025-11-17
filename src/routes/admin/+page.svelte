<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';

	let invites = $state([]);
	let users = $state([]);
	let loading = $state(true);
	let error = $state('');
	let newInviteEmail = $state('');
	let creatingInvite = $state(false);
	let convertingInvite = $state<string | null>(null);
	let convertedUser = $state<{ email: string; password: string } | null>(null);
	let showPasswordModal = $state(false);

	// Redirect if not authenticated
	onMount(() => {
		authStore.subscribe(state => {
			if (!state.isAuthenticated) {
				goto('/login');
				return;
			}
			loadData();
		});
	});

	async function loadData() {
		loading = true;
		await Promise.all([loadInvites(), loadUsers()]);
		loading = false;
	}

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
		}
	}

	async function loadUsers() {
		try {
			const response = await fetch('/api/admin/users', {
				headers: {
					'Authorization': `Bearer ${$authStore.token}`
				}
			});

			const data = await response.json();

			if (data.success) {
				users = data.data;
			} else {
				error = data.message || 'Failed to load users';
			}
		} catch (err) {
			error = 'Failed to load users';
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
				await loadUsers();
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

	function canConvertInvite(invite: any): boolean {
		return !invite.used && new Date(invite.expires_at) >= new Date();
	}

	async function convertInviteToUser(inviteCode: string) {
		convertingInvite = inviteCode;
		error = '';

		try {
			const response = await fetch('/api/admin/invites', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${$authStore.token}`
				},
				body: JSON.stringify({ invite_code: inviteCode })
			});

			const data = await response.json();

			if (data.success) {
				convertedUser = {
					email: data.user.email,
					password: data.temporaryPassword
				};
				showPasswordModal = true;
				await loadData();
			} else {
				error = data.message || 'Failed to convert invite';
			}
		} catch (err) {
			error = 'Failed to convert invite';
		} finally {
			convertingInvite = null;
		}
	}

	function closePasswordModal() {
		showPasswordModal = false;
		convertedUser = null;
	}

	function copyEmail() {
		if (convertedUser) {
			navigator.clipboard.writeText(convertedUser.email);
		}
	}

	function copyPassword() {
		if (convertedUser) {
			navigator.clipboard.writeText(convertedUser.password);
		}
	}
</script>

<svelte:head>
	<title>Admin Panel - THERiGHTBET</title>
	<meta name="description" content="Admin panel for managing invites and users" />
</svelte:head>

<div class="admin-page">
	<div class="admin-header">
		<h1>Admin Panel</h1>
		<p>Manage users, invites, and platform settings</p>
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

		<!-- Users List -->
		<div class="users-section">
			<h2>Users ({users.length})</h2>
			<div class="users-table">
				<div class="table-header users-header">
					<div class="col-email">Email</div>
					<div class="col-name">Name</div>
					<div class="col-tier">Tier</div>
					<div class="col-created">Created</div>
				</div>
				<div class="table-body">
					{#each users as user}
						<div class="table-row">
							<div class="col-email">{user.email}</div>
							<div class="col-name">
								{#if user.first_name || user.last_name}
									{user.first_name || ''} {user.last_name || ''}
								{:else}
									<span class="no-data">—</span>
								{/if}
							</div>
							<div class="col-tier">
								<span class="tier-badge tier-{user.subscription_tier}">
									{user.subscription_tier}
								</span>
							</div>
							<div class="col-created">{formatDate(user.created_at)}</div>
						</div>
					{/each}
					{#if users.length === 0}
						<div class="empty-state">
							<p>No users found</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Invites List -->
		<div class="invites-section">
			<h2>Invite Management ({invites.length})</h2>
			<div class="invites-table">
				<div class="table-header invites-header">
					<div class="col-email">Email</div>
					<div class="col-code">Invite Code</div>
					<div class="col-status">Status</div>
					<div class="col-created">Created</div>
					<div class="col-expires">Expires</div>
					<div class="col-action">Action</div>
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
							<div class="col-action">
								{#if canConvertInvite(invite)}
									<button
										class="convert-btn"
										onclick={() => convertInviteToUser(invite.invite_code)}
										disabled={convertingInvite === invite.invite_code}
									>
										{#if convertingInvite === invite.invite_code}
											<span class="loading-spinner small"></span>
											Converting...
										{:else}
											Convert to User
										{/if}
									</button>
								{:else}
									<span class="no-action">—</span>
								{/if}
							</div>
						</div>
					{/each}
					{#if invites.length === 0}
						<div class="empty-state">
							<p>No invites found</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Password Modal -->
	{#if showPasswordModal && convertedUser}
		<div class="modal-overlay" onclick={closePasswordModal}>
			<div class="modal-content" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>User Created Successfully</h3>
					<button class="modal-close" onclick={closePasswordModal}>×</button>
				</div>
				<div class="modal-body">
					<p class="success-message">
						The invite has been converted to an active user account.
					</p>
					<div class="password-section">
						<label>Email:</label>
						<div class="password-display">
							<code>{convertedUser.email}</code>
							<button class="copy-btn" onclick={copyEmail}>Copy</button>
						</div>
					</div>
					<div class="password-section">
						<label>Temporary Password:</label>
						<div class="password-display">
							<code>{convertedUser.password}</code>
							<button class="copy-btn" onclick={copyPassword}>Copy</button>
						</div>
					</div>
					<p class="password-warning">
						⚠️ Please save this password securely. The user will need it to log in.
					</p>
				</div>
				<div class="modal-footer">
					<button class="modal-btn" onclick={closePasswordModal}>Close</button>
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
	.users-section,
	.invites-section {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.create-invite-section h2,
	.users-section h2,
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

	.users-table,
	.invites-table {
		overflow-x: auto;
	}

	.users-header {
		display: grid;
		grid-template-columns: 2fr 1.5fr 1fr 1.5fr;
		gap: 1rem;
	}

	.invites-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1.5fr 1.5fr 1.5fr;
		gap: 1rem;
	}

	.table-header {
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

	.users-table .table-row {
		display: grid;
		grid-template-columns: 2fr 1.5fr 1fr 1.5fr;
		gap: 1rem;
	}

	.invites-table .table-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1.5fr 1.5fr 1.5fr;
		gap: 1rem;
	}

	.table-row {
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

	.col-name {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.no-data {
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.tier-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.tier-free {
		background-color: #e5e7eb;
		color: #374151;
	}

	.tier-premium {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.col-created,
	.col-expires {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
		color: var(--color-text-secondary);
	}

	.empty-state p {
		margin: 0;
		font-style: italic;
	}

	.col-action {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.convert-btn {
		padding: 0.5rem 1rem;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		white-space: nowrap;
	}

	.convert-btn:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.convert-btn:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
	}

	.no-action {
		color: var(--color-text-secondary);
		font-style: italic;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s ease;
	}

	.modal-close:hover {
		background-color: #f3f4f6;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.success-message {
		color: var(--color-primary);
		font-weight: 500;
		margin-bottom: 1.5rem;
	}

	.password-section {
		margin-bottom: 1.5rem;
	}

	.password-section label {
		display: block;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.password-display {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.password-display code {
		flex: 1;
		background: #f1f5f9;
		padding: 0.75rem;
		border-radius: var(--radius-md);
		font-family: monospace;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
		word-break: break-all;
	}

	.copy-btn {
		padding: 0.75rem 1rem;
		background-color: #f3f4f6;
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
		white-space: nowrap;
	}

	.copy-btn:hover {
		background-color: #e5e7eb;
	}

	.password-warning {
		background-color: #fef3c7;
		border: 1px solid #fbbf24;
		border-radius: var(--radius-md);
		padding: 0.75rem;
		color: #92400e;
		font-size: 0.875rem;
		margin-top: 1rem;
		margin-bottom: 0;
	}

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid var(--color-border);
		display: flex;
		justify-content: flex-end;
	}

	.modal-btn {
		padding: 0.75rem 1.5rem;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.modal-btn:hover {
		background-color: #16a34a;
	}

	@media (max-width: 768px) {
		.admin-page {
			padding: 1rem;
		}

		.invite-form {
			flex-direction: column;
			align-items: stretch;
		}

		.users-header,
		.invites-header {
			display: none;
		}

		.users-table .table-row,
		.invites-table .table-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.col-action {
			justify-content: flex-start;
		}

		.convert-btn {
			width: 100%;
			justify-content: center;
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
