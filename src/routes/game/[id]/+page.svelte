<script lang="ts">
	import { page } from '$app/stores';

	// Get data from server load function
	export let data;

	// Get game ID from URL params
	const gameId = $page.params.id;

	// Game data from server
	let game = data.game;
	let headToHead = data.headToHead;
	let error = data.error || '';
	let activePlayerTab = 'All Players';
	let loading = false;

	function formatGameTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short'
		});
	}

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'out': return '#ef4444';
			case 'questionable': return '#f59e0b';
			case 'healthy': return '#22c55e';
			default: return '#6b7280';
		}
	}

	function getStatusText(status: string): string {
		switch (status.toLowerCase()) {
			case 'out': return 'OUT';
			case 'questionable': return 'QUESTIONABLE';
			case 'healthy': return 'HEALTHY';
			default: return status.toUpperCase();
		}
	}
</script>

<svelte:head>
	<title>{game ? `${game.homeTeam.name} vs ${game.awayTeam.name}` : 'Game Details'} - THERiGHTBET</title>
	<meta name="description" content={game ? `Detailed analysis and betting insights for ${game.homeTeam.name} vs ${game.awayTeam.name}` : 'Loading game details...'} />
</svelte:head>

<div class="game-details-page">
			{#if error}
			<div class="error-container">
				<div class="error-icon">⚠️</div>
				<h2>Error Loading Game</h2>
				<p>{error}</p>
				<a href="/" class="back-button">← Back to Dashboard</a>
			</div>
		{:else if !game}
		<div class="skeleton-container">
			<!-- Game Header Skeleton -->
			<div class="skeleton-card">
				<div class="skeleton-header">
					<div class="skeleton-line short"></div>
					<div class="skeleton-line medium"></div>
					<div class="skeleton-button"></div>
				</div>
				<div class="skeleton-teams">
					<div class="skeleton-team">
						<div class="skeleton-logo"></div>
						<div class="skeleton-team-info">
							<div class="skeleton-line long"></div>
							<div class="skeleton-line short"></div>
							<div class="skeleton-line short"></div>
						</div>
					</div>
					<div class="skeleton-vs">
						<div class="skeleton-line short"></div>
						<div class="skeleton-venue">
							<div class="skeleton-line short"></div>
							<div class="skeleton-line short"></div>
						</div>
					</div>
					<div class="skeleton-team">
						<div class="skeleton-logo"></div>
						<div class="skeleton-team-info">
							<div class="skeleton-line long"></div>
							<div class="skeleton-line short"></div>
							<div class="skeleton-line short"></div>
						</div>
					</div>
				</div>
				<div class="skeleton-betting-lines">
					<div class="skeleton-betting-card"></div>
					<div class="skeleton-betting-card"></div>
					<div class="skeleton-betting-card"></div>
				</div>
			</div>

			<!-- Stats Section Skeleton -->
			<div class="skeleton-card">
				<div class="skeleton-title"></div>
				<div class="skeleton-stats">
					<div class="skeleton-stat-item"></div>
					<div class="skeleton-stat-item"></div>
					<div class="skeleton-stat-item"></div>
					<div class="skeleton-stat-item"></div>
				</div>
				<div class="skeleton-form">
					<div class="skeleton-form-section"></div>
					<div class="skeleton-form-section"></div>
				</div>
			</div>

			<!-- Head to Head Skeleton -->
			<div class="skeleton-card">
				<div class="skeleton-title"></div>
				<div class="skeleton-h2h">
					<div class="skeleton-h2h-section"></div>
					<div class="skeleton-h2h-section"></div>
					<div class="skeleton-h2h-section"></div>
				</div>
			</div>

			<!-- AI Insights Skeleton -->
			<div class="skeleton-card">
				<div class="skeleton-title"></div>
				<div class="skeleton-insights">
					<div class="skeleton-insight-card"></div>
					<div class="skeleton-insight-card"></div>
				</div>
			</div>

			<!-- Injury Report Skeleton -->
			<div class="skeleton-card">
				<div class="skeleton-title"></div>
				<div class="skeleton-injuries">
					<div class="skeleton-injury-section"></div>
					<div class="skeleton-injury-section"></div>
				</div>
			</div>

			<!-- Player Props Skeleton -->
			<div class="skeleton-card">
				<div class="skeleton-title"></div>
				<div class="skeleton-tabs">
					<div class="skeleton-tab"></div>
					<div class="skeleton-tab"></div>
					<div class="skeleton-tab"></div>
				</div>
				<div class="skeleton-player-props">
					<div class="skeleton-player-card"></div>
					<div class="skeleton-player-card"></div>
					<div class="skeleton-player-card"></div>
					<div class="skeleton-player-card"></div>
				</div>
			</div>
		</div>
			{:else}
		<!-- Game Header -->
		<div class="game-header">
			<div class="header-top">
				<a href="/" class="back-link">← Back to Games</a>
				<div class="game-info">
					<span class="game-date">{formatGameTime(game.gameTime)}</span>
					<span class="status-badge upcoming">UPCOMING</span>
				</div>
				<button class="favorite-button">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
					</svg>
					Add to Favorites
				</button>
			</div>

			<div class="teams-section">
				<div class="team home-team">
					<div class="team-logo" style="background-color: {game.homeTeam.color}">
						<svg width="40" height="40" viewBox="0 0 24 24" fill="white">
							<circle cx="12" cy="12" r="10"/>
							<path d="M12 2a10 10 0 100 20 10 10 0 000-20z M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2a10 10 0 100 20 10 10 0 000-20z"/>
						</svg>
					</div>
					<div class="team-info">
						<h3>{game.homeTeam.name}</h3>
						<p>Record: {game.homeTeam.record}</p>
						<p>Last 5: {game.homeTeam.lastFive}</p>
					</div>
				</div>

				<div class="vs-section">
					<span class="vs">VS</span>
					<div class="venue">
						<p>{game.venue}</p>
						<p>{game.location}</p>
					</div>
				</div>

				<div class="team away-team">
					<div class="team-logo" style="background-color: {game.awayTeam.color}">
						<svg width="40" height="40" viewBox="0 0 24 24" fill="white">
							<circle cx="12" cy="12" r="10"/>
							<path d="M12 2a10 10 0 100 20 10 10 0 000-20z M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2a10 10 0 100 20 10 10 0 000-20z"/>
						</svg>
					</div>
					<div class="team-info">
						<h3>{game.awayTeam.name}</h3>
						<p>Record: {game.awayTeam.record}</p>
						<p>Last 5: {game.awayTeam.lastFive}</p>
					</div>
				</div>
			</div>

			<div class="betting-lines">
				<div class="betting-card">
					<h4>Point Spread</h4>
					<div class="betting-options">
						<span class="bet-option">{game.homeTeam.abbreviation} {game.bettingLines.spread.home}</span>
						<span class="bet-option">{game.awayTeam.abbreviation} {game.bettingLines.spread.away}</span>
					</div>
				</div>
				<div class="betting-card">
					<h4>Total Points</h4>
					<div class="betting-options">
						<span class="bet-option">{game.bettingLines.total.over}</span>
						<span class="bet-option">{game.bettingLines.total.under}</span>
					</div>
				</div>
				<div class="betting-card">
					<h4>Moneyline</h4>
					<div class="betting-options">
						<span class="bet-option">{game.homeTeam.abbreviation} {game.bettingLines.moneyline.home}</span>
						<span class="bet-option">{game.awayTeam.abbreviation} {game.bettingLines.moneyline.away}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Team Stats Comparison -->
		<div class="stats-section">
			<h2>Team Stats Comparison</h2>
			<div class="stats-grid">
				<div class="stat-item">
					<div class="stat-label">Points Per Game</div>
					<div class="stat-bars">
						<div class="stat-bar home" style="width: {(game.teamStats.home.pointsPerGame / 100) * 100}%; background-color: {game.homeTeam.color}">
							<span class="stat-value">{game.teamStats.home.pointsPerGame}</span>
						</div>
						<div class="stat-bar away" style="width: {(game.teamStats.away.pointsPerGame / 100) * 100}%; background-color: {game.awayTeam.color}">
							<span class="stat-value">{game.teamStats.away.pointsPerGame}</span>
						</div>
					</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Field Goal %</div>
					<div class="stat-bars">
						<div class="stat-bar home" style="width: {game.teamStats.home.fieldGoalPct}%; background-color: {game.homeTeam.color}">
							<span class="stat-value">{game.teamStats.home.fieldGoalPct}%</span>
						</div>
						<div class="stat-bar away" style="width: {game.teamStats.away.fieldGoalPct}%; background-color: {game.awayTeam.color}">
							<span class="stat-value">{game.teamStats.away.fieldGoalPct}%</span>
						</div>
					</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Rebounds Per Game</div>
					<div class="stat-bars">
						<div class="stat-bar home" style="width: {(game.teamStats.home.reboundsPerGame / 40) * 100}%; background-color: #22c55e">
							<span class="stat-value">{game.teamStats.home.reboundsPerGame}</span>
						</div>
						<div class="stat-bar away" style="width: {(game.teamStats.away.reboundsPerGame / 40) * 100}%; background-color: {game.awayTeam.color}">
							<span class="stat-value">{game.teamStats.away.reboundsPerGame}</span>
						</div>
					</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Assists Per Game</div>
					<div class="stat-bars">
						<div class="stat-bar home" style="width: {(game.teamStats.home.assistsPerGame / 25) * 100}%; background-color: {game.homeTeam.color}">
							<span class="stat-value">{game.teamStats.home.assistsPerGame}</span>
						</div>
						<div class="stat-bar away" style="width: {(game.teamStats.away.assistsPerGame / 25) * 100}%; background-color: {game.awayTeam.color}">
							<span class="stat-value">{game.teamStats.away.assistsPerGame}</span>
						</div>
					</div>
				</div>
			</div>
			<div class="recent-form">
				<div class="form-section">
					<h4>{game.homeTeam.name}</h4>
					<div class="form-indicators">
						<span class="form-indicator loss">L</span>
						<span class="form-indicator win">W</span>
						<span class="form-indicator loss">L</span>
						<span class="form-indicator loss">L</span>
						<span class="form-indicator win">W</span>
					</div>
				</div>
				<div class="form-section">
					<h4>{game.awayTeam.name}</h4>
					<div class="form-indicators">
						<span class="form-indicator win">W</span>
						<span class="form-indicator win">W</span>
						<span class="form-indicator loss">L</span>
						<span class="form-indicator win">W</span>
						<span class="form-indicator win">W</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Head to Head -->
		<div class="head-to-head-section">
			<h2>Head to Head</h2>
			<div class="h2h-content">
				<div class="series-info">
					<h3>All-Time Series</h3>
					<p class="series-record">{headToHead?.allTimeSeries || 'N/A'}</p>
					<p class="series-leader">{headToHead?.seriesLeader || 'No data available'}</p>
				</div>
				<div class="recent-meetings">
					<h3>Last 5 Meetings</h3>
					<div class="meetings-list">
						{#if headToHead?.lastFiveMeetings}
							{#each headToHead.lastFiveMeetings as meeting}
								<div class="meeting-item">
									<span class="meeting-date">{new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
									<span class="meeting-score">{meeting.homeTeam} {meeting.homeScore} - {meeting.awayScore} {meeting.awayTeam}</span>
									<span class="meeting-result {meeting.result.includes('Win') ? 'win' : 'loss'}">
										{meeting.result.includes('Win') ? 'W' : 'L'}
									</span>
								</div>
							{/each}
						{:else}
							<div class="no-data">No head-to-head data available</div>
						{/if}
					</div>
				</div>
				<div class="betting-trends">
					<h3>Betting Trends (Last 5 H2H)</h3>
					<div class="trends-grid">
						{#if headToHead?.bettingTrends}
							<div class="trend-card">{headToHead.bettingTrends.ats}</div>
							<div class="trend-card">{headToHead.bettingTrends.overUnder}</div>
							<div class="trend-card">{headToHead.bettingTrends.avgTotal}</div>
						{:else}
							<div class="no-data">No betting trends available</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- AI Betting Insights -->
		<div class="ai-insights-section">
			<h2>AI Betting Insights</h2>
			<div class="insights-grid">
				<div class="insight-card key-matchup">
					<h3>Key Matchup</h3>
					<p>{game.aiInsights.keyMatchup.title}</p>
					<div class="confidence">Confidence: {game.aiInsights.keyMatchup.confidence}%</div>
				</div>
				<div class="insight-card value-bet">
					<h3>Value Bet</h3>
					<p>{game.aiInsights.valueBet.title}</p>
					<div class="expected-value">Expected Value: +{game.aiInsights.valueBet.expectedValue}%</div>
				</div>
			</div>
		</div>

		<!-- Injury Report -->
		<div class="injury-section">
			<h2>Injury Report</h2>
			<div class="injury-grid">
				<div class="injury-team">
					<h3>{game.homeTeam.name}</h3>
					<div class="injury-list">
						{#each game.injuries.home as injury}
							<div class="injury-item">
								<span class="player-name">{injury.player}</span>
								<span class="player-position">{injury.position}</span>
								<span class="injury-status" style="background-color: {getStatusColor(injury.status)}">
									{getStatusText(injury.status)}
								</span>
							</div>
						{/each}
					</div>
				</div>
				<div class="injury-team">
					<h3>{game.awayTeam.name}</h3>
					<div class="injury-list">
						{#each game.injuries.away as injury}
							<div class="injury-item">
								<span class="player-name">{injury.player}</span>
								<span class="player-position">{injury.position}</span>
								<span class="injury-status" style="background-color: {getStatusColor(injury.status)}">
									{getStatusText(injury.status)}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Player Props -->
		<div class="player-props-section">
			<h2>Player Props</h2>
			<div class="props-tabs">
				<button class="tab" class:active={activePlayerTab === 'All Players'} onclick={() => activePlayerTab = 'All Players'}>All Players</button>
				<button class="tab" class:active={activePlayerTab === game.homeTeam.name} onclick={() => activePlayerTab = game.homeTeam.name}>{game.homeTeam.name}</button>
				<button class="tab" class:active={activePlayerTab === game.awayTeam.name} onclick={() => activePlayerTab = game.awayTeam.name}>{game.awayTeam.name}</button>
			</div>
			<div class="player-props-grid">
				{#if activePlayerTab === 'All Players' || activePlayerTab === game.homeTeam.name}
					{#each game.playerProps.home as player}
						<div class="player-prop-card">
							<div class="player-info">
								<h4>{player.name}</h4>
								<p>{player.position} {player.number}</p>
							</div>
							<div class="props-list">
								{#each player.props as prop}
									<div class="prop">
										<div class="prop-type">{prop.type}</div>
										<div class="prop-buttons">
											<button class="prop-button over">
												<span>O {prop.line}</span>
												<span class="odds">{prop.overOdds}</span>
											</button>
											<button class="prop-button under">
												<span>U {prop.line}</span>
												<span class="odds">{prop.underOdds}</span>
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
				{#if activePlayerTab === 'All Players' || activePlayerTab === game.awayTeam.name}
					{#each game.playerProps.away as player}
						<div class="player-prop-card">
							<div class="player-info">
								<h4>{player.name}</h4>
								<p>{player.position} {player.number}</p>
							</div>
							<div class="props-list">
								{#each player.props as prop}
									<div class="prop">
										<div class="prop-type">{prop.type}</div>
										<div class="prop-buttons">
											<button class="prop-button over">
												<span>O {prop.line}</span>
												<span class="odds">{prop.overOdds}</span>
											</button>
											<button class="prop-button under">
												<span>U {prop.line}</span>
												<span class="odds">{prop.underOdds}</span>
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.game-details-page {
		padding: 1.5rem;
		background-color: #f8fafc;
		min-height: calc(100vh - 64px);
		max-width: 1200px;
		margin: 0 auto;
	}

	.loading-container,
	.error-container {
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
		border-top: 4px solid #22c55e;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-container {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		max-width: 400px;
		margin: 2rem auto;
	}

	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.error-container h2 {
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.error-container p {
		color: #6b7280;
		margin: 0 0 1.5rem 0;
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background-color: #22c55e;
		color: white;
		text-decoration: none;
		border-radius: 8px;
		font-weight: 500;
		transition: background-color 0.2s ease;
	}

	.back-button:hover {
		background-color: #16a34a;
	}

	/* Game Header */
	.game-header {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.back-link {
		color: #6b7280;
		text-decoration: none;
		font-weight: 500;
	}

	.back-link:hover {
		color: #22c55e;
	}

	.game-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.game-date {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.status-badge.upcoming {
		background-color: #f59e0b;
		color: white;
	}

	.favorite-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #22c55e;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.favorite-button:hover {
		background-color: #16a34a;
	}

	.teams-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
	}

	.team {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
	}

	.team-logo {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.team-info h3 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.25rem 0;
	}

	.team-info p {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.vs-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin: 0 2rem;
	}

	.vs {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.venue p {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
		text-align: center;
	}

	.betting-lines {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.betting-card {
		background-color: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
	}

	.betting-card h4 {
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
		margin: 0 0 0.5rem 0;
	}

	.betting-options {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.bet-option {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
	}

	/* Stats Section */
	.stats-section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.stats-section h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 1.5rem 0;
	}

	.stats-grid {
		display: grid;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
	}

	.stat-bars {
		display: flex;
		gap: 0.5rem;
		height: 30px;
	}

	.stat-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		position: relative;
		min-width: 60px;
	}

	.stat-value {
		color: white;
		font-size: 0.875rem;
		font-weight: 600;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.recent-form {
		display: flex;
		justify-content: space-between;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.form-section h4 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.form-indicators {
		display: flex;
		gap: 0.25rem;
	}

	.form-indicator {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
	}

	.form-indicator.win {
		background-color: #22c55e;
	}

	.form-indicator.loss {
		background-color: #ef4444;
	}

	/* Head to Head */
	.head-to-head-section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.head-to-head-section h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 1.5rem 0;
	}

	.h2h-content {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr;
		gap: 2rem;
	}

	.series-info h3,
	.recent-meetings h3,
	.betting-trends h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.series-record {
		font-size: 1.5rem;
		font-weight: 700;
		color: #22c55e;
		margin: 0 0 0.25rem 0;
	}

	.series-leader {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.meetings-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.meeting-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.meeting-date {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.meeting-score {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
	}

	.meeting-result {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
	}

	.meeting-result.win {
		background-color: #22c55e;
	}

	.meeting-result.loss {
		background-color: #ef4444;
	}

	.trends-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.trend-card {
		background-color: #f9fafb;
		padding: 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
		text-align: center;
	}

	.no-data {
		text-align: center;
		color: #64748b;
		font-style: italic;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	/* AI Insights */
	.ai-insights-section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.ai-insights-section h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 1.5rem 0;
	}

	.insights-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.insight-card {
		padding: 1.5rem;
		border-radius: 8px;
	}

	.insight-card.key-matchup {
		background-color: #dcfce7;
		border-left: 4px solid #22c55e;
	}

	.insight-card.value-bet {
		background-color: #fef3c7;
		border-left: 4px solid #f59e0b;
	}

	.insight-card h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.insight-card p {
		font-size: 0.875rem;
		color: #374151;
		margin: 0 0 1rem 0;
		line-height: 1.5;
	}

	.confidence,
	.expected-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
	}

	/* Injury Report */
	.injury-section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.injury-section h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 1.5rem 0;
	}

	.injury-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.injury-team h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.injury-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.injury-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background-color: #f9fafb;
		border-radius: 6px;
	}

	.player-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
		flex: 1;
	}

	.player-position {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.injury-status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
	}

	/* Player Props */
	.player-props-section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.player-props-section h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 1.5rem 0;
	}

	.props-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.tab {
		padding: 0.75rem 1rem;
		background-color: #f3f4f6;
		color: #6b7280;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tab.active {
		background-color: #22c55e;
		color: white;
	}

	.tab:hover:not(.active) {
		background-color: #e5e7eb;
	}

	.player-props-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.player-prop-card {
		background-color: #f9fafb;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.player-info h4 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.25rem 0;
	}

	.player-info p {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0 0 1rem 0;
	}

	.props-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.prop {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.prop-type {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
	}

	.prop-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.prop-button {
		flex: 1;
		padding: 0.75rem;
		background-color: #22c55e;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.prop-button:hover {
		background-color: #16a34a;
	}

	.prop-button .odds {
		opacity: 0.8;
		font-size: 0.75rem;
	}

	/* Responsive Design */
	@media (max-width: 1024px) {
		.h2h-content {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.insights-grid {
			grid-template-columns: 1fr;
		}

		.injury-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.game-details-page {
			padding: 1rem;
		}

		.teams-section {
			flex-direction: column;
			gap: 1.5rem;
		}

		.vs-section {
			margin: 0;
		}

		.betting-lines {
			grid-template-columns: 1fr;
		}

		.header-top {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.game-info {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.player-props-grid {
			grid-template-columns: 1fr;
		}

		.props-tabs {
			flex-wrap: wrap;
		}
	}

	/* Skeleton Loading Styles */
	.skeleton-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.skeleton-card {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.skeleton-line {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		height: 16px;
		margin-bottom: 0.5rem;
	}

	.skeleton-line.short {
		width: 60px;
	}

	.skeleton-line.medium {
		width: 120px;
	}

	.skeleton-line.long {
		width: 180px;
	}

	.skeleton-button {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 8px;
		width: 140px;
		height: 40px;
	}

	.skeleton-logo {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 50%;
		width: 60px;
		height: 60px;
	}

	.skeleton-title {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		width: 200px;
		height: 24px;
		margin-bottom: 1.5rem;
	}

	.skeleton-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.skeleton-teams {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
	}

	.skeleton-team {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
	}

	.skeleton-team-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-vs {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin: 0 2rem;
	}

	.skeleton-venue {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.skeleton-betting-lines {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.skeleton-betting-card {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 8px;
		height: 80px;
	}

	.skeleton-stats {
		display: grid;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.skeleton-stat-item {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		height: 40px;
	}

	.skeleton-form {
		display: flex;
		justify-content: space-between;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.skeleton-form-section {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		width: 120px;
		height: 60px;
	}

	.skeleton-h2h {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr;
		gap: 2rem;
	}

	.skeleton-h2h-section {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		height: 200px;
	}

	.skeleton-insights {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.skeleton-insight-card {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 8px;
		height: 120px;
	}

	.skeleton-injuries {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.skeleton-injury-section {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		height: 150px;
	}

	.skeleton-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.skeleton-tab {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 6px;
		width: 100px;
		height: 40px;
	}

	.skeleton-player-props {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.skeleton-player-card {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 8px;
		height: 200px;
	}

	@keyframes skeleton-loading {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	/* Responsive skeleton styles */
	@media (max-width: 1024px) {
		.skeleton-h2h {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.skeleton-insights {
			grid-template-columns: 1fr;
		}

		.skeleton-injuries {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.skeleton-teams {
			flex-direction: column;
			gap: 1.5rem;
		}

		.skeleton-vs {
			margin: 0;
		}

		.skeleton-betting-lines {
			grid-template-columns: 1fr;
		}

		.skeleton-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.skeleton-player-props {
			grid-template-columns: 1fr;
		}

		.skeleton-tabs {
			flex-wrap: wrap;
		}
	}
</style>
