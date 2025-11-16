<script lang="ts">
	interface Game {
		id: string;
		homeTeam: any;
		awayTeam: any;
		status: string;
	}

	const { game } = $props<{ game: Game }>();

	// Mock analysis data - will be replaced with real API data
	const analysis = {
		overall: {
			homeAdvantage: 78,
					awayAdvantage: 22,
			confidence: 'high'
		},
		offense: {
			home: 85,
			away: 72
		},
		defense: {
			home: 88,
			away: 75
		},
		pace: {
			home: 82,
			away: 78
		},
		clutch: {
			home: 90,
			away: 65
		}
	};

	const factors = [
		{
			category: 'Home Court',
			impact: 'high',
			description: 'Las Vegas has the best home record in the league at 15-2',
			advantage: 'home',
			weight: 25
		},
		{
			category: 'Recent Form',
			impact: 'high',
			description: 'Aces on 3-game win streak, Storm lost last game',
			advantage: 'home',
			weight: 20
		},
		{
			category: 'Head-to-Head',
			impact: 'medium',
			description: 'Las Vegas won 2 of 3 meetings this season',
			advantage: 'home',
			weight: 15
		},
		{
			category: 'Injury Report',
			impact: 'medium',
			description: 'Seattle missing key bench player',
			advantage: 'home',
			weight: 10
		},
		{
			category: 'Rest Advantage',
			impact: 'low',
			description: 'Both teams on 1 day rest',
			advantage: 'tie',
			weight: 5
		}
	];

	const predictions = [
		{
			metric: 'Final Score',
			prediction: 'Las Vegas 89, Seattle 82',
			confidence: 78
		},
		{
			metric: 'Total Points',
			prediction: 'Over 169.5',
			confidence: 72
		},
		{
			metric: 'Margin of Victory',
			prediction: 'Las Vegas by 7+ points',
			confidence: 68
		},
		{
			metric: 'Key Player',
			prediction: 'A\'ja Wilson 25+ points',
			confidence: 85
		}
	];

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

	function getConfidenceColor(confidence: number): string {
		if (confidence >= 80) return 'var(--color-primary)';
		if (confidence >= 60) return 'var(--color-accent)';
		return '#ef4444';
	}
</script>

