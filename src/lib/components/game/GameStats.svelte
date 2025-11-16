<script lang="ts">
	interface Game {
		id: string;
		homeTeam: any;
		awayTeam: any;
		status: string;
	}

	const { game } = $props<{ game: Game }>();

	// Mock stats data - will be replaced with real API data
	const teamStats = {
		home: {
			pointsPerGame: 87.2,
			pointsAllowed: 82.1,
			fieldGoalPercentage: 45.8,
			threePointPercentage: 34.2,
			reboundsPerGame: 38.5,
			assistsPerGame: 22.1,
			turnoversPerGame: 14.3,
			stealsPerGame: 8.2,
			blocksPerGame: 4.1
		},
		away: {
			pointsPerGame: 84.6,
			pointsAllowed: 85.3,
			fieldGoalPercentage: 44.1,
			threePointPercentage: 32.8,
			reboundsPerGame: 36.8,
			assistsPerGame: 20.8,
			turnoversPerGame: 15.1,
			stealsPerGame: 7.9,
			blocksPerGame: 3.8
		}
	};

	const recentGames = {
		home: [
			{ opponent: 'CHI', result: 'W', score: '89-76' },
			{ opponent: 'PHX', result: 'W', score: '92-88' },
			{ opponent: 'MIN', result: 'W', score: '85-79' },
			{ opponent: 'ATL', result: 'L', score: '78-82' },
			{ opponent: 'NY', result: 'W', score: '91-85' }
		],
		away: [
			{ opponent: 'LV', result: 'L', score: '76-89' },
			{ opponent: 'LA', result: 'W', score: '88-84' },
			{ opponent: 'DAL', result: 'W', score: '79-75' },
			{ opponent: 'IND', result: 'L', score: '82-78' },
			{ opponent: 'CONN', result: 'W', score: '85-79' }
		]
	};

	function getStatAdvantage(home: number, away: number): 'home' | 'away' | 'tie' {
		if (home > away) return 'home';
		if (away > home) return 'away';
		return 'tie';
	}

	function formatPercentage(value: number): string {
		return `${value.toFixed(1)}%`;
	}

	function formatDecimal(value: number): string {
		return value.toFixed(1);
	}
</script>

