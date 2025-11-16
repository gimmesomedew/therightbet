<script lang="ts">
	interface Game {
		id: string;
		homeTeam: any;
		awayTeam: any;
		status: string;
	}

	const { game } = $props<{ game: Game }>();

	// Mock player matchup data - will be replaced with real API data
	const matchups = [
		{
			position: 'PG',
			away: {
				name: 'Jewell Loyd',
				number: '24',
				stats: {
					points: 19.2,
					assists: 3.8,
					rebounds: 3.4,
					fieldGoal: 42.1
				},
				recentForm: 'hot'
			},
			home: {
				name: 'Chelsea Gray',
				number: '12',
				stats: {
					points: 14.8,
					assists: 6.2,
					rebounds: 3.1,
					fieldGoal: 45.3
				},
				recentForm: 'average'
			},
			advantage: 'away'
		},
		{
			position: 'SG',
			away: {
				name: 'Sami Whitcomb',
				number: '32',
				stats: {
					points: 8.4,
					assists: 2.1,
					rebounds: 2.8,
					fieldGoal: 38.7
				},
				recentForm: 'cold'
			},
			home: {
				name: 'Kelsey Plum',
				number: '10',
				stats: {
					points: 20.1,
					assists: 4.8,
					rebounds: 2.9,
					fieldGoal: 46.2
				},
				recentForm: 'hot'
			},
			advantage: 'home'
		},
		{
			position: 'SF',
			away: {
				name: 'Ezi Magbegor',
				number: '13',
				stats: {
					points: 13.8,
					assists: 1.4,
					rebounds: 8.2,
					fieldGoal: 52.1
				},
				recentForm: 'average'
			},
			home: {
				name: 'Jackie Young',
				number: '0',
				stats: {
					points: 17.9,
					assists: 3.8,
					rebounds: 4.1,
					fieldGoal: 44.8
				},
				recentForm: 'hot'
			},
			advantage: 'home'
		},
		{
			position: 'PF',
			away: {
				name: 'Mercedes Russell',
				number: '21',
				stats: {
					points: 6.2,
					assists: 1.1,
					rebounds: 5.8,
					fieldGoal: 48.3
				},
				recentForm: 'average'
			},
			home: {
				name: 'A\'ja Wilson',
				number: '22',
				stats: {
					points: 22.8,
					assists: 2.2,
					rebounds: 9.4,
					fieldGoal: 50.1
				},
				recentForm: 'hot'
			},
			advantage: 'home'
		},
		{
			position: 'C',
			away: {
				name: 'Dulcy Fankam Mendjiadeu',
				number: '15',
				stats: {
					points: 4.1,
					assists: 0.8,
					rebounds: 3.2,
					fieldGoal: 45.2
				},
				recentForm: 'cold'
			},
			home: {
				name: 'Kiah Stokes',
				number: '41',
				stats: {
					points: 2.8,
					assists: 0.9,
					rebounds: 4.6,
					fieldGoal: 42.1
				},
				recentForm: 'average'
			},
			advantage: 'tie'
		}
	];

	const keyMatchups = [
		{
			title: 'Scoring Battle',
			description: 'Kelsey Plum vs Jewell Loyd - Two elite scorers going head-to-head',
			impact: 'high',
			leaning: 'home'
		},
		{
			title: 'Paint Dominance',
			description: 'A\'ja Wilson\'s inside presence vs Seattle\'s frontcourt',
			impact: 'high',
			leaning: 'home'
		},
		{
			title: 'Three-Point Shooting',
			description: 'Both teams rely heavily on perimeter scoring',
			impact: 'medium',
			leaning: 'away'
		}
	];

	function getFormColor(form: string): string {
		switch (form) {
			case 'hot':
				return 'var(--color-primary)';
			case 'cold':
				return '#ef4444';
			case 'average':
				return 'var(--color-accent)';
			default:
				return 'var(--color-text-secondary)';
		}
	}

	function getFormIcon(form: string): string {
		switch (form) {
			case 'hot':
				return '🔥';
			case 'cold':
				return '❄️';
			case 'average':
				return '➡️';
			default:
				return '📊';
		}
	}

	function getAdvantageColor(advantage: string): string {
		switch (advantage) {
			case 'home':
				return 'var(--color-primary)';
			case 'away':
				return '#ef4444';
			case 'tie':
				return 'var(--color-text-secondary)';
			default:
				return 'var(--color-text-secondary)';
		}
	}

	function getImpactColor(impact: string): string {
		switch (impact) {
			case 'high':
				return 'var(--color-primary)';
			case 'medium':
				return 'var(--color-accent)';
			case 'low':
				return 'var(--color-text-secondary)';
			default:
				return 'var(--color-text-secondary)';
		}
	}
</script>