<div class="game-analysis">
	<div class="analysis-header">
		<h2>Game Analysis</h2>
		<div class="analysis-subtitle">Comprehensive breakdown and predictions</div>
	</div>

	<!-- Overall Advantage -->
	<div class="advantage-section">
		<h3>Overall Advantage</h3>
		<div class="advantage-display">
			<div class="advantage-bar">
				<div class="advantage-fill home" style="width: {analysis.overall.homeAdvantage}%">
					<span class="advantage-label">{game.homeTeam.abbreviation} {analysis.overall.homeAdvantage}%</span>
				</div>
				<div class="advantage-fill away" style="width: {analysis.overall.awayAdvantage}%">
					<span class="advantage-label">{game.awayTeam.abbreviation} {analysis.overall.awayAdvantage}%</span>
				</div>
			</div>
			<div class="confidence-indicator">
				<span class="confidence-label">Confidence:</span>
				<span class="confidence-value" style="color: {getImpactColor(analysis.overall.confidence)}">
					{analysis.overall.confidence}
				</span>
			</div>
		</div>
	</div>

	<!-- Team Ratings -->
	<div class="ratings-section">
		<h3>Team Ratings</h3>
		<div class="ratings-grid">
			<div class="rating-category">
				<div class="category-label">Offense</div>
				<div class="rating-bars">
					<div class="rating-bar">
						<div class="rating-label">{game.awayTeam.abbreviation}</div>
						<div class="rating-fill" style="width: {analysis.offense.away}%"></div>
						<div class="rating-value">{analysis.offense.away}</div>
					</div>
					<div class="rating-bar">
						<div class="rating-label">{game.homeTeam.abbreviation}</div>
						<div class="rating-fill" style="width: {analysis.offense.home}%"></div>
						<div class="rating-value">{analysis.offense.home}</div>
					</div>
				</div>
			</div>

			<div class="rating-category">
				<div class="category-label">Defense</div>
				<div class="rating-bars">
					<div class="rating-bar">
						<div class="rating-label">{game.awayTeam.abbreviation}</div>
						<div class="rating-fill" style="width: {analysis.defense.away}%"></div>
						<div class="rating-value">{analysis.defense.away}</div>
					</div>
					<div class="rating-bar">
						<div class="rating-label">{game.homeTeam.abbreviation}</div>
						<div class="rating-fill" style="width: {analysis.defense.home}%"></div>
						<div class="rating-value">{analysis.defense.home}</div>
					</div>
				</div>
			</div>

			<div class="rating-category">
				<div class="category-label">Pace</div>
				<div class="rating-bars">
					<div class="rating-bar">
						<div class="rating-label">{game.awayTeam.abbreviation}</div>
						<div class="rating-fill" style="width: {analysis.pace.away}%"></div>
						<div class="rating-value">{analysis.pace.away}</div>
					</div>
					<div class="rating-bar">
						<div class="rating-label">{game.homeTeam.abbreviation}</div>
						<div class="rating-fill" style="width: {analysis.pace.home}%"></div>
						<div class="rating-value">{analysis.pace.home}</div>
					</div>
				</div>
			</div>

			<div class="rating-category">
				<div class="category-label">Clutch</div>
				<div class="rating-bars">
					<div class="rating-bar">
						<div class="rating-label">{game.awayTeam.abbreviation}</div>
						<div class="rating-fill" style="width: {analysis.clutch.away}%"></div>
						<div class="rating-value">{analysis.clutch.away}</div>
					</div>
					<div class="rating-bar">
						<div class="rating-label">{game.homeTeam.abbreviation}</div>
						<div class="rating-fill" style="width: {analysis.clutch.home}%"></div>
						<div class="rating-value">{analysis.clutch.home}</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Key Factors -->
	<div class="factors-section">
		<h3>Key Factors</h3>
		<div class="factors-list">
			{#each factors as factor}
				<div class="factor-item">
					<div class="factor-header">
						<div class="factor-category">{factor.category}</div>
						<div class="factor-impact" style="color: {getImpactColor(factor.impact)}">
							{factor.impact} impact
						</div>
						<div class="factor-weight">{factor.weight}%</div>
					</div>
					<div class="factor-description">{factor.description}</div>
					<div class="factor-advantage">
						<span class="advantage-label">Advantage:</span>
						<span class="advantage-value" style="color: {getAdvantageColor(factor.advantage)}">
							{factor.advantage === 'home' ? game.homeTeam.abbreviation : 
							 factor.advantage === 'away' ? game.awayTeam.abbreviation : 'Even'}
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Predictions -->
	<div class="predictions-section">
		<h3>AI Predictions</h3>
		<div class="predictions-list">
			{#each predictions as prediction}
				<div class="prediction-item">
					<div class="prediction-header">
						<div class="prediction-metric">{prediction.metric}</div>
						<div class="prediction-confidence" style="color: {getConfidenceColor(prediction.confidence)}">
							{prediction.confidence}%
						</div>
					</div>
					<div class="prediction-value">{prediction.prediction}</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.game-analysis {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		padding: 1.5rem;
	}

	.analysis-header {
		margin-bottom: 1.5rem;
	}

	.analysis-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.analysis-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.advantage-section,
	.ratings-section,
	.factors-section,
	.predictions-section {
		margin-bottom: 2rem;
	}

	.advantage-section:last-child,
	.ratings-section:last-child,
	.factors-section:last-child,
	.predictions-section:last-child {
		margin-bottom: 0;
	}

	.advantage-section h3,
	.ratings-section h3,
	.factors-section h3,
	.predictions-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
	}

	.advantage-display {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1.5rem;
	}

	.advantage-bar {
		position: relative;
		height: 40px;
		background: #e5e7eb;
		border-radius: var(--radius-md);
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.advantage-fill {
		position: absolute;
		top: 0;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
		color: white;
	}

	.advantage-fill.home {
		left: 0;
		background: var(--color-primary);
	}

	.advantage-fill.away {
		right: 0;
		background: #ef4444;
	}

	.advantage-label {
		z-index: 1;
	}

	.confidence-indicator {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
	}

	.confidence-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.confidence-value {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.ratings-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.rating-category {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.category-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.75rem;
		text-align: center;
	}

	.rating-bars {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rating-bar {
		position: relative;
		height: 24px;
		background: #e5e7eb;
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.rating-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: var(--color-primary);
		transition: width 0.3s ease;
	}

	.rating-label {
		position: absolute;
		left: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
		z-index: 1;
	}

	.rating-value {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
		z-index: 1;
	}

	.factors-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.factor-item {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
		border-left: 4px solid var(--color-primary);
	}

	.factor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.factor-category {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.factor-impact {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.factor-weight {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.factor-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.75rem;
		line-height: 1.4;
	}

	.factor-advantage {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.advantage-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.advantage-value {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.predictions-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.prediction-item {
		background: #f8fafc;
		border-radius: var(--radius-md);
		padding: 1rem;
		border-left: 4px solid var(--color-accent);
	}

	.prediction-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.prediction-metric {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.prediction-confidence {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.prediction-value {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.game-analysis {
			padding: 1rem;
		}

		.ratings-grid {
			grid-template-columns: 1fr;
		}

		.factor-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.prediction-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}
	}
</style>
