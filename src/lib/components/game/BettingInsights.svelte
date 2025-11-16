<script lang="ts">
	interface Game {
		id: string;
		homeTeam: any;
		awayTeam: any;
		status: string;
	}

	const { game } = $props<{ game: Game }>();

	// Mock betting data - will be replaced with real API data
	const bettingData = {
		spread: {
			home: -4.5,
			away: +4.5,
			homeOdds: -110,
			awayOdds: -110
		},
		moneyline: {
			home: -180,
			away: +155
		},
		total: {
			over: 169.5,
			under: 169.5,
			overOdds: -110,
			underOdds: -110
		},
		trends: {
			homeATS: '7-3',
			awayATS: '4-6',
			homeOverUnder: '6-4',
			awayOverUnder: '5-5'
		}
	};

	const insights = [
		{
			type: 'trend',
			title: 'Home Court Advantage',
			description: 'Las Vegas is 15-2 at home this season, covering the spread in 12 of those games.',
			confidence: 'high',
			impact: 'positive'
		},
		{
			type: 'matchup',
			title: 'Defensive Mismatch',
			description: 'Seattle allows 85.3 PPG on the road vs LV scoring 87.2 PPG at home.',
			confidence: 'medium',
			impact: 'positive'
		},
		{
			type: 'injury',
			title: 'Key Player Status',
			description: 'Seattle\'s starting PG is questionable with ankle injury.',
			confidence: 'high',
			impact: 'negative'
		},
		{
			type: 'weather',
			title: 'Weather Impact',
			description: 'Indoor venue - no weather concerns for this matchup.',
			confidence: 'high',
			impact: 'neutral'
		}
	];

	const recommendations = [
		{
			bet: 'Las Vegas -4.5',
			type: 'spread',
			confidence: 85,
			reason: 'Strong home record and defensive advantage',
			value: 'high'
		},
		{
			bet: 'Over 169.5',
			type: 'total',
			confidence: 72,
			reason: 'Both teams trending over in recent games',
			value: 'medium'
		},
		{
			bet: 'Las Vegas ML',
			type: 'moneyline',
			confidence: 78,
			reason: 'Home court advantage and better recent form',
			value: 'medium'
		}
	];

	function formatOdds(odds: number): string {
		if (odds > 0) {
			return `+${odds}`;
		}
		return odds.toString();
	}

	function getConfidenceColor(confidence: string): string {
		switch (confidence) {
			case 'high':
				return 'var(--color-primary)';
			case 'medium':
				return 'var(--color-accent)';
			case 'low':
				return '#ef4444';
			default:
				return 'var(--color-text-secondary)';
		}
	}

	function getImpactIcon(impact: string): string {
		switch (impact) {
			case 'positive':
				return '📈';
			case 'negative':
				return '📉';
			case 'neutral':
				return '➡️';
			default:
				return '📊';
		}
	}

	function getValueColor(value: string): string {
		switch (value) {
			case 'high':
				return 'var(--color-primary)';
			case 'medium':
				return 'var(--color-accent)';
			case 'low':
				return '#ef4444';
			default:
				return 'var(--color-text-secondary)';
		}
	}
</script>

