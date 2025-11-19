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
	let weekMatchups = $state<Array<{
		id: string;
		gameDate: string;
		status: string;
		homeTeam: { name: string; abbreviation: string; city: string; score: number };
		awayTeam: { name: string; abbreviation: string; city: string; score: number };
		bettingLines: {
			spread: { line: number | null; homeOdds: string | null; awayOdds: string | null };
			total: { line: number | null; overOdds: string | null; underOdds: string | null };
			moneyline: { home: string | null; away: string | null };
		};
	}>>([]);
	let loadingMatchups = $state(false);
	let activeTab = $state<'matchups' | 'touchdowns'>('matchups');
	let currentWeek = $state<number | null>(null);
	let showFavoritesOnly = $state(false);
	let favoriteGameIds = $state<Set<string>>(new Set());
	let togglingFavorite = $state<string | null>(null);

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
		// Set current week from server data (assumes server determined current week)
		if (!currentWeek) {
			currentWeek = selectedWeek;
		}
		loadFirstTouchdownScorers();
		loadWeekMatchups();
		loadFavorites();
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

	async function loadWeekMatchups() {
		loadingMatchups = true;
		try {
			const response = await fetch(
				`/api/nfl/matchups?season=${selectedSeason}&seasonType=${selectedSeasonType}&week=${selectedWeek}`
			);
			const result = await response.json();
			if (result.success) {
				weekMatchups = result.data;
			}
		} catch (error) {
			console.error('Failed to load matchups:', error);
		} finally {
			loadingMatchups = false;
		}
	}

	function formatSpreadLine(line: number | null): string {
		if (line === null) return '—';
		return line > 0 ? `+${line}` : `${line}`;
	}

	function calculateBreakevenPercentage(odds: string | null): number | null {
		if (!odds) return null;
		
		// Parse American odds (e.g., "+150", "-150", "150", "-110")
		const oddsNum = parseInt(odds);
		if (isNaN(oddsNum)) return null;
		
		if (oddsNum > 0) {
			// Positive odds: breakeven % = 100 / (odds + 100)
			return 100 / (oddsNum + 100);
		} else {
			// Negative odds: breakeven % = |odds| / (|odds| + 100)
			return Math.abs(oddsNum) / (Math.abs(oddsNum) + 100);
		}
	}

	function formatBreakevenPercentage(odds: string | null): string {
		const percentage = calculateBreakevenPercentage(odds);
		if (percentage === null) return '';
		return `${(percentage * 100).toFixed(1)}%`;
	}

	function formatGameTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
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
			// Reload matchups for the new week
			if (activeTab === 'matchups') {
				loadWeekMatchups();
			}
		}
	}

	function formatUpdatedAt(iso: string) {
		const date = new Date(iso);
		return date.toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	async function loadFavorites() {
		try {
			const response = await fetch('/api/favorites/games');
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					favoriteGameIds = new Set(result.data || []);
				}
			}
		} catch (error) {
			console.error('Failed to load favorites:', error);
		}
	}

	async function toggleFavorite(gameId: string) {
		if (togglingFavorite === gameId) return;
		
		togglingFavorite = gameId;
		const isFavorite = favoriteGameIds.has(gameId);
		
		try {
			const method = isFavorite ? 'DELETE' : 'POST';
			const response = await fetch('/api/favorites/games', {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ gameId })
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					if (isFavorite) {
						favoriteGameIds.delete(gameId);
					} else {
						favoriteGameIds.add(gameId);
					}
					// Create new Set to trigger reactivity
					favoriteGameIds = new Set(favoriteGameIds);
				}
			}
		} catch (error) {
			console.error('Failed to toggle favorite:', error);
		} finally {
			togglingFavorite = null;
		}
	}

	function isFavorite(gameId: string): boolean {
		return favoriteGameIds.has(gameId);
	}

	const filteredMatchups = $derived.by(() => {
		if (showFavoritesOnly) {
			return weekMatchups.filter(game => favoriteGameIds.has(game.id));
		}
		return weekMatchups;
	});
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
			<span class="week-label">
				Week {selectedWeek}
				{#if activeTab === 'matchups' && currentWeek && selectedWeek === currentWeek}
					<span class="current-week-badge">Current Week</span>
				{/if}
			</span>
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
			<select id="season" value={selectedSeason} onchange={handleSeasonChange}>
				{#each data.seasonOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<div class="filter">
			<label for="season-type">Season Type</label>
			<select id="season-type" value={selectedSeasonType} onchange={handleSeasonTypeChange}>
				{#each data.seasonTypeOptions as option}
					<option value={option.value} selected={option.value === selectedSeasonType}>
						{option.label}
					</option>
				{/each}
			</select>
		</div>

		<div class="filter">
			<label for="week">Week</label>
			<select id="week" value={selectedWeek} onchange={handleWeekChange}>
				{#each data.weekOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</section>

	{#if $navigating}
		<div class="loading-state">
			<div class="spinner" aria-hidden="true"></div>
			<span>Loading latest data…</span>
		</div>
	{/if}

	<!-- Tabs -->
	<div class="tabs-container">
		<button
			class="tab-button"
			class:active={activeTab === 'matchups'}
			onclick={() => activeTab = 'matchups'}
		>
			Matchups & Spreads
		</button>
		<button
			class="tab-button"
			class:active={activeTab === 'touchdowns'}
			onclick={() => activeTab = 'touchdowns'}
		>
			Touchdown Data
		</button>
	</div>

	<!-- Matchups Tab -->
	{#if activeTab === 'matchups'}
		<section class="matchups-section" aria-live="polite">
			<div class="matchups-header">
				<h2>Week {selectedWeek} Matchups & Spreads</h2>
				<button
					type="button"
					onclick={() => showFavoritesOnly = !showFavoritesOnly}
					class="favorites-toggle"
					class:active={showFavoritesOnly}
					aria-label="Show favorites only"
					title="Show favorite games only"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"></path>
					</svg>
					<span>Favorites</span>
				</button>
			</div>
			{#if showFavoritesOnly && favoriteGameIds.size === 0}
				<div class="empty-state">
					<p>No favorite games yet. Click the heart icon on any game to add it to your favorites.</p>
				</div>
			{:else if loadingMatchups}
				<div class="loading-state">
					<div class="spinner" aria-hidden="true"></div>
					<span>Loading matchups…</span>
				</div>
			{:else if weekMatchups.length === 0}
				<div class="empty-state">
					<p>No matchups found for Week {selectedWeek}. Run the sync script to load games.</p>
				</div>
			{:else if filteredMatchups.length === 0}
				<div class="empty-state">
					<p>No favorite games match your current filters.</p>
				</div>
			{:else}
				{#if showFavoritesOnly}
					<div class="favorites-info">
						Showing {filteredMatchups.length} of {weekMatchups.length} games ({favoriteGameIds.size} favorited)
					</div>
				{/if}
				<div class="matchups-grid">
					{#each filteredMatchups as game}
						<article class="matchup-card" class:favorited={isFavorite(game.id)}>
							<div class="matchup-header">
								<div class="game-time">{formatGameTime(game.gameDate)}</div>
								<div class="header-right">
									<button
										type="button"
										onclick={() => toggleFavorite(game.id)}
										class="favorite-btn"
										class:active={isFavorite(game.id)}
										disabled={togglingFavorite === game.id}
										aria-label={isFavorite(game.id) ? "Remove from favorites" : "Add to favorites"}
										title={isFavorite(game.id) ? "Remove from favorites" : "Add to favorites"}
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isFavorite(game.id) ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"></path>
										</svg>
									</button>
									<div class="game-status status-{game.status.toLowerCase()}">{game.status}</div>
								</div>
							</div>
							<div class="matchup-teams">
								<div class="team-row away-team">
									<div class="team-info">
										<span class="team-name">{game.awayTeam.city} {game.awayTeam.name}</span>
										<span class="team-abbr">{game.awayTeam.abbreviation}</span>
									</div>
									{#if game.status === 'final' || game.status === 'live'}
										<div class="team-score">{game.awayScore ?? 0}</div>
									{/if}
								</div>
								<div class="team-row home-team">
									<div class="team-info">
										<span class="team-name">{game.homeTeam.city} {game.homeTeam.name}</span>
										<span class="team-abbr">{game.homeTeam.abbreviation}</span>
									</div>
									{#if game.status === 'final' || game.status === 'live'}
										<div class="team-score">{game.homeScore ?? 0}</div>
									{/if}
								</div>
							</div>
							<div class="betting-lines">
								{#if game.bettingLines.spread.line !== null}
									<div class="betting-line">
										<span class="line-label">Spread</span>
										<div class="line-values">
											<span class="line-team">{game.awayTeam.abbreviation} {formatSpreadLine(game.bettingLines.spread.line)}</span>
											{#if game.bettingLines.spread.awayOdds}
												<span class="line-odds">
													({game.bettingLines.spread.awayOdds})
													<span class="breakeven-percentage">{formatBreakevenPercentage(game.bettingLines.spread.awayOdds)}</span>
												</span>
											{/if}
										</div>
									</div>
								{/if}
								{#if game.bettingLines.total.line !== null}
									<div class="betting-line">
										<span class="line-label">Total</span>
										<div class="line-values">
											<span class="line-team">O/U {game.bettingLines.total.line}</span>
											{#if game.bettingLines.total.overOdds}
												<span class="line-odds">
													({game.bettingLines.total.overOdds})
													<span class="breakeven-percentage">{formatBreakevenPercentage(game.bettingLines.total.overOdds)}</span>
												</span>
											{/if}
										</div>
									</div>
								{/if}
								{#if game.bettingLines.moneyline.away !== null || game.bettingLines.moneyline.home !== null}
									<div class="betting-line">
										<span class="line-label">Moneyline</span>
										<div class="line-values">
											<span class="line-team">
												{#if game.bettingLines.moneyline.away}
													{game.awayTeam.abbreviation} {game.bettingLines.moneyline.away}
													<span class="breakeven-percentage">{formatBreakevenPercentage(game.bettingLines.moneyline.away)}</span>
												{:else}
													{game.awayTeam.abbreviation} —
												{/if}
												{' / '}
												{#if game.bettingLines.moneyline.home}
													{game.homeTeam.abbreviation} {game.bettingLines.moneyline.home}
													<span class="breakeven-percentage">{formatBreakevenPercentage(game.bettingLines.moneyline.home)}</span>
												{:else}
													{game.homeTeam.abbreviation} —
												{/if}
											</span>
										</div>
									</div>
								{/if}
								{#if game.bettingLines.spread.line === null && game.bettingLines.total.line === null && game.bettingLines.moneyline.away === null}
									<div class="no-lines">Betting lines not available</div>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- Touchdowns Tab -->
	{#if activeTab === 'touchdowns'}
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
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.current-week-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		background: rgba(34, 197, 94, 0.15);
		color: #15803d;
		border-radius: var(--radius-full);
		font-size: 0.625rem;
		font-weight: 700;
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


	.matchups-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--spacing-lg);
	}

	.matchup-card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		background: var(--color-background);
		transition: box-shadow 0.2s;
	}

	.matchup-card:hover {
		box-shadow: var(--shadow-md);
	}

	.matchup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-md);
		padding-bottom: var(--spacing-sm);
		border-bottom: 1px solid var(--color-border);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.favorite-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-secondary);
		border-radius: var(--radius-sm);
		transition: color 0.2s, transform 0.2s;
		flex-shrink: 0;
	}

	.favorite-btn:hover:not(:disabled) {
		color: #ef4444;
		transform: scale(1.1);
	}

	.favorite-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.favorite-btn.active {
		color: #ef4444;
	}

	.matchup-card.favorited {
		border-color: #ef4444;
		border-width: 2px;
		background: rgba(239, 68, 68, 0.02);
	}

	.game-time {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.game-status {
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-scheduled {
		background: rgba(59, 130, 246, 0.15);
		color: #1d4ed8;
	}

	.status-live {
		background: rgba(34, 197, 94, 0.15);
		color: #15803d;
	}

	.status-final {
		background: rgba(107, 114, 128, 0.15);
		color: #374151;
	}

	.matchup-teams {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
	}

	.team-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm);
		border-radius: var(--radius-md);
	}

	.team-row.away-team {
		background: rgba(59, 130, 246, 0.05);
	}

	.team-row.home-team {
		background: rgba(34, 197, 94, 0.05);
	}

	.team-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.team-name {
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 0.9375rem;
	}

	.team-abbr {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.team-score {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.betting-lines {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding-top: var(--spacing-md);
		border-top: 1px solid var(--color-border);
	}

	.betting-line {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-xs) 0;
	}

	.line-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		min-width: 80px;
	}

	.line-values {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		flex: 1;
		justify-content: flex-end;
	}

	.line-team {
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 0.875rem;
	}

	.line-odds {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.breakeven-percentage {
		font-size: 0.7rem;
		color: var(--color-primary);
		font-weight: 600;
		background: rgba(59, 130, 246, 0.1);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	.no-lines {
		text-align: center;
		padding: var(--spacing-sm);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-style: italic;
	}

	/* Tabs */
	.tabs-container {
		display: flex;
		gap: var(--spacing-sm);
		background: white;
		padding: var(--spacing-md) var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		border-bottom: 2px solid var(--color-border);
	}

	.tab-button {
		padding: var(--spacing-sm) var(--spacing-lg);
		background: none;
		border: none;
		border-bottom: 3px solid transparent;
		color: var(--color-text-secondary);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		bottom: -2px;
	}

	.tab-button:hover {
		color: var(--color-text-primary);
	}

	.tab-button.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}

	.matchups-section {
		background: white;
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.matchups-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-lg);
		gap: var(--spacing-lg);
		flex-wrap: wrap;
	}

	.matchups-section h2 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 1.5rem;
	}

	.favorites-toggle {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: white;
		cursor: pointer;
		transition: border-color 0.2s, box-shadow 0.2s, color 0.2s;
		color: var(--color-text-secondary);
	}

	.favorites-toggle:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.favorites-toggle.active {
		border-color: #ef4444;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.05);
	}

	.favorites-toggle svg {
		flex-shrink: 0;
	}

	.favorites-info {
		margin-bottom: var(--spacing-md);
		padding: var(--spacing-sm);
		background: rgba(239, 68, 68, 0.05);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		color: #ef4444;
		font-weight: 500;
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

		.matchups-grid {
			grid-template-columns: 1fr;
		}

		.matchups-section {
			padding: var(--spacing-lg);
		}

		.tabs-container {
			padding: var(--spacing-sm) var(--spacing-md);
		}

		.tab-button {
			padding: var(--spacing-xs) var(--spacing-md);
			font-size: 0.875rem;
		}
	}
</style>

