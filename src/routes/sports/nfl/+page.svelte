<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import type { PageData } from './$types';

	type SeasonType = 'PRE' | 'REG' | 'POST';

	let { data }: { data: PageData } = $props();

	let selectedSeason = $state(data.selectedSeason);
	let selectedSeasonType = $state(data.selectedSeasonType);
	let selectedWeek = $state(data.selectedWeek);
	let touchdownData = $state(data.touchdowns);
	let firstTdScorers = $state<Array<{
		gameId: string;
		teamAbbreviation: string;
		playerName: string;
		position: string | null;
		touchdownType: string;
		quarter: number;
		clock: string;
		scoreAtTd: string;
	}>>([]);
	let loadingFirstTd = $state(false);

	const touchdownCategories = [
		{ key: 'rushing', label: 'Rush', className: 'rushing' },
		{ key: 'receiving', label: 'Rec', className: 'receiving' },
		{ key: 'passing', label: 'Pass', className: 'passing' },
		{ key: 'return', label: 'Return', className: 'return' },
		{ key: 'defensive', label: 'Def', className: 'defensive' }
	] as const;

	$effect(() => {
		selectedSeason = data.selectedSeason;
		selectedSeasonType = data.selectedSeasonType;
		selectedWeek = data.selectedWeek;
		touchdownData = data.touchdowns;
		loadFirstTouchdownScorers();
	});

	async function loadFirstTouchdownScorers() {
		loadingFirstTd = true;
		try {
			const response = await fetch(
				`/api/nfl/first-touchdown-scorers?season=${selectedSeason}&seasonType=${selectedSeasonType}&week=${selectedWeek}`
			);
			const result = await response.json();
			if (result.success) {
				firstTdScorers = result.data;
			}
		} catch (error) {
			console.error('Failed to load first touchdown scorers:', error);
		} finally {
			loadingFirstTd = false;
		}
	}

	function formatTouchdownType(type: string): string {
		const types: Record<string, string> = {
			rushing: 'Rushing',
			receiving: 'Receiving',
			passing: 'Passing',
			return: 'Return',
			defensive: 'Defensive',
			unknown: 'Unknown'
		};
		return types[type] || type;
	}

	function getSearchString(params: { season: number; seasonType: SeasonType; week: number }) {
		const search = new URLSearchParams();
		search.set('season', params.season.toString());
		search.set('seasonType', params.seasonType);
		search.set('week', params.week.toString());
		return search.toString();
	}

	function getMaxWeek(seasonType: SeasonType) {
		if (seasonType === 'PRE') return 3;
		if (seasonType === 'POST') return 5;
		return 18;
	}

	async function navigateWithFilters(partial: {
		season?: number;
		seasonType?: SeasonType;
		week?: number;
	}) {
		const season = partial.season ?? selectedSeason;
		const seasonType = partial.seasonType ?? selectedSeasonType;
		let week = partial.week ?? selectedWeek;

		const maxWeek = getMaxWeek(seasonType);
		if (week > maxWeek) {
			week = maxWeek;
		}

		const url = `/sports/nfl?${getSearchString({ season, seasonType, week })}`;
		await goto(url, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	function handleSeasonChange(event: Event) {
		const season = Number((event.currentTarget as HTMLSelectElement).value);
		if (!Number.isNaN(season)) {
			navigateWithFilters({ season });
		}
	}

	function handleSeasonTypeChange(event: Event) {
		const seasonType = ((event.currentTarget as HTMLSelectElement).value.toUpperCase() ||
			'REG') as SeasonType;
		navigateWithFilters({ seasonType });
	}

	function handleWeekChange(event: Event) {
		const week = Number((event.currentTarget as HTMLSelectElement).value);
		if (!Number.isNaN(week)) {
			navigateWithFilters({ week });
		}
	}

	function formatUpdatedAt(iso: string) {
		const date = new Date(iso);
		return date.toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}
</script>

<div class="nfl-page">
	<header class="page-header">
		<div>
			<h1>NFL Touchdown Tracker</h1>
			<p>Explore weekly touchdown leaders for every NFL team powered by Sportradar data.</p>
		</div>
		<div class="header-actions">
			<a href="/sports/nfl/probabilities" class="probabilities-link">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 20V10 M18 20V4 M6 20v-4" />
				</svg>
				View TD Probabilities
			</a>
			<a href="/sports/nfl/first-td-stats" class="probabilities-link">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 3h18v18H3z M8 8h8v8H8z" />
				</svg>
				First TD Stats
			</a>
			<a href="/sports/nfl/first-td-predictions" class="probabilities-link">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" />
				</svg>
				Week 11 Predictions
			</a>
		</div>
		<div class="meta">
			<span class="week-label">Week {selectedWeek}</span>
			<span class="season-label">
				{#if selectedSeasonType === 'PRE'}
					Preseason {selectedSeason}
				{:else if selectedSeasonType === 'POST'}
					Postseason {selectedSeason}
				{:else}
					Regular Season {selectedSeason}
				{/if}
			</span>
			<span class="updated-at">
				Last updated: {formatUpdatedAt(touchdownData.updatedAt)}
				{#if touchdownData.source === 'mock'}
					<span class="badge mock">Mock data (Sportradar unavailable)</span>
				{/if}
			</span>
		</div>
	</header>

	<section class="filters">
		<div class="filter">
			<label for="season">Season</label>
			<select id="season" value={selectedSeason} on:change={handleSeasonChange}>
				{#each data.seasonOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<div class="filter">
			<label for="season-type">Season Type</label>
			<select id="season-type" value={selectedSeasonType} on:change={handleSeasonTypeChange}>
				{#each data.seasonTypeOptions as option}
					<option value={option.value} selected={option.value === selectedSeasonType}>
						{option.label}
					</option>
				{/each}
			</select>
		</div>

		<div class="filter">
			<label for="week">Week</label>
			<select id="week" value={selectedWeek} on:change={handleWeekChange}>
				{#each data.weekOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</section>

	{#if $navigating}
		<div class="loading-state">
			<div class="spinner" aria-hidden="true"></div>
			<span>Loading latest touchdown data…</span>
		</div>
	{/if}

	<section class="teams-section" aria-live="polite">
		{#if touchdownData.teams.length === 0}
			<div class="empty-state">
				{#if touchdownData.source === 'sportradar'}
					<h2>No games this week</h2>
					<p>No NFL games were scheduled for Week {selectedWeek} in {selectedSeason}. Try a different week.</p>
				{:else}
					<h2>No touchdowns recorded</h2>
					<p>Games were played, but touchdown data is not available. Check back later.</p>
				{/if}
			</div>
		{:else}
			<div class="teams-grid">
				{#each touchdownData.teams as team}
					<article class="team-card">
						<header class="team-card-header">
							<div>
								<h3>{team.team.displayName}</h3>
								<p class="team-subtitle">
									<span>{team.team.abbreviation}</span>
									{#if team.team.mascot}
										<span aria-hidden="true">•</span>
										<span>{team.team.mascot}</span>
									{/if}
								</p>
							</div>
							<div class="touchdown-tally">
								<strong>{team.totalTouchdowns}</strong>
								<span>Touchdowns</span>
							</div>
						</header>

						<ul class="player-list">
							{#each team.players as player}
								<li class="player-row">
									<div class="player-meta">
										<span class="player-name">{player.playerName}</span>
										{#if player.position}
											<span class="player-position">{player.position}</span>
										{/if}
									</div>

									<div class="player-totals">
										{#each touchdownCategories as category}
											{#if player[category.key] > 0}
												<span class="badge {category.className}">
													{player[category.key]} {category.label}
												</span>
											{/if}
										{/each}
										<span class="badge total">{player.total} TD</span>
									</div>
								</li>
							{/each}
						</ul>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	{#if touchdownData.teams.length > 0}
		<section class="first-td-section" aria-live="polite">
			<h2>First Touchdown Scorers</h2>
			{#if loadingFirstTd}
				<div class="loading-state">
					<div class="spinner" aria-hidden="true"></div>
					<span>Loading first touchdown scorers…</span>
				</div>
			{:else if firstTdScorers.length === 0}
				<div class="empty-state">
					<p>No first touchdown scorer data available for this week.</p>
				</div>
			{:else}
				<div class="first-td-grid">
					{#each firstTdScorers as scorer}
						<article class="first-td-card">
							<div class="first-td-header">
								<div class="team-badge">{scorer.teamAbbreviation}</div>
								<div class="td-type-badge">{formatTouchdownType(scorer.touchdownType)}</div>
							</div>
							<div class="first-td-content">
								<h3>{scorer.playerName}</h3>
								{#if scorer.position}
									<p class="player-position">{scorer.position}</p>
								{/if}
								<div class="td-details">
									<span class="time-badge">Q{scorer.quarter} {scorer.clock}</span>
									<span class="score-badge">{scorer.scoreAtTd}</span>
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.nfl-page {
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

	.page-header > div:first-child {
		flex: 1;
	}

	.header-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--spacing-sm);
	}

	.probabilities-link {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-primary, #3b82f6);
		color: white;
		text-decoration: none;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.probabilities-link:hover {
		background: var(--color-primary-dark, #2563eb);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.probabilities-link svg {
		flex-shrink: 0;
	}

	.page-header h1 {
		margin: 0;
		font-size: 2rem;
		color: var(--color-text-primary);
	}

	.page-header p {
		margin: 0;
		color: var(--color-text-secondary);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-md);
		align-items: center;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.week-label {
		color: var(--color-primary);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.updated-at {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-lg);
		background: white;
		padding: var(--spacing-lg);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.filter {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	select {
		padding: 0.75rem 1rem;
		border: 1px solid #e2e8f0;
		border-radius: var(--radius-md);
		font-size: 1rem;
		color: var(--color-text-primary);
		background: white;
		cursor: pointer;
	}

	select:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.loading-state {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		background: white;
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.spinner {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid #e2e8f0;
		border-top-color: var(--color-primary);
		animation: spin 0.8s linear infinite;
	}

	.teams-section {
		background: white;
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.teams-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--spacing-lg);
	}

	.team-card {
		border: 1px solid #e2e8f0;
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: #f8fafc;
	}

	.team-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-lg);
		background: white;
		border-bottom: 1px solid #e2e8f0;
	}

	.team-card-header h3 {
		margin: 0;
		font-size: 1.125rem;
		color: var(--color-text-primary);
	}

	.team-subtitle {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.touchdown-tally {
		text-align: right;
	}

	.touchdown-tally strong {
		display: block;
		font-size: 1.75rem;
		color: var(--color-primary);
	}

	.touchdown-tally span {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.player-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.player-row {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md) var(--spacing-lg);
		border-top: 1px solid #e2e8f0;
	}

	.player-meta {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.player-name {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.player-position {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.player-totals {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 600;
		background: #e2e8f0;
		color: var(--color-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge.total {
		background: var(--color-primary);
		color: white;
	}

	.badge.rushing {
		background: rgba(34, 197, 94, 0.15);
		color: #15803d;
	}

	.badge.receiving {
		background: rgba(59, 130, 246, 0.15);
		color: #1d4ed8;
	}

	.badge.passing {
		background: rgba(249, 115, 22, 0.15);
		color: #c2410c;
	}

	.badge.return {
		background: rgba(6, 182, 212, 0.15);
		color: #0f766e;
	}

	.badge.defensive {
		background: rgba(139, 92, 246, 0.15);
		color: #5b21b6;
	}

	.badge.mock {
		background: #fee2e2;
		color: #b91c1c;
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-2xl);
		color: var(--color-text-secondary);
	}

	.empty-state h2 {
		margin: 0 0 var(--spacing-sm);
		color: var(--color-text-primary);
	}

	.first-td-section {
		background: white;
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.first-td-section h2 {
		margin: 0 0 var(--spacing-lg);
		color: var(--color-text-primary);
		font-size: 1.5rem;
	}

	.first-td-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: var(--spacing-md);
	}

	.first-td-card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		background: var(--color-background);
		transition: box-shadow 0.2s;
	}

	.first-td-card:hover {
		box-shadow: var(--shadow-md);
	}

	.first-td-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-sm);
	}

	.team-badge {
		background: var(--color-primary);
		color: white;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: 0.875rem;
	}

	.td-type-badge {
		background: var(--color-secondary);
		color: white;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		text-transform: capitalize;
	}

	.first-td-content h3 {
		margin: 0 0 var(--spacing-xs);
		color: var(--color-text-primary);
		font-size: 1.125rem;
	}

	.first-td-content .player-position {
		margin: 0 0 var(--spacing-sm);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.td-details {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: wrap;
		margin-top: var(--spacing-sm);
	}

	.time-badge,
	.score-badge {
		background: var(--color-background-secondary);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.nfl-page {
			padding: var(--spacing-lg);
		}

		.page-header {
			padding: var(--spacing-lg);
		}

		.filters,
		.teams-section {
			padding: var(--spacing-lg);
		}

		.team-card-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-md);
		}
	}
</style>

