<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Stats data - use server-side data with fallback
	let stats = $state(data.stats.length > 0 ? data.stats : [
		{
			label: "Today's Games",
			value: '2',
			icon: 'calendar',
			color: 'green'
		},
		{
			label: 'Total Teams',
			value: '13',
			icon: 'activity',
			color: 'orange'
		},
		{
			label: 'Total Players',
			value: '163',
			icon: 'trophy',
			color: 'yellow'
		},
		{
			label: 'Upcoming Games',
			value: '2',
			icon: 'dollar-sign',
			color: 'green'
		}
	]);

	// Transform server-side games data
	let games = $state(data.games.map((game: any) => ({
		id: game.id,
		homeTeam: game.homeTeam.name,
		awayTeam: game.awayTeam.name,
		homeScore: game.homeScore,
		awayScore: game.awayScore,
		status: game.status === 'scheduled' ? 'Upcoming' : 
				game.status === 'live' ? 'Live' : 
				game.status === 'final' ? 'Completed' : 
				game.status === 'upcoming' ? 'Upcoming' : 'Upcoming',
		time: new Date(game.gameTime).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short'
		}),
		quarter: game.status === 'live' ? 'Q3 - 8:45' : null,
		spread: '-4.5', // Mock spread data
		spreadOdds: '-110',
		total: '168.5', // Mock total data
		totalOdds: '-110',
		moneyline: '-180', // Mock moneyline data
		homeRecord: game.homeTeam.record || 'N/A', // Use real record from API
		awayRecord: game.awayTeam.record || 'N/A'  // Use real record from API
	})));

	// Mock data for player props
	const playerProps = [
		{
			id: '1',
			playerName: "A'ja Wilson",
			team: 'Las Vegas Aces',
			props: [
				{ type: 'Points', line: 22.5, overOdds: '-110', underOdds: '-110' },
				{ type: 'Rebounds', line: 9.5, overOdds: '-115', underOdds: '-105' }
			]
		},
		{
			id: '2',
			playerName: 'Breanna Stewart',
			team: 'Seattle Storm',
			props: [
				{ type: 'Points', line: 19.5, overOdds: '-110', underOdds: '-110' },
				{ type: 'Assists', line: 4.5, overOdds: '-120', underOdds: '+100' }
			]
		}
	];

	let activeTab = $state('Upcoming');

	function getIconPath(iconName: string): string {
		const icons: Record<string, string> = {
			calendar: 'M8 2v3 M16 2v3 M3.5 9.09h17M21 8.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2V8.5a2 2 0 012-2h14a2 2 0 012 2z',
			activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
			trophy: 'M6 9H4.5A2.5 2.5 0 012 6.5v-1A2.5 2.5 0 014.5 3H6M18 9h1.5A2.5 2.5 0 0022 6.5v-1A2.5 2.5 0 0019.5 3H18M6 9v6a2 2 0 002 2h8a2 2 0 002-2V9M6 9H4.5A2.5 2.5 0 012 6.5v-1A2.5 2.5 0 014.5 3H6M18 9h1.5A2.5 2.5 0 0022 6.5v-1A2.5 2.5 0 0019.5 3H18',
			'dollar-sign': 'M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'
		};
		return icons[iconName] || icons.calendar;
	}





	// Current time for live display
	let currentTime = $state(new Date());

	// Load data on component mount
	onMount(() => {
		// Update time every second
		const timeInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		// Cleanup interval on component destroy
		return () => {
			clearInterval(timeInterval);
		};
	});
</script>

