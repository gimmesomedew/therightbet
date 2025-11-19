<script lang="ts">
	let awayTeam = $state('');
	let homeTeam = $state('');
	
	// Spread inputs
	let spreadLine = $state<number | null>(null);
	let spreadAwayOdds = $state('');
	let spreadHomeOdds = $state('');
	
	// Total inputs
	let totalLine = $state<number | null>(null);
	let totalOverOdds = $state('');
	let totalUnderOdds = $state('');
	
	// Moneyline inputs
	let moneylineAwayOdds = $state('');
	let moneylineHomeOdds = $state('');

	function calculateBreakevenPercentage(odds: string | null): number | null {
		if (!odds || odds.trim() === '') return null;
		
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

	function calculateHold(odds1: string | null, odds2: string | null): number | null {
		const prob1 = calculateBreakevenPercentage(odds1);
		const prob2 = calculateBreakevenPercentage(odds2);
		
		if (prob1 === null || prob2 === null) return null;
		
		// Hold = (sum of probabilities - 1) × 100%
		const totalProbability = prob1 + prob2;
		return (totalProbability - 1) * 100;
	}

	function formatHold(odds1: string | null, odds2: string | null): string {
		const hold = calculateHold(odds1, odds2);
		if (hold === null) return '—';
		return `${hold.toFixed(2)}%`;
	}

	function formatBreakevenPercentage(odds: string | null): string {
		const percentage = calculateBreakevenPercentage(odds);
		if (percentage === null) return '—';
		return `${(percentage * 100).toFixed(1)}%`;
	}

	function formatSpreadLine(line: number | null): string {
		if (line === null) return '—';
		return line > 0 ? `+${line}` : `${line}`;
	}

	const spreadHold = $derived(calculateHold(spreadAwayOdds, spreadHomeOdds));
	const totalHold = $derived(calculateHold(totalOverOdds, totalUnderOdds));
	const moneylineHold = $derived(calculateHold(moneylineAwayOdds, moneylineHomeOdds));

	function clearForm() {
		awayTeam = '';
		homeTeam = '';
		spreadLine = null;
		spreadAwayOdds = '';
		spreadHomeOdds = '';
		totalLine = null;
		totalOverOdds = '';
		totalUnderOdds = '';
		moneylineAwayOdds = '';
		moneylineHomeOdds = '';
	}
</script>

<div class="hold-calculator-page">
	<div class="page-header">
		<div>
			<h1>Hold Calculator</h1>
			<p class="subtitle">Calculate the bookmaker's hold (vig/juice) for any betting market</p>
		</div>
	</div>

	<div class="calculator-container">
		<div class="form-section">
			<h2>Game Information</h2>
			<div class="form-grid">
				<div class="form-group">
					<label for="away-team">Away Team</label>
					<input
						type="text"
						id="away-team"
						bind:value={awayTeam}
						placeholder="e.g., Lakers"
					/>
				</div>
				<div class="form-group">
					<label for="home-team">Home Team</label>
					<input
						type="text"
						id="home-team"
						bind:value={homeTeam}
						placeholder="e.g., Warriors"
					/>
				</div>
			</div>
		</div>

		<div class="form-section">
			<h2>Point Spread</h2>
			<div class="form-grid">
				<div class="form-group">
					<label for="spread-line">Spread Line</label>
					<input
						type="number"
						id="spread-line"
						bind:value={spreadLine}
						placeholder="e.g., -7"
						step="0.5"
					/>
				</div>
				<div class="form-group">
					<label for="spread-away-odds">Away Team Odds</label>
					<input
						type="text"
						id="spread-away-odds"
						bind:value={spreadAwayOdds}
						placeholder="e.g., -110"
					/>
				</div>
				<div class="form-group">
					<label for="spread-home-odds">Home Team Odds</label>
					<input
						type="text"
						id="spread-home-odds"
						bind:value={spreadHomeOdds}
						placeholder="e.g., -110"
					/>
				</div>
			</div>
			{#if spreadHold !== null}
				<div class="result-card">
					<div class="result-header">
						<span class="result-label">Spread Hold</span>
						<span class="hold-value">{spreadHold.toFixed(2)}%</span>
					</div>
					<div class="result-details">
						<div class="detail-row">
							<span>Away ({awayTeam || 'Away'}):</span>
							<span>{formatBreakevenPercentage(spreadAwayOdds)}</span>
						</div>
						<div class="detail-row">
							<span>Home ({homeTeam || 'Home'}):</span>
							<span>{formatBreakevenPercentage(spreadHomeOdds)}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="form-section">
			<h2>Total (Over/Under)</h2>
			<div class="form-grid">
				<div class="form-group">
					<label for="total-line">Total Line</label>
					<input
						type="number"
						id="total-line"
						bind:value={totalLine}
						placeholder="e.g., 220.5"
						step="0.5"
					/>
				</div>
				<div class="form-group">
					<label for="total-over-odds">Over Odds</label>
					<input
						type="text"
						id="total-over-odds"
						bind:value={totalOverOdds}
						placeholder="e.g., -110"
					/>
				</div>
				<div class="form-group">
					<label for="total-under-odds">Under Odds</label>
					<input
						type="text"
						id="total-under-odds"
						bind:value={totalUnderOdds}
						placeholder="e.g., -110"
					/>
				</div>
			</div>
			{#if totalHold !== null}
				<div class="result-card">
					<div class="result-header">
						<span class="result-label">Total Hold</span>
						<span class="hold-value">{totalHold.toFixed(2)}%</span>
					</div>
					<div class="result-details">
						<div class="detail-row">
							<span>Over:</span>
							<span>{formatBreakevenPercentage(totalOverOdds)}</span>
						</div>
						<div class="detail-row">
							<span>Under:</span>
							<span>{formatBreakevenPercentage(totalUnderOdds)}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="form-section">
			<h2>Moneyline</h2>
			<div class="form-grid">
				<div class="form-group">
					<label for="moneyline-away-odds">Away Team Odds</label>
					<input
						type="text"
						id="moneyline-away-odds"
						bind:value={moneylineAwayOdds}
						placeholder="e.g., +150"
					/>
				</div>
				<div class="form-group">
					<label for="moneyline-home-odds">Home Team Odds</label>
					<input
						type="text"
						id="moneyline-home-odds"
						bind:value={moneylineHomeOdds}
						placeholder="e.g., -150"
					/>
				</div>
			</div>
			{#if moneylineHold !== null}
				<div class="result-card">
					<div class="result-header">
						<span class="result-label">Moneyline Hold</span>
						<span class="hold-value">{moneylineHold.toFixed(2)}%</span>
					</div>
					<div class="result-details">
						<div class="detail-row">
							<span>{awayTeam || 'Away'} Team:</span>
							<span>{formatBreakevenPercentage(moneylineAwayOdds)}</span>
						</div>
						<div class="detail-row">
							<span>{homeTeam || 'Home'} Team:</span>
							<span>{formatBreakevenPercentage(moneylineHomeOdds)}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="form-actions">
			<button type="button" onclick={clearForm} class="btn-secondary">Clear All</button>
		</div>

		{#if spreadHold !== null || totalHold !== null || moneylineHold !== null}
			<div class="summary-card">
				<h3>Summary</h3>
				<div class="summary-grid">
					{#if spreadHold !== null}
						<div class="summary-item">
							<span class="summary-label">Spread Hold</span>
							<span class="summary-value">{spreadHold.toFixed(2)}%</span>
						</div>
					{/if}
					{#if totalHold !== null}
						<div class="summary-item">
							<span class="summary-label">Total Hold</span>
							<span class="summary-value">{totalHold.toFixed(2)}%</span>
						</div>
					{/if}
					{#if moneylineHold !== null}
						<div class="summary-item">
							<span class="summary-label">Moneyline Hold</span>
							<span class="summary-value">{moneylineHold.toFixed(2)}%</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.hold-calculator-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
		padding: var(--spacing-xl);
		max-width: 900px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: var(--spacing-lg);
	}

	.page-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 var(--spacing-xs) 0;
	}

	.subtitle {
		color: var(--color-text-secondary);
		font-size: 1rem;
		margin: 0;
	}

	.calculator-container {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
	}

	.form-section {
		background: white;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		box-shadow: var(--shadow-sm);
	}

	.form-section h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 var(--spacing-md) 0;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.form-group input {
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.result-card {
		margin-top: var(--spacing-md);
		padding: var(--spacing-md);
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: var(--radius-md);
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-sm);
	}

	.result-label {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.hold-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #dc2626;
	}

	.result-details {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
		padding-top: var(--spacing-sm);
		border-top: 1px solid rgba(59, 130, 246, 0.2);
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.form-actions {
		display: flex;
		justify-content: center;
		gap: var(--spacing-md);
	}

	.btn-secondary {
		padding: var(--spacing-sm) var(--spacing-lg);
		background: white;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-secondary:hover {
		background: var(--color-background-secondary);
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.summary-card {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		margin-top: var(--spacing-md);
	}

	.summary-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 var(--spacing-md) 0;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-md);
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		padding: var(--spacing-md);
		background: white;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.summary-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.summary-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #dc2626;
	}

	@media (max-width: 768px) {
		.hold-calculator-page {
			padding: var(--spacing-lg);
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