<div class="betting-insights">
	<div class="insights-header">
		<h2>Betting Insights</h2>
		<div class="insights-subtitle">Expert analysis and recommendations</div>
	</div>

	<!-- Current Lines -->
	<div class="lines-section">
		<h3>Current Lines</h3>
		<div class="lines-grid">
			<!-- Spread -->
			<div class="line-card">
				<div class="line-title">Point Spread</div>
				<div class="line-options">
					<div class="line-option">
						<div class="team">{game.awayTeam.abbreviation}</div>
						<div class="spread">{bettingData.spread.away > 0 ? '+' : ''}{bettingData.spread.away}</div>
						<div class="odds">{formatOdds(bettingData.spread.awayOdds)}</div>
					</div>
					<div class="line-option">
						<div class="team">{game.homeTeam.abbreviation}</div>
						<div class="spread">{bettingData.spread.home > 0 ? '+' : ''}{bettingData.spread.home}</div>
						<div class="odds">{formatOdds(bettingData.spread.homeOdds)}</div>
					</div>
				</div>
			</div>

			<!-- Moneyline -->
			<div class="line-card">
				<div class="line-title">Moneyline</div>
				<div class="line-options">
					<div class="line-option">
						<div class="team">{game.awayTeam.abbreviation}</div>
						<div class="odds">{formatOdds(bettingData.moneyline.away)}</div>
					</div>
					<div class="line-option">
						<div class="team">{game.homeTeam.abbreviation}</div>
						<div class="odds">{formatOdds(bettingData.moneyline.home)}</div>
					</div>
				</div>
			</div>

			<!-- Total -->
			<div class="line-card">
				<div class="line-title">Total Points</div>
				<div class="line-options">
					<div class="line-option">
						<div class="team">Over</div>
						<div class="total">{bettingData.total.over}</div>
						<div class="odds">{formatOdds(bettingData.total.overOdds)}</div>
					</div>
					<div class="line-option">
						<div class="team">Under</div>
						<div class="total">{bettingData.total.under}</div>
						<div class="odds">{formatOdds(bettingData.total.underOdds)}</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Betting Trends -->
	<div class="trends-section">
		<h3>ATS & O/U Trends</h3>
		<div class="trends-grid">
			<div class="trend-item">
				<div class="trend-label">{game.homeTeam.abbreviation} ATS</div>
				<div class="trend-value">{bettingData.trends.homeATS}</div>
			</div>
			<div class="trend-item">
				<div class="trend-label">{game.awayTeam.abbreviation} ATS</div>
				<div class="trend-value">{bettingData.trends.awayATS}</div>
			</div>
			<div class="trend-item">
				<div class="trend-label">{game.homeTeam.abbreviation} O/U</div>
				<div class="trend-value">{bettingData.trends.homeOverUnder}</div>
			</div>
			<div class="trend-item">
				<div class="trend-label">{game.awayTeam.abbreviation} O/U</div>
				<div class="trend-value">{bettingData.trends.awayOverUnder}</div>
			</div>
		</div>
	</div>

	<!-- Key Insights -->
	<div class="insights-section">
		<h3>Key Insights</h3>
		<div class="insights-list">
			{#each insights as insight}
				<div class="insight-item">
					<div class="insight-header">
						<span class="impact-icon">{getImpactIcon(insight.impact)}</span>
						<span class="insight-title">{insight.title}</span>
						<span class="confidence-badge" style="color: {getConfidenceColor(insight.confidence)}">
							{insight.confidence}
						</span>
					</div>
					<div class="insight-description">{insight.description}</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Recommendations -->
	<div class="recommendations-section">
		<h3>Expert Recommendations</h3>
		<div class="recommendations-list">
			{#each recommendations as rec}
				<div class="recommendation-item">
					<div class="rec-header">
						<div class="rec-bet">{rec.bet}</div>
						<div class="rec-confidence">
							<div class="confidence-bar">
								<div class="confidence-fill" style="width: {rec.confidence}%"></div>
							</div>
							<span class="confidence-text">{rec.confidence}%</span>
						</div>
					</div>
					<div class="rec-reason">{rec.reason}</div>
					<div class="rec-value" style="color: {getValueColor(rec.value)}">
						Value: {rec.value}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.betting-insights {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		padding: 1.5rem;
	}

	.insights-header {
		margin-bottom: 1.5rem;
	}

	.insights-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.insights-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.lines-section,
	.trends-section,
	.insights-section,
	.recommendations-section {
		margin-bottom: 2rem;
	}

	.lines-section:last-child,
	.trends-section:last-child,
	.insights-section:last-child,
	.recommendations-section:last-child {
		margin-bottom: 0;
	}

	.lines-section h3,
	.trends-section h3,
	.insights-section h3,
	.recommendations-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
	}

	.lines-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.line-card {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.line-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.75rem;
	}

	.line-options {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.line-option {
		flex: 1;
		text-align: center;
		padding: 0.75rem;
		background: white;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
	}

	.team {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.spread,
	.total {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.odds {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-primary);
	}

	.trends-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.trend-item {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 0.75rem;
		text-align: center;
	}

	.trend-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.trend-value {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.insights-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.insight-item {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.insight-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.impact-icon {
		font-size: 1rem;
	}

	.insight-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		flex: 1;
	}

	.confidence-badge {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.insight-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.recommendations-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.recommendation-item {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
		border-left: 4px solid var(--color-primary);
	}

	.rec-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.rec-bet {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.rec-confidence {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.confidence-bar {
		width: 60px;
		height: 6px;
		background: #e5e7eb;
		border-radius: 3px;
		overflow: hidden;
	}

	.confidence-fill {
		height: 100%;
		background: var(--color-primary);
		transition: width 0.3s ease;
	}

	.confidence-text {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.rec-reason {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.5rem;
	}

	.rec-value {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 768px) {
		.betting-insights {
			padding: 1rem;
		}

		.trends-grid {
			grid-template-columns: 1fr;
		}

		.line-options {
			flex-direction: column;
		}

		.rec-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
