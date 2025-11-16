<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let teamStats = $state<Array<{
		teamAbbreviation: string;
		teamDisplayName: string;
		totalGames: number;
		topScorers: Array<{
			playerName: string;
			playerId: string;
			position: string | null;
			touchdownType: string;
			count: number;
			percentage: number;
		}>;
	}>>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const response = await fetch(
				`/api/nfl/first-td-team-stats?season=${data.season}&seasonType=${data.seasonType}`
			);
			const result = await response.json();

			if (result.success) {
				teamStats = result.data;
			} else {
				error = result.error || 'Failed to load team statistics';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	});

	function formatTouchdownType(type: string): string {
		const types: Record<string, string> = {
			rushing: 'Rush',
			receiving: 'Rec',
			passing: 'Pass',
			return: 'Ret',
			defensive: 'Def',
			unknown: '—'
		};
		return types[type] || type;
	}

	function formatPercentage(value: number): string {
		return `${value.toFixed(1)}%`;
	}
</script>

<div class="first-td-stats-page">
	<header class="page-header">
		<div>
			<h1>First Touchdown Scorer Statistics</h1>
			<p>
				Historical data showing which players typically score the first touchdown for each team.
				Current week: <strong>Week {data.currentWeek}</strong>
			</p>
		</div>
		<div class="meta">
			<span class="season-label">
				{#if data.seasonType === 'PRE'}
					Preseason {data.season}
				{:else if data.seasonType === 'POST'}
					Postseason {data.season}
				{:else}
					Regular Season {data.season}
				{/if}
			</span>
		</div>
	</header>

	{#if loading}
		<div class="loading-state">
			<div class="spinner" aria-hidden="true"></div>
			<span>Loading team statistics…</span>
		</div>
	{:else if error}
		<div class="error-state">
			<h2>Error</h2>
			<p>{error}</p>
		</div>
	{:else if teamStats.length === 0}
		<div class="empty-state">
			<h2>No data available</h2>
			<p>No first touchdown scorer statistics found for this season.</p>
		</div>
	{:else}
		<div class="table-container">
			<table class="stats-table">
				<thead>
					<tr>
						<th>Team</th>
						<th>Games</th>
						<th>Top Scorer</th>
						<th>Position</th>
						<th>Type</th>
						<th>Count</th>
						<th>%</th>
						<th>Other Scorers</th>
					</tr>
				</thead>
				<tbody>
					{#each teamStats as team}
						<tr>
							<td class="team-cell">
								<strong>{team.teamDisplayName}</strong>
								<span class="team-abbr">({team.teamAbbreviation})</span>
							</td>
							<td class="number">{team.totalGames}</td>
							{#if team.topScorers.length > 0}
								<td class="player-name">{team.topScorers[0].playerName}</td>
								<td class="position">{team.topScorers[0].position || '—'}</td>
								<td class="td-type">
									<span class="type-badge">{formatTouchdownType(team.topScorers[0].touchdownType)}</span>
								</td>
								<td class="number">{team.topScorers[0].count}</td>
								<td class="percentage">
									<span class="percentage-value">{formatPercentage(team.topScorers[0].percentage)}</span>
									<div class="percentage-bar">
										<div
											class="percentage-fill"
											style="width: {team.topScorers[0].percentage}%"
										></div>
									</div>
								</td>
								<td class="other-scorers">
									{#if team.topScorers.length > 1}
										<div class="other-scorers-list">
											{#each team.topScorers.slice(1) as scorer}
												<span class="other-scorer">
													{scorer.playerName} ({scorer.count})
												</span>
											{/each}
										</div>
									{:else}
										<span class="no-others">—</span>
									{/if}
								</td>
							{:else}
								<td colspan="6" class="no-data">No first TD scorers recorded</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.first-td-stats-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
		padding: var(--spacing-xl);
		background: #f1f5f9;
		min-height: calc(100vh - 64px);
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		background: white;
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.page-header h1 {
		margin: 0 0 var(--spacing-xs);
		color: var(--color-text-primary);
		font-size: 2rem;
	}

	.page-header p {
		margin: 0;
		color: var(--color-text-secondary);
	}

	.meta {
		display: flex;
		gap: var(--spacing-md);
		margin-top: var(--spacing-sm);
	}

	.season-label {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.loading-state,
	.error-state,
	.empty-state {
		background: white;
		padding: var(--spacing-2xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		text-align: center;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-md);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.table-container {
		background: white;
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow-x: auto;
	}

	.stats-table {
		width: 100%;
		border-collapse: collapse;
	}

	.stats-table thead {
		background: var(--color-background-secondary);
		border-bottom: 2px solid var(--color-border);
	}

	.stats-table th {
		padding: var(--spacing-md);
		text-align: left;
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stats-table td {
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
	}

	.stats-table tbody tr:hover {
		background: var(--color-background-secondary);
	}

	.team-cell {
		font-weight: 500;
	}

	.team-abbr {
		color: var(--color-text-secondary);
		font-weight: normal;
		margin-left: var(--spacing-xs);
	}

	.player-name {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.position {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.number {
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.percentage {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		min-width: 120px;
	}

	.percentage-value {
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		min-width: 45px;
	}

	.percentage-bar {
		flex: 1;
		height: 8px;
		background: var(--color-background-secondary);
		border-radius: 4px;
		overflow: hidden;
	}

	.percentage-fill {
		height: 100%;
		background: var(--color-primary);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.type-badge {
		display: inline-block;
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-secondary);
		color: white;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.other-scorers {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.other-scorers-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.other-scorer {
		display: block;
	}

	.no-others,
	.no-data {
		color: var(--color-text-secondary);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.first-td-stats-page {
			padding: var(--spacing-md);
		}

		.table-container {
			padding: var(--spacing-md);
		}

		.stats-table {
			font-size: 0.875rem;
		}

		.stats-table th,
		.stats-table td {
			padding: var(--spacing-sm);
		}

		.other-scorers-list {
			font-size: 0.75rem;
		}
	}
</style>


