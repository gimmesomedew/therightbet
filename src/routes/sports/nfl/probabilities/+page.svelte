<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let allProbabilities = $state<Array<{
		playerId: string;
		playerName: string;
		position: string | null;
		team: string;
		totalTouchdowns: number;
		gamesPlayed: number;
		weeksWithTouchdown: number;
		touchdownProbability: number;
	}>>([]);
	let selectedPosition = $state('all');
	let selectedTeam = $state('all');
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Compute unique positions and teams
	let positions = $derived(
		Array.from(new Set(allProbabilities.map((p) => p.position).filter(Boolean))).sort()
	);
	let teams = $derived(
		Array.from(new Set(allProbabilities.map((p) => p.team))).sort()
	);

	// Filter probabilities based on selected filters
	let probabilities = $derived(
		allProbabilities.filter((player) => {
			const positionMatch = selectedPosition === 'all' || player.position === selectedPosition;
			const teamMatch = selectedTeam === 'all' || player.team === selectedTeam;
			return positionMatch && teamMatch;
		})
	);

	onMount(async () => {
		try {
			const response = await fetch(
				`/api/nfl/touchdown-probabilities?season=${data.season}&seasonType=${data.seasonType}`
			);
			const result = await response.json();

			if (result.success) {
				allProbabilities = result.data;
			} else {
				error = result.error || 'Failed to load probabilities';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	});

	function formatPercentage(value: number): string {
		return `${value.toFixed(1)}%`;
	}
</script>

<div class="probabilities-page">
	<header class="page-header">
		<div>
			<h1>NFL Touchdown Probability</h1>
			<p>
				Based on historical data from {data.season} {data.seasonType === 'REG' ? 'Regular Season' : data.seasonType === 'PRE' ? 'Preseason' : 'Postseason'},
				this table shows the probability that players who have scored touchdowns will score in their next game.
			</p>
		</div>
	</header>

	{#if loading}
		<div class="loading-state">
			<p>Loading touchdown probabilities...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>Error: {error}</p>
		</div>
	{:else if allProbabilities.length === 0}
		<div class="empty-state">
			<h2>No data available</h2>
			<p>No touchdown probability data found for {data.season} {data.seasonType}.</p>
		</div>
	{:else}
		<section class="filters-section">
			<div class="filters">
				<div class="filter">
					<label for="position-filter">Position</label>
					<select id="position-filter" bind:value={selectedPosition}>
						<option value="all">All Positions</option>
						{#each positions as position}
							<option value={position}>{position}</option>
						{/each}
					</select>
				</div>

				<div class="filter">
					<label for="team-filter">Team</label>
					<select id="team-filter" bind:value={selectedTeam}>
						<option value="all">All Teams</option>
						{#each teams as team}
							<option value={team}>{team}</option>
						{/each}
					</select>
				</div>

				<div class="filter-info">
					<span class="results-count">
						Showing {probabilities.length} of {allProbabilities.length} players
					</span>
				</div>
			</div>
		</section>

		{#if probabilities.length === 0}
			<div class="empty-state">
				<h2>No players match filters</h2>
				<p>Try adjusting your position or team filter.</p>
			</div>
		{:else}
			<div class="table-container">
			<table class="probabilities-table">
				<thead>
					<tr>
						<th>Player</th>
						<th>Position</th>
						<th>Team</th>
						<th>Total TDs</th>
						<th>Games Played</th>
						<th>Weeks w/ TD</th>
						<th class="probability-column">TD Probability</th>
					</tr>
				</thead>
				<tbody>
					{#each probabilities as player}
						<tr>
							<td class="player-name">{player.playerName}</td>
							<td class="position">{player.position || '—'}</td>
							<td class="team">{player.team}</td>
							<td class="number">{player.totalTouchdowns}</td>
							<td class="number">{player.gamesPlayed}</td>
							<td class="number">{player.weeksWithTouchdown}</td>
							<td class="probability">
								<div class="probability-bar-container">
									<span class="probability-value">{formatPercentage(player.touchdownProbability)}</span>
									<div class="probability-bar">
										<div
											class="probability-fill"
											style="width: {player.touchdownProbability}%"
										></div>
									</div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{/if}
	{/if}
</div>

<style>
	.probabilities-page {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.page-header p {
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.filters-section {
		margin-bottom: 1.5rem;
	}

	.filters {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		flex-wrap: wrap;
		background: var(--surface, #ffffff);
		padding: 1.5rem;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.filter {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 180px;
	}

	.filter label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.filter select {
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border-color, #e5e5e5);
		border-radius: 6px;
		font-size: 0.9375rem;
		background: white;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.filter select:hover {
		border-color: var(--color-primary, #3b82f6);
	}

	.filter select:focus {
		outline: none;
		border-color: var(--color-primary, #3b82f6);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.filter-info {
		margin-left: auto;
		display: flex;
		align-items: center;
	}

	.results-count {
		font-size: 0.875rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.loading-state,
	.error-state,
	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--text-secondary);
	}

	.error-state {
		color: var(--error-color, #dc2626);
	}

	.table-container {
		background: var(--surface, #ffffff);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.probabilities-table {
		width: 100%;
		border-collapse: collapse;
	}

	.probabilities-table thead {
		background: var(--surface-variant, #f5f5f5);
		border-bottom: 2px solid var(--border-color, #e5e5e5);
	}

	.probabilities-table th {
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.probabilities-table th.probability-column {
		text-align: right;
	}

	.probabilities-table tbody tr {
		border-bottom: 1px solid var(--border-color, #e5e5e5);
		transition: background-color 0.2s;
	}

	.probabilities-table tbody tr:hover {
		background: var(--surface-variant, #f9f9f9);
	}

	.probabilities-table td {
		padding: 1rem;
		font-size: 0.9375rem;
	}

	.probabilities-table .player-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.probabilities-table .position {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.probabilities-table .team {
		font-weight: 500;
		color: var(--text-primary);
	}

	.probabilities-table .number {
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.probabilities-table .probability {
		text-align: right;
		min-width: 200px;
	}

	.probability-bar-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.probability-value {
		min-width: 60px;
		text-align: right;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
	}

	.probability-bar {
		flex: 1;
		height: 8px;
		background: var(--surface-variant, #e5e5e5);
		border-radius: 4px;
		overflow: hidden;
		max-width: 150px;
	}

	.probability-fill {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	@media (max-width: 768px) {
		.probabilities-page {
			padding: 1rem;
		}

		.table-container {
			overflow-x: auto;
		}

		.probabilities-table {
			min-width: 700px;
		}

		.probability-bar-container {
			flex-direction: column;
			align-items: flex-end;
			gap: 0.5rem;
		}

		.probability-bar {
			max-width: 100%;
		}
	}
</style>

