<script lang="ts">
	interface Game {
		id: string;
		homeTeam: {
			id: string;
			name: string;
			abbreviation: string;
			logo: string;
			record: string;
			conference: string;
			streak: string;
		};
		awayTeam: {
			id: string;
			name: string;
			abbreviation: string;
			logo: string;
			record: string;
			conference: string;
			streak: string;
		};
		gameTime: string;
		status: string;
		venue: string;
		location: string;
		season: string;
		week: string;
		weather?: any;
		officials: string[];
	}

	const { game } = $props<{ game: Game }>();

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
		switch (status) {
			case 'live':
				return 'var(--color-accent)';
			case 'completed':
				return 'var(--color-text-secondary)';
			case 'upcoming':
				return 'var(--color-primary)';
			default:
				return 'var(--color-text-secondary)';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'live':
				return 'LIVE';
			case 'completed':
				return 'FINAL';
			case 'upcoming':
				return 'UPCOMING';
			default:
				return status.toUpperCase();
		}
	}
</script>

<div class="game-header">
	<div class="game-header-content">
		<!-- Game Status & Time -->
		<div class="game-meta">
			<div class="game-status" style="color: {getStatusColor(game.status)}">
				{#if game.status === 'live'}
					<div class="live-indicator"></div>
				{/if}
				{getStatusText(game.status)}
			</div>
			<div class="game-time">{formatGameTime(game.gameTime)}</div>
			<div class="game-venue">{game.venue}, {game.location}</div>
		</div>

		<!-- Teams Matchup -->
		<div class="teams-matchup">
			<!-- Away Team -->
			<div class="team away-team">
				<div class="team-logo">
					<img src={game.awayTeam.logo} alt="{game.awayTeam.name} logo" />
				</div>
				<div class="team-info">
					<div class="team-name">{game.awayTeam.name}</div>
					<div class="team-record">{game.awayTeam.record} • {game.awayTeam.conference}</div>
					<div class="team-streak">Streak: {game.awayTeam.streak}</div>
				</div>
			</div>

			<!-- VS -->
			<div class="vs-section">
				<div class="vs-text">VS</div>
				<div class="game-week">{game.week}</div>
			</div>

			<!-- Home Team -->
			<div class="team home-team">
				<div class="team-info">
					<div class="team-name">{game.homeTeam.name}</div>
					<div class="team-record">{game.homeTeam.record} • {game.homeTeam.conference}</div>
					<div class="team-streak">Streak: {game.homeTeam.streak}</div>
				</div>
				<div class="team-logo">
					<img src={game.homeTeam.logo} alt="{game.homeTeam.name} logo" />
				</div>
			</div>
		</div>

		<!-- Game Details -->
		<div class="game-details">
			<div class="detail-item">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
					<circle cx="12" cy="10" r="3"></circle>
				</svg>
				<span>{game.venue}</span>
			</div>
			<div class="detail-item">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.53L12 17.27l-5.18 2.46L8 14.14l-5-4.87 6.91-1.01L12 2z"></path>
				</svg>
				<span>{game.season} Season</span>
			</div>
			{#if game.weather}
				<div class="detail-item">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
					</svg>
					<span>{game.weather.temperature}°F, {game.weather.condition}</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.game-header {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		overflow: hidden;
	}

	.game-header-content {
		padding: 1.5rem;
	}

	.game-meta {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.game-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.live-indicator {
		width: 8px;
		height: 8px;
		background-color: var(--color-accent);
		border-radius: 50%;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.game-time {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.game-venue {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.teams-matchup {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 2rem;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.team {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.away-team {
		justify-content: flex-end;
		text-align: right;
	}

	.home-team {
		justify-content: flex-start;
		text-align: left;
	}

	.team-logo {
		width: 60px;
		height: 60px;
		flex-shrink: 0;
	}

	.team-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.team-info {
		flex: 1;
	}

	.team-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.team-record {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.team-streak {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.vs-section {
		text-align: center;
	}

	.vs-text {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-primary);
		margin-bottom: 0.5rem;
	}

	.game-week {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.game-details {
		display: flex;
		justify-content: center;
		gap: 2rem;
		flex-wrap: wrap;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.detail-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.detail-item svg {
		color: var(--color-text-muted);
	}

	@media (max-width: 768px) {
		.game-header-content {
			padding: 1rem;
		}

		.teams-matchup {
			grid-template-columns: 1fr;
			gap: 1rem;
			text-align: center;
		}

		.away-team,
		.home-team {
			justify-content: center;
			text-align: center;
		}

		.vs-section {
			order: -1;
		}

		.game-details {
			gap: 1rem;
		}
	}
</style>