<div class="homepage">
	<!-- Stats Section -->
	<div class="stats-section">
		<div class="stats-grid">
			{#each stats as stat}
				<div class="stat-card">
					<div class="stat-icon" class:green={stat.color === 'green'} class:orange={stat.color === 'orange'} class:yellow={stat.color === 'yellow'}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d={getIconPath(stat.icon)} />
						</svg>
					</div>
					<div class="stat-content">
						<div class="stat-value" class:green={stat.color === 'green'} class:orange={stat.color === 'orange'} class:yellow={stat.color === 'yellow'}>{stat.value}</div>
						<div class="stat-label">{stat.label}</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Games Section -->
	<div class="games-section">
		<div class="section-header">
			<h2>Today's WNBA Games</h2>
			<div class="date-info">
				<span class="day">{currentTime.toLocaleDateString('en-US', { weekday: 'long' })}</span>
				<span class="date">{currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
				<span class="time">{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</span>
			</div>
		</div>
		
		<div class="tabs">
			<button class="tab" class:active={activeTab === 'Live'} onclick={() => activeTab = 'Live'}>Live</button>
			<button class="tab" class:active={activeTab === 'Upcoming'} onclick={() => activeTab = 'Upcoming'}>Upcoming</button>
			<button class="tab" class:active={activeTab === 'Completed'} onclick={() => activeTab = 'Completed'}>Completed</button>
		</div>

		<div class="games-list">
			{#if activeTab === 'Live'}
				{#each games.filter((game: any) => game.status === 'Live') as game}
					<div class="game-card">
						<div class="game-header">
							<div class="game-time">
								<span class="time">{game.time}</span>
								<span class="quarter">{game.quarter}</span>
							</div>
							<div class="game-status">
								<span class="status-badge live">LIVE</span>
							</div>
							<a href="/game/{game.id}" class="view-details">View Details</a>
						</div>
						
						<div class="game-content">
							<div class="team">
								<div class="team-name">{game.homeTeam}</div>
								<div class="team-record">({game.homeRecord})</div>
								<div class="team-score">{game.homeScore}</div>
							</div>
							
							<div class="vs">vs</div>
							
							<div class="team">
								<div class="team-name">{game.awayTeam}</div>
								<div class="team-record">({game.awayRecord})</div>
								<div class="team-score">{game.awayScore}</div>
							</div>
						</div>

						<div class="betting-lines">
							<div class="line">
								<span class="line-label">Spread</span>
								<span class="line-value">{game.spread} ({game.spreadOdds})</span>
							</div>
							<div class="line">
								<span class="line-label">Total</span>
								<span class="line-value">O {game.total} ({game.totalOdds})</span>
							</div>
							<div class="line">
								<span class="line-label">Moneyline</span>
								<span class="line-value">{game.moneyline}</span>
							</div>
						</div>
					</div>
				{/each}
			{:else if activeTab === 'Upcoming'}
				{#each games.filter((game: any) => game.status === 'Upcoming') as game}
					<div class="game-card">
						<div class="game-header">
							<div class="game-time">
								<span class="time">{game.time}</span>
							</div>
							<div class="game-status">
								<span class="status-badge upcoming">UPCOMING</span>
							</div>
							<a href="/game/{game.id}" class="view-details">View Details</a>
						</div>
						
						<div class="game-content">
							<div class="team">
								<div class="team-name">{game.homeTeam}</div>
								<div class="team-record">({game.homeRecord})</div>
							</div>
							
							<div class="vs">vs</div>
							
							<div class="team">
								<div class="team-name">{game.awayTeam}</div>
								<div class="team-record">({game.awayRecord})</div>
							</div>
						</div>

						<div class="betting-lines">
							<div class="line">
								<span class="line-label">Spread</span>
								<span class="line-value">{game.spread} ({game.spreadOdds})</span>
							</div>
							<div class="line">
								<span class="line-label">Total</span>
								<span class="line-value">O {game.total} ({game.totalOdds})</span>
							</div>
							<div class="line">
								<span class="line-label">Moneyline</span>
								<span class="line-value">{game.moneyline}</span>
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<div class="no-games">
					<p>No completed games found.</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Player Props Section -->
	<div class="player-props-section">
		<div class="section-header">
			<h2>Featured Player Props</h2>
			<a href="/player-props" class="view-all">View All</a>
		</div>

		<div class="player-props-grid">
			{#each playerProps as player}
				<div class="player-prop-card">
					<div class="player-info">
						<div class="player-name">{player.playerName}</div>
						<div class="player-team">{player.team}</div>
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
		</div>
	</div>
</div>

<style>
	.homepage {
		padding: 1rem 1.5rem;
		background-color: #f8fafc;
		min-height: calc(100vh - 64px);
	}

	/* Stats Section */
	.stats-section {
		margin-top: 1.5rem;
		margin-bottom: 2rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.stat-card {
		background: white;
		border-radius: 0.5rem;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
	}

	.stat-icon {
		width: 48px;
		height: 48px;
		border-radius: 0.375rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-icon.green {
		background: #22c55e;
		color: white;
	}

	.stat-icon.orange {
		background: #f59e0b;
		color: white;
	}

	.stat-icon.yellow {
		background: #eab308;
		color: white;
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: 1.875rem;
		font-weight: 700;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.stat-value.green {
		color: #22c55e;
	}

	.stat-value.orange {
		color: #f59e0b;
	}

	.stat-value.yellow {
		color: #eab308;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #64748b;
		font-weight: 500;
	}

	/* Games Section */
	.games-section {
		background: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
		margin-bottom: 2rem;
		overflow: hidden;
	}

	.section-header {
		padding: 1.5rem 1.5rem 0 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0;
	}

	.date-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.date-info .day {
		font-size: 0.875rem;
		font-weight: 500;
		color: #22c55e;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.date-info .date {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 400;
	}

	.date-info .time {
		font-size: 0.875rem;
		color: #1e293b;
		font-weight: 600;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
	}

	.view-all {
		color: #22c55e;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.tabs {
		display: flex;
		padding: 0 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		margin-top: 1rem;
	}

	.tab {
		padding: 1rem 1.5rem;
		background: none;
		border: none;
		color: #64748b;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s ease;
	}

	.tab:hover {
		color: #1e293b;
	}

	.tab.active {
		color: #22c55e;
		border-bottom-color: #22c55e;
	}

	.games-list {
		display: flex;
		flex-direction: column;
	}

	.game-card {
		padding: 1.5rem;
		border-bottom: 1px solid #f1f5f9;
	}

	.game-card:last-child {
		border-bottom: none;
	}

	.game-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.game-time {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.time {
		font-size: 0.875rem;
		color: #64748b;
	}

	.quarter {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.live {
		background: #fef3c7;
		color: #92400e;
	}

	.status-badge.upcoming {
		background: #fed7aa;
		color: #9a3412;
	}

	.view-details {
		color: #22c55e;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.game-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.team {
		text-align: center;
		flex: 1;
	}

	.team-name {
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 0.25rem;
	}

	.team-record {
		font-size: 0.875rem;
		color: #64748b;
		margin-bottom: 0.5rem;
	}

	.team-score {
		font-size: 1.875rem;
		font-weight: 700;
		color: #22c55e;
	}

	.vs {
		font-size: 0.875rem;
		color: #64748b;
		margin: 0 1rem;
	}

	.betting-lines {
		display: flex;
		gap: 2rem;
		justify-content: center;
	}

	.line {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-align: center;
	}

	.line-label {
		font-size: 0.75rem;
		color: #64748b;
		text-transform: uppercase;
		font-weight: 500;
	}

	.line-value {
		font-size: 0.875rem;
		color: #22c55e;
		font-weight: 500;
	}

	.no-games {
		padding: 2rem;
		text-align: center;
		color: #64748b;
	}

	/* Player Props Section */
	.player-props-section {
		background: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
		overflow: hidden;
	}

	.player-props-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		padding: 1.5rem;
	}

	.player-prop-card {
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.player-info {
		margin-bottom: 1rem;
	}

	.player-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 0.25rem;
	}

	.player-team {
		font-size: 0.875rem;
		color: #22c55e;
		font-weight: 500;
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
		color: #1e293b;
	}

	.prop-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.prop-button {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		background: white;
		color: #1e293b;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.prop-button.over {
		background: #22c55e;
		color: white;
		border-color: #22c55e;
	}

	.prop-button:hover:not(.over) {
		background: #f8fafc;
	}

	.odds {
		font-size: 0.75rem;
		opacity: 0.8;
	}

	/* Responsive Design */
	@media (max-width: 1200px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.player-props-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.homepage {
			padding: 0.75rem;
		}
		
		.stats-grid {
			grid-template-columns: 1fr;
		}
		
		.game-content {
			flex-direction: column;
			gap: 1rem;
		}
		
		.betting-lines {
			flex-direction: column;
			gap: 1rem;
		}
	}
</style>