<div class="game-stats">
	<div class="stats-header">
		<h2>Team Statistics</h2>
		<div class="stats-subtitle">Season averages and recent form</div>
	</div>

	<!-- Season Stats Comparison -->
	<div class="stats-section">
		<h3>Season Averages</h3>
		<div class="stats-grid">
			<div class="stat-row">
				<div class="stat-label">Points Per Game</div>
				<div class="stat-values">
					<div class="stat-value away" class:advantage={getStatAdvantage(teamStats.home.pointsPerGame, teamStats.away.pointsPerGame) === 'away'}>
						{formatDecimal(teamStats.away.pointsPerGame)}
					</div>
					<div class="stat-value home" class:advantage={getStatAdvantage(teamStats.home.pointsPerGame, teamStats.away.pointsPerGame) === 'home'}>
						{formatDecimal(teamStats.home.pointsPerGame)}
					</div>
				</div>
			</div>

			<div class="stat-row">
				<div class="stat-label">Points Allowed</div>
				<div class="stat-values">
					<div class="stat-value away" class:advantage={getStatAdvantage(teamStats.home.pointsAllowed, teamStats.away.pointsAllowed) === 'away'}>
						{formatDecimal(teamStats.away.pointsAllowed)}
					</div>
					<div class="stat-value home" class:advantage={getStatAdvantage(teamStats.home.pointsAllowed, teamStats.away.pointsAllowed) === 'home'}>
						{formatDecimal(teamStats.home.pointsAllowed)}
					</div>
				</div>
			</div>

			<div class="stat-row">
				<div class="stat-label">Field Goal %</div>
				<div class="stat-values">
					<div class="stat-value away" class:advantage={getStatAdvantage(teamStats.home.fieldGoalPercentage, teamStats.away.fieldGoalPercentage) === 'away'}>
						{formatPercentage(teamStats.away.fieldGoalPercentage)}
					</div>
					<div class="stat-value home" class:advantage={getStatAdvantage(teamStats.home.fieldGoalPercentage, teamStats.away.fieldGoalPercentage) === 'home'}>
						{formatPercentage(teamStats.home.fieldGoalPercentage)}
					</div>
				</div>
			</div>

			<div class="stat-row">
				<div class="stat-label">3-Point %</div>
				<div class="stat-values">
					<div class="stat-value away" class:advantage={getStatAdvantage(teamStats.home.threePointPercentage, teamStats.away.threePointPercentage) === 'away'}>
						{formatPercentage(teamStats.away.threePointPercentage)}
					</div>
					<div class="stat-value home" class:advantage={getStatAdvantage(teamStats.home.threePointPercentage, teamStats.away.threePointPercentage) === 'home'}>
						{formatPercentage(teamStats.home.threePointPercentage)}
					</div>
				</div>
			</div>

			<div class="stat-row">
				<div class="stat-label">Rebounds</div>
				<div class="stat-values">
					<div class="stat-value away" class:advantage={getStatAdvantage(teamStats.home.reboundsPerGame, teamStats.away.reboundsPerGame) === 'away'}>
						{formatDecimal(teamStats.away.reboundsPerGame)}
					</div>
					<div class="stat-value home" class:advantage={getStatAdvantage(teamStats.home.reboundsPerGame, teamStats.away.reboundsPerGame) === 'home'}>
						{formatDecimal(teamStats.home.reboundsPerGame)}
					</div>
				</div>
			</div>

			<div class="stat-row">
				<div class="stat-label">Assists</div>
				<div class="stat-values">
					<div class="stat-value away" class:advantage={getStatAdvantage(teamStats.home.assistsPerGame, teamStats.away.assistsPerGame) === 'away'}>
						{formatDecimal(teamStats.away.assistsPerGame)}
					</div>
					<div class="stat-value home" class:advantage={getStatAdvantage(teamStats.home.assistsPerGame, teamStats.away.assistsPerGame) === 'home'}>
						{formatDecimal(teamStats.home.assistsPerGame)}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Games -->
	<div class="stats-section">
		<h3>Recent Form (Last 5 Games)</h3>
		<div class="recent-games">
			<div class="team-recent">
				<div class="team-label">{game.awayTeam.abbreviation}</div>
				<div class="games-list">
					{#each recentGames.away as game_result}
						<div class="game-result" class:win={game_result.result === 'W'} class:loss={game_result.result === 'L'}>
							<span class="result">{game_result.result}</span>
							<span class="opponent">{game_result.opponent}</span>
							<span class="score">{game_result.score}</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="team-recent">
				<div class="team-label">{game.homeTeam.abbreviation}</div>
				<div class="games-list">
					{#each recentGames.home as game_result}
						<div class="game-result" class:win={game_result.result === 'W'} class:loss={game_result.result === 'L'}>
							<span class="result">{game_result.result}</span>
							<span class="opponent">{game_result.opponent}</span>
							<span class="score">{game_result.score}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.game-stats {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		padding: 1.5rem;
	}

	.stats-header {
		margin-bottom: 1.5rem;
	}

	.stats-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.stats-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.stats-section {
		margin-bottom: 2rem;
	}

	.stats-section:last-child {
		margin-bottom: 0;
	}

	.stats-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
	}

	.stats-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stat-row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		padding: 0.75rem;
		background: #f8fafc;
		border-radius: var(--radius-md);
	}

	.stat-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.stat-values {
		display: flex;
		gap: 1rem;
	}

	.stat-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		min-width: 50px;
		text-align: center;
	}

	.stat-value.advantage {
		color: var(--color-primary);
		background: rgba(34, 197, 94, 0.1);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	.recent-games {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.team-recent {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.team-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.75rem;
		text-align: center;
	}

	.games-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.game-result {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: white;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
	}

	.game-result.win {
		border-left: 3px solid var(--color-primary);
	}

	.game-result.loss {
		border-left: 3px solid #ef4444;
	}

	.result {
		font-weight: 700;
		min-width: 20px;
	}

	.game-result.win .result {
		color: var(--color-primary);
	}

	.game-result.loss .result {
		color: #ef4444;
	}

	.opponent {
		flex: 1;
		color: var(--color-text-secondary);
	}

	.score {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	@media (max-width: 768px) {
		.game-stats {
			padding: 1rem;
		}

		.recent-games {
			grid-template-columns: 1fr;
		}

		.stat-values {
			gap: 0.5rem;
		}

		.stat-value {
			min-width: 40px;
		}
	}
</style>
