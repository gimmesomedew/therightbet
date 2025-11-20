<script lang="ts">
	type Matchup = {
		id: string;
		gameDate: string;
		status: string;
		homeTeam: { name: string; abbreviation: string; city: string; conference: string | null; wins: number; losses: number; score: number };
		awayTeam: { name: string; abbreviation: string; city: string; conference: string | null; wins: number; losses: number; score: number };
		bettingLines: {
			spread: { line: number | null; homeOdds: string | null; awayOdds: string | null };
			total: { line: number | null; overOdds: string | null; underOdds: string | null };
			moneyline: { home: string | null; away: string | null };
		};
	};
	
	let allMatchups = $state<Matchup[]>([]);
	let loading = $state(false);
	let weekStart = $state<string>('');
	let weekEnd = $state<string>('');
	let searchQuery = $state('');
	let selectedDay = $state<'all' | 'today' | 'tomorrow' | 'this-week'>('all');
	let selectedConference = $state<string>('all');
	let showFavoritesOnly = $state(false);
	let favoriteGameIds = $state<Set<string>>(new Set());
	let togglingFavorite = $state<string | null>(null);
	let syncing = $state(false);
	let syncMessage = $state<string | null>(null);
	let syncError = $state<string | null>(null);

	// Get unique conferences from matchups
	const availableConferences = $derived.by(() => {
		const conferences = new Set<string>();
		allMatchups.forEach(game => {
			if (game.homeTeam.conference) conferences.add(game.homeTeam.conference);
			if (game.awayTeam.conference) conferences.add(game.awayTeam.conference);
		});
		return Array.from(conferences).sort();
	});

	// Helper function to check if a game date matches the selected day filter
	function matchesDayFilter(gameDate: string): boolean {
		if (selectedDay === 'all') return true;
		
		const gameDateObj = new Date(gameDate);
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const weekEnd = new Date(today);
		weekEnd.setDate(weekEnd.getDate() + 6);
		
		const gameDay = new Date(gameDateObj.getFullYear(), gameDateObj.getMonth(), gameDateObj.getDate());
		
		if (selectedDay === 'today') {
			return gameDay.getTime() === today.getTime();
		} else if (selectedDay === 'tomorrow') {
			return gameDay.getTime() === tomorrow.getTime();
		} else if (selectedDay === 'this-week') {
			return gameDay >= today && gameDay <= weekEnd;
		}
		
		return true;
	}

	// Filter matchups based on search query, day filter, conference, and favorites
	const matchups = $derived.by(() => {
		let filtered = allMatchups;

		// Apply day filter first
		if (selectedDay !== 'all') {
			filtered = filtered.filter(game => matchesDayFilter(game.gameDate));
		}

		// Apply favorites filter
		if (showFavoritesOnly) {
			filtered = filtered.filter(game => favoriteGameIds.has(game.id));
		}

		// Apply conference filter
		if (selectedConference !== 'all') {
			filtered = filtered.filter(game => 
				game.homeTeam.conference === selectedConference ||
				game.awayTeam.conference === selectedConference
			);
		}

		// Apply search query filter
		if (searchQuery.trim()) {
			const query = searchQuery.trim().toLowerCase();
			filtered = filtered.filter(game => {
				const homeTeamName = `${game.homeTeam.city} ${game.homeTeam.name}`.toLowerCase();
				const awayTeamName = `${game.awayTeam.city} ${game.awayTeam.name}`.toLowerCase();
				const homeAbbr = game.homeTeam.abbreviation.toLowerCase();
				const awayAbbr = game.awayTeam.abbreviation.toLowerCase();
				
				return homeTeamName.includes(query) ||
					awayTeamName.includes(query) ||
					homeAbbr.includes(query) ||
					awayAbbr.includes(query);
			});
		}

		return filtered;
	});

	$effect(() => {
		loadMatchups();
		loadFavorites();
	});

	async function loadMatchups() {
		loading = true;
		try {
			const response = await fetch('/api/ncaa/matchups');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const result = await response.json();
			if (result.success) {
				allMatchups = result.data || [];
				weekStart = result.weekStart || '';
				weekEnd = result.weekEnd || '';
			} else {
				console.error('API returned error:', result.message);
			}
		} catch (error) {
			console.error('Failed to load NCAA matchups:', error);
		} finally {
			loading = false;
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

	function formatWeekRange(start: string, end: string): string {
		if (!start || !end) return '';
		const startDate = new Date(start);
		const endDate = new Date(end);
		return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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

	async function syncNCAA() {
		syncing = true;
		syncMessage = null;
		syncError = null;

		try {
			const response = await fetch('/api/ncaa/sync', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (result.success) {
				syncMessage = 'NCAA data synced successfully! Refreshing...';
				// Reload matchups after a short delay
				setTimeout(() => {
					loadMatchups();
					syncMessage = null;
				}, 1500);
			} else {
				syncError = result.message || 'Failed to sync NCAA data';
			}
		} catch (error: any) {
			syncError = error.message || 'Failed to sync NCAA data';
			console.error('Sync error:', error);
		} finally {
			syncing = false;
		}
	}
</script>

<div class="ncaa-page">
	<header class="page-header">
		<div>
			<h1>NCAA Football</h1>
			<p class="subtitle">Division I Matchups & Spreads</p>
		</div>
		<div class="meta">
			{#if weekStart && weekEnd}
				<span class="week-label">Current Week: {formatWeekRange(weekStart, weekEnd)}</span>
			{/if}
			<div class="header-actions">
				<button
					type="button"
					onclick={syncNCAA}
					disabled={syncing}
					class="sync-button"
					class:syncing={syncing}
					aria-label="Sync NCAA data"
					title="Sync NCAA games and odds data"
				>
					{#if syncing}
						<svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 12a9 9 0 1 1-6.219-8.56"/>
						</svg>
						<span>Syncing...</span>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 1 1 6.219-8.56M22 12.5a10 10 0 1 1-6.219 8.56"/>
						</svg>
						<span>Sync Data</span>
					{/if}
				</button>
			</div>
		</div>
	</header>

	{#if syncMessage}
		<div class="sync-message success" role="alert">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
				<polyline points="22 4 12 14.01 9 11.01"/>
			</svg>
			<span>{syncMessage}</span>
		</div>
	{/if}

	{#if syncError}
		<div class="sync-message error" role="alert">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"/>
				<line x1="12" y1="8" x2="12" y2="12"/>
				<line x1="12" y1="16" x2="12.01" y2="16"/>
			</svg>
			<span>{syncError}</span>
			<button
				type="button"
				onclick={() => syncError = null}
				class="dismiss-error"
				aria-label="Dismiss error"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"/>
					<line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>
	{/if}

	<section class="matchups-section" aria-live="polite">
		<div class="section-header">
			<h2>Current Week's Matchups</h2>
			<div class="search-controls">
				<div class="filters-row">
					<select
						bind:value={selectedDay}
						class="day-filter"
						aria-label="Filter by day"
					>
						<option value="all">All Days</option>
						<option value="today">Today</option>
						<option value="tomorrow">Tomorrow</option>
						<option value="this-week">This Week</option>
					</select>
					<div class="search-input-wrapper">
						<svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8"></circle>
							<path d="m21 21-4.35-4.35"></path>
						</svg>
						<input
							type="text"
							placeholder="Search teams..."
							bind:value={searchQuery}
							class="search-input"
							aria-label="Search teams"
						/>
						{#if searchQuery}
							<button
								type="button"
								onclick={() => searchQuery = ''}
								class="clear-search"
								aria-label="Clear search"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						{/if}
					</div>
					<select
						bind:value={selectedConference}
						class="conference-filter"
						aria-label="Filter by conference"
					>
						<option value="all">All Conferences</option>
						{#each availableConferences as conference}
							<option value={conference}>{conference}</option>
						{/each}
					</select>
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
				{#if (searchQuery || selectedConference !== 'all' || showFavoritesOnly) && matchups.length !== allMatchups.length}
					<span class="search-results">
						{matchups.length} of {allMatchups.length} games
						{#if showFavoritesOnly}
							<span class="favorites-count">({favoriteGameIds.size} favorited)</span>
						{/if}
					</span>
				{/if}
			</div>
		</div>
		{#if loading}
			<div class="loading-state">
				<div class="spinner" aria-hidden="true"></div>
				<span>Loading matchups…</span>
			</div>
		{:else if allMatchups.length === 0}
			<div class="empty-state">
				<p>No matchups found for current week.</p>
				<p>Run the sync script to load games:</p>
				<code>npm run sync:ncaa</code>
			</div>
		{:else if matchups.length === 0 && (searchQuery || selectedConference !== 'all')}
			<div class="empty-state">
				<p>No teams found matching "{searchQuery}"</p>
				<button onclick={() => searchQuery = ''} class="clear-filter-btn">Clear search</button>
			</div>
		{:else}
			<div class="matchups-grid">
				{#each matchups as game}
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
									<div class="team-meta">
										<span class="team-abbr">{game.awayTeam.abbreviation}</span>
										<span class="team-record">({game.awayTeam.wins}-{game.awayTeam.losses})</span>
									</div>
								</div>
								{#if game.status === 'final' || game.status === 'live'}
									<div class="team-score">{game.awayScore ?? 0}</div>
								{/if}
							</div>
							<div class="team-row home-team">
								<div class="team-info">
									<div class="team-header">
										<span class="team-name">{game.homeTeam.city} {game.homeTeam.name}</span>
										<span class="home-badge">HOME</span>
									</div>
									<div class="team-meta">
										<span class="team-abbr">{game.homeTeam.abbreviation}</span>
										<span class="team-record">({game.homeTeam.wins}-{game.homeTeam.losses})</span>
									</div>
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
</div>

<style>
	.ncaa-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
		padding: var(--spacing-xl);
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-lg);
	}

	.page-header h1 {
		margin: 0 0 var(--spacing-xs);
		color: var(--color-text-primary);
		font-size: 2rem;
		font-weight: 700;
	}

	.subtitle {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 1rem;
	}

	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--spacing-sm);
	}

	.week-label {
		color: var(--color-primary);
		font-weight: 600;
		font-size: 0.875rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.sync-button {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: var(--color-primary);
		color: white;
		cursor: pointer;
		transition: background-color 0.2s, border-color 0.2s, opacity 0.2s;
		font-weight: 500;
	}

	.sync-button:hover:not(:disabled) {
		background: #2563eb;
		border-color: #2563eb;
	}

	.sync-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.sync-button.syncing {
		background: var(--color-text-secondary);
		border-color: var(--color-text-secondary);
	}

	.sync-button svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.sync-button .spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.sync-message {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-md) var(--spacing-lg);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		margin-bottom: var(--spacing-lg);
		animation: slideDown 0.3s ease-out;
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

	.sync-message.success {
		background: #d1fae5;
		color: #065f46;
		border: 1px solid #6ee7b7;
	}

	.sync-message.error {
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fca5a5;
		justify-content: space-between;
	}

	.sync-message svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.dismiss-error {
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #991b1b;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s;
	}

	.dismiss-error:hover {
		background: rgba(153, 27, 27, 0.1);
	}

	.matchups-section {
		background: white;
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.section-header {
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

	.search-controls {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.filters-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}

	.day-filter {
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: white;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: border-color 0.2s, box-shadow 0.2s;
		font-weight: 500;
		min-width: 140px;
	}

	.day-filter:hover {
		border-color: var(--color-primary);
	}

	.day-filter:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.conference-filter {
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: white;
		cursor: pointer;
		transition: border-color 0.2s, box-shadow 0.2s;
		min-width: 180px;
	}

	.conference-filter:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		min-width: 250px;
	}

	.search-icon {
		position: absolute;
		left: var(--spacing-sm);
		color: var(--color-text-secondary);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 2.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.clear-search {
		position: absolute;
		right: var(--spacing-xs);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-secondary);
		border-radius: var(--radius-sm);
		transition: background-color 0.2s, color 0.2s;
	}

	.clear-search:hover {
		background: var(--color-background-secondary);
		color: var(--color-text-primary);
	}

	.search-results {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.clear-filter-btn {
		margin-top: var(--spacing-sm);
		padding: var(--spacing-xs) var(--spacing-md);
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.clear-filter-btn:hover {
		background: var(--color-primary-dark, #1d4ed8);
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xxl);
		color: var(--color-text-secondary);
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

	.empty-state code {
		background: var(--color-background-secondary);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		color: var(--color-primary);
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

	.favorites-count {
		color: #ef4444;
		font-weight: 600;
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
		flex: 1;
	}

	.team-header {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.team-name {
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 0.9375rem;
	}

	.home-badge {
		font-size: 0.625rem;
		font-weight: 700;
		color: var(--color-primary);
		background: rgba(59, 130, 246, 0.1);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.team-meta {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.team-abbr {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.team-record {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-weight: 500;
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

	@media (max-width: 768px) {
		.ncaa-page {
			padding: var(--spacing-lg);
		}

		.page-header {
			flex-direction: column;
		}

		.matchups-grid {
			grid-template-columns: 1fr;
		}

		.matchups-section {
			padding: var(--spacing-lg);
		}
	}
</style>