<div class="player-matchups">
	<div class="matchups-header">
		<h2>Player Matchups</h2>
		<div class="matchups-subtitle">Key individual battles and form analysis</div>
	</div>

	<!-- Starting Lineups -->
	<div class="lineups-section">
		<h3>Starting Lineups</h3>
		<div class="matchups-grid">
			{#each matchups as matchup}
				<div class="matchup-row">
					<div class="position-label">{matchup.position}</div>
					
					<!-- Away Player -->
					<div class="player-card away" class:advantage={matchup.advantage === 'away'}>
						<div class="player-header">
							<div class="player-number">#{matchup.away.number}</div>
							<div class="player-name">{matchup.away.name}</div>
							<div class="player-form" style="color: {getFormColor(matchup.away.recentForm)}">
								{getFormIcon(matchup.away.recentForm)}
							</div>
						</div>
						<div class="player-stats">
							<div class="stat">
								<span class="stat-label">PTS</span>
								<span class="stat-value">{matchup.away.stats.points}</span>
							</div>
							<div class="stat">
								<span class="stat-label">AST</span>
								<span class="stat-value">{matchup.away.stats.assists}</span>
							</div>
							<div class="stat">
								<span class="stat-label">REB</span>
								<span class="stat-value">{matchup.away.stats.rebounds}</span>
							</div>
							<div class="stat">
								<span class="stat-label">FG%</span>
								<span class="stat-value">{matchup.away.stats.fieldGoal}%</span>
							</div>
						</div>
					</div>

					<!-- VS -->
					<div class="vs-indicator">VS</div>

					<!-- Home Player -->
					<div class="player-card home" class:advantage={matchup.advantage === 'home'}>
						<div class="player-header">
							<div class="player-number">#{matchup.home.number}</div>
							<div class="player-name">{matchup.home.name}</div>
							<div class="player-form" style="color: {getFormColor(matchup.home.recentForm)}">
								{getFormIcon(matchup.home.recentForm)}
							</div>
						</div>
						<div class="player-stats">
							<div class="stat">
								<span class="stat-label">PTS</span>
								<span class="stat-value">{matchup.home.stats.points}</span>
							</div>
							<div class="stat">
								<span class="stat-label">AST</span>
								<span class="stat-value">{matchup.home.stats.assists}</span>
							</div>
							<div class="stat">
								<span class="stat-label">REB</span>
								<span class="stat-value">{matchup.home.stats.rebounds}</span>
							</div>
							<div class="stat">
								<span class="stat-label">FG%</span>
								<span class="stat-value">{matchup.home.stats.fieldGoal}%</span>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Key Matchups -->
	<div class="key-matchups-section">
		<h3>Key Matchups to Watch</h3>
		<div class="key-matchups-list">
			{#each keyMatchups as keyMatchup}
				<div class="key-matchup-item">
					<div class="matchup-header">
						<div class="matchup-title">{keyMatchup.title}</div>
						<div class="matchup-impact" style="color: {getImpactColor(keyMatchup.impact)}">
							{keyMatchup.impact} impact
						</div>
					</div>
					<div class="matchup-description">{keyMatchup.description}</div>
					<div class="matchup-leaning">
						<span class="leaning-label">Leaning:</span>
						<span class="leaning-value" style="color: {getAdvantageColor(keyMatchup.leaning)}">
							{keyMatchup.leaning === 'home' ? game.homeTeam.abbreviation : 
							 keyMatchup.leaning === 'away' ? game.awayTeam.abbreviation : 'Even'}
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.player-matchups {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		padding: 1.5rem;
	}

	.matchups-header {
		margin-bottom: 1.5rem;
	}

	.matchups-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.matchups-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.lineups-section,
	.key-matchups-section {
		margin-bottom: 2rem;
	}

	.lineups-section:last-child,
	.key-matchups-section:last-child {
		margin-bottom: 0;
	}

	.lineups-section h3,
	.key-matchups-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
	}

	.matchups-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.matchup-row {
		display: grid;
		grid-template-columns: auto 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.position-label {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-text-primary);
		background: var(--color-primary);
		color: white;
		padding: 0.5rem;
		border-radius: var(--radius-sm);
		text-align: center;
		min-width: 40px;
	}

	.player-card {
		background: white;
		border-radius: var(--radius-md);
		padding: 1rem;
		border: 2px solid transparent;
		transition: border-color 0.2s ease;
	}

	.player-card.advantage {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.1);
	}

	.player-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.player-number {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		background: #f1f5f9;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	.player-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		flex: 1;
	}

	.player-form {
		font-size: 1rem;
	}

	.player-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.stat {
		text-align: center;
	}

	.stat-label {
		display: block;
		font-size: 0.625rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}

	.stat-value {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.vs-indicator {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-text-secondary);
		text-align: center;
	}

	.key-matchups-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.key-matchup-item {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
		border-left: 4px solid var(--color-primary);
	}

	.matchup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.matchup-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.matchup-impact {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.matchup-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.75rem;
		line-height: 1.4;
	}

	.matchup-leaning {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.leaning-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.leaning-value {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 768px) {
		.player-matchups {
			padding: 1rem;
		}

		.matchup-row {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.position-label {
			justify-self: center;
		}

		.vs-indicator {
			order: -1;
		}

		.player-stats {
			grid-template-columns: repeat(2, 1fr);
		}

		.matchup-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}
	}
</style>
