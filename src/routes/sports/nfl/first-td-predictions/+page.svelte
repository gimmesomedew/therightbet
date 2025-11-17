<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let allPredictions = $state<Array<{
		teamAbbreviation: string;
		teamDisplayName: string;
		playerName: string;
		playerId: string;
		position: string | null;
		predictionScore: number;
		probabilityPercentage: number;
		firstTdFrequency: number | null;
		tdProbability: number | null;
	}>>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Any-time TD predictions
	let allAnyTimePredictions = $state<Array<{
		teamAbbreviation: string;
		teamDisplayName: string;
		playerName: string;
		playerId: string;
		position: string | null;
		probabilityPercentage: number;
		totalTouchdowns: number;
		gamesPlayed: number;
		weeksWithTouchdown: number;
	}>>([]);
	let loadingAnyTime = $state(true);

	// Position filter state - true means position is included, false means excluded
	let includeQB = $state(true);
	let includeRB = $state(true);
	let includeWR = $state(true);
	let includeTE = $state(true);
	let includeOther = $state(true); // For other positions like K, DEF, etc.

	// Position filters for any-time TD table
	let includeQBAnyTime = $state(true);
	let includeRBAnyTime = $state(true);
	let includeWRAnyTime = $state(true);
	let includeTEAnyTime = $state(true);
	let includeOtherAnyTime = $state(true);

	// Team filters
	let selectedTeam = $state('all');
	let selectedTeamAnyTime = $state('all');

	// Get unique teams for filter dropdowns
	let availableTeams = $derived(
		Array.from(new Set(allPredictions.map((p) => p.teamAbbreviation))).sort()
	);
	let availableTeamsAnyTime = $derived(
		Array.from(new Set(allAnyTimePredictions.map((p) => p.teamAbbreviation))).sort()
	);

	// Filtered predictions based on position and team filters
	let predictions = $derived(
		allPredictions.filter((pred) => {
			// Position filter
			const position = (pred.position || '').toUpperCase();
			let positionMatch = false;
			if (position === 'QB') positionMatch = includeQB;
			else if (position === 'RB' || position === 'FB') positionMatch = includeRB;
			else if (position === 'WR') positionMatch = includeWR;
			else if (position === 'TE') positionMatch = includeTE;
			else positionMatch = includeOther;

			// Team filter
			const teamMatch = selectedTeam === 'all' || pred.teamAbbreviation === selectedTeam;

			return positionMatch && teamMatch;
		})
	);

	// Filtered any-time TD predictions
	let anyTimePredictions = $derived(
		allAnyTimePredictions.filter((pred) => {
			// Position filter
			const position = (pred.position || '').toUpperCase();
			let positionMatch = false;
			if (position === 'QB') positionMatch = includeQBAnyTime;
			else if (position === 'RB' || position === 'FB') positionMatch = includeRBAnyTime;
			else if (position === 'WR') positionMatch = includeWRAnyTime;
			else if (position === 'TE') positionMatch = includeTEAnyTime;
			else positionMatch = includeOtherAnyTime;

			// Team filter
			const teamMatch = selectedTeamAnyTime === 'all' || pred.teamAbbreviation === selectedTeamAnyTime;

			return positionMatch && teamMatch;
		})
	);

	onMount(async () => {
		// Load first TD predictions
		try {
			const response = await fetch(
				`/api/nfl/first-td-predictions?season=${data.season}&seasonType=${data.seasonType}&week=${data.week}`
			);
			const result = await response.json();

			if (result.success) {
				allPredictions = result.data.sort((a: any, b: any) => 
					b.probabilityPercentage - a.probabilityPercentage
				);
			} else {
				error = result.error || 'Failed to load predictions';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}

		// Load any-time TD predictions
		try {
			const anyTimeResponse = await fetch(
				`/api/nfl/any-time-td-predictions?season=${data.season}&seasonType=${data.seasonType}&week=${data.week}`
			);
			const anyTimeResult = await anyTimeResponse.json();

			if (anyTimeResult.success) {
				allAnyTimePredictions = anyTimeResult.data.sort((a: any, b: any) => 
					b.probabilityPercentage - a.probabilityPercentage
				);
			}
		} catch (err) {
			console.error('Failed to load any-time TD predictions:', err);
		} finally {
			loadingAnyTime = false;
		}
	});

	function formatPercentage(value: number): string {
		return `${value.toFixed(1)}%`;
	}

	function exportToPDF(type: 'first-td' | 'any-time' | 'both') {
		// Create a new window for printing
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('Please allow pop-ups to export PDF');
			return;
		}

		const seasonLabel = data.seasonType === 'PRE' 
			? `Preseason ${data.season}` 
			: data.seasonType === 'POST' 
			? `Postseason ${data.season}` 
			: `Regular Season ${data.season}`;

		let htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<title>NFL Predictions - Week ${data.week}</title>
				<style>
					@page {
						size: letter;
						margin: 0.5in;
					}
					body {
						font-family: Arial, sans-serif;
						font-size: 10pt;
						color: #000;
						margin: 0;
						padding: 0;
					}
					.header {
						text-align: center;
						margin-bottom: 20px;
						border-bottom: 2px solid #000;
						padding-bottom: 10px;
					}
					.header h1 {
						margin: 0 0 5px 0;
						font-size: 18pt;
					}
					.header p {
						margin: 0;
						font-size: 10pt;
					}
					.section {
						margin-bottom: 30px;
						page-break-inside: avoid;
					}
					.section-title {
						font-size: 14pt;
						font-weight: bold;
						margin-bottom: 10px;
						border-bottom: 1px solid #ccc;
						padding-bottom: 5px;
					}
					table {
						width: 100%;
						border-collapse: collapse;
						margin-bottom: 15px;
						font-size: 9pt;
					}
					th {
						background-color: #f0f0f0;
						border: 1px solid #000;
						padding: 6px;
						text-align: left;
						font-weight: bold;
					}
					td {
						border: 1px solid #ccc;
						padding: 5px;
					}
					.team-cell {
						font-weight: bold;
					}
					.probability {
						text-align: right;
					}
					.number {
						text-align: center;
					}
					.footer {
						margin-top: 30px;
						padding-top: 10px;
						border-top: 1px solid #ccc;
						font-size: 8pt;
						color: #666;
						text-align: center;
					}
				</style>
			</head>
			<body>
				<div class="header">
					<h1>NFL Touchdown Predictions</h1>
					<p>Week ${data.week} - ${seasonLabel}</p>
					<p>Generated: ${new Date().toLocaleString()}</p>
				</div>
		`;

		if (type === 'first-td' || type === 'both') {
			htmlContent += `
				<div class="section">
					<div class="section-title">First Touchdown Scorer Predictions</div>
					<table>
						<thead>
							<tr>
								<th>Team</th>
								<th>Player</th>
								<th>Position</th>
								<th>Probability</th>
								<th>First TD Freq</th>
								<th>TD Probability</th>
							</tr>
						</thead>
						<tbody>
			`;
			
			predictions.forEach(pred => {
				htmlContent += `
					<tr>
						<td class="team-cell">${pred.teamDisplayName} (${pred.teamAbbreviation})</td>
						<td>${pred.playerName}</td>
						<td class="number">${pred.position || '—'}</td>
						<td class="probability">${formatPercentage(pred.probabilityPercentage)}</td>
						<td class="probability">${pred.firstTdFrequency !== null ? formatPercentage(pred.firstTdFrequency) : '—'}</td>
						<td class="probability">${pred.tdProbability !== null ? formatPercentage(pred.tdProbability) : '—'}</td>
					</tr>
				`;
			});
			
			htmlContent += `
						</tbody>
					</table>
				</div>
			`;
		}

		if (type === 'any-time' || type === 'both') {
			htmlContent += `
				<div class="section">
					<div class="section-title">Any-Time Touchdown Predictions</div>
					<table>
						<thead>
							<tr>
								<th>Team</th>
								<th>Player</th>
								<th>Position</th>
								<th>Probability</th>
								<th>Total TDs</th>
								<th>Games Played</th>
								<th>Weeks w/ TD</th>
							</tr>
						</thead>
						<tbody>
			`;
			
			anyTimePredictions.forEach(pred => {
				htmlContent += `
					<tr>
						<td class="team-cell">${pred.teamDisplayName} (${pred.teamAbbreviation})</td>
						<td>${pred.playerName}</td>
						<td class="number">${pred.position || '—'}</td>
						<td class="probability">${formatPercentage(pred.probabilityPercentage)}</td>
						<td class="number">${pred.totalTouchdowns}</td>
						<td class="number">${pred.gamesPlayed}</td>
						<td class="number">${pred.weeksWithTouchdown}</td>
					</tr>
				`;
			});
			
			htmlContent += `
						</tbody>
					</table>
				</div>
			`;
		}

		htmlContent += `
				<div class="footer">
					<p>TheRightBet - NFL Predictions Report</p>
				</div>
			</body>
			</html>
		`;

		printWindow.document.write(htmlContent);
		printWindow.document.close();
		
		// Wait for content to load, then trigger print
		setTimeout(() => {
			printWindow.print();
		}, 250);
	}
</script>

<div class="predictions-page">
	<header class="page-header">
		<div>
			<h1>First Touchdown Scorer Predictions</h1>
			<p>
				Predictions for <strong>Week {data.week}</strong> based on historical first TD trends and touchdown probability.
			</p>
		</div>
		<div class="header-actions">
			<div class="meta">
				<span class="season-label">
					{#if data.seasonType === 'PRE'}
						Preseason {data.season}
					{:else if data.seasonType === 'POST'}
						Postseason {data.season}
					{:else}
						Regular Season {data.season}
					{/if}
				</span>
			</div>
			<div class="export-buttons">
				<button class="export-btn" on:click={() => exportToPDF('first-td')} title="Export First TD Predictions">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="7 10 12 15 17 10"></polyline>
						<line x1="12" y1="15" x2="12" y2="3"></line>
					</svg>
					Export First TD
				</button>
				{#if allAnyTimePredictions.length > 0}
					<button class="export-btn" on:click={() => exportToPDF('any-time')} title="Export Any-Time TD Predictions">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="7 10 12 15 17 10"></polyline>
							<line x1="12" y1="15" x2="12" y2="3"></line>
						</svg>
						Export Any-Time TD
					</button>
					<button class="export-btn export-btn-primary" on:click={() => exportToPDF('both')} title="Export Both Tables">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="7 10 12 15 17 10"></polyline>
							<line x1="12" y1="15" x2="12" y2="3"></line>
						</svg>
						Export All
					</button>
				{/if}
			</div>
		</div>
	</header>

	<section class="filters-section">
		<h2>Filters</h2>
		<div class="filters-grid">
			<div class="filter-group">
				<label for="team-filter" class="filter-label">Team</label>
				<select id="team-filter" bind:value={selectedTeam} class="team-select">
					<option value="all">All Teams</option>
					{#each availableTeams as team}
						<option value={team}>{team}</option>
					{/each}
				</select>
			</div>
			<div class="filter-group">
				<label class="filter-label">Position</label>
				<div class="position-filters">
					<label class="filter-toggle">
						<input type="checkbox" bind:checked={includeQB} />
						<span class="toggle-label">
							<span class="toggle-indicator"></span>
							<span class="toggle-text">QB</span>
						</span>
					</label>
					<label class="filter-toggle">
						<input type="checkbox" bind:checked={includeRB} />
						<span class="toggle-label">
							<span class="toggle-indicator"></span>
							<span class="toggle-text">RB</span>
						</span>
					</label>
					<label class="filter-toggle">
						<input type="checkbox" bind:checked={includeWR} />
						<span class="toggle-label">
							<span class="toggle-indicator"></span>
							<span class="toggle-text">WR</span>
						</span>
					</label>
					<label class="filter-toggle">
						<input type="checkbox" bind:checked={includeTE} />
						<span class="toggle-label">
							<span class="toggle-indicator"></span>
							<span class="toggle-text">TE</span>
						</span>
					</label>
					<label class="filter-toggle">
						<input type="checkbox" bind:checked={includeOther} />
						<span class="toggle-label">
							<span class="toggle-indicator"></span>
							<span class="toggle-text">Other</span>
						</span>
					</label>
				</div>
			</div>
		</div>
		<div class="filter-info">
			<span class="results-count">
				Showing {predictions.length} of {allPredictions.length} predictions
			</span>
		</div>
	</section>

	{#if loading}
		<div class="loading-state">
			<div class="spinner" aria-hidden="true"></div>
			<span>Calculating predictions…</span>
		</div>
	{:else if error}
		<div class="error-state">
			<h2>Error</h2>
			<p>{error}</p>
		</div>
	{:else if predictions.length === 0}
		<div class="empty-state">
			<h2>No predictions available</h2>
			<p>Insufficient data to generate predictions for this week.</p>
		</div>
	{:else}
		<div class="table-container">
			<table class="predictions-table">
				<thead>
					<tr>
						<th>Team</th>
						<th>Predicted Scorer</th>
						<th>Position</th>
						<th>Probability</th>
						<th>First TD Freq</th>
						<th>TD Probability</th>
					</tr>
				</thead>
				<tbody>
					{#each predictions as pred}
						<tr>
							<td class="team-cell">
								<strong>{pred.teamDisplayName}</strong>
								<span class="team-abbr">({pred.teamAbbreviation})</span>
							</td>
							<td class="player-name">{pred.playerName}</td>
							<td class="position">{pred.position || '—'}</td>
							<td class="probability">
								<span class="probability-value">{formatPercentage(pred.probabilityPercentage)}</span>
								<div class="probability-bar">
									<div
										class="probability-fill"
										style="width: {pred.probabilityPercentage}%"
									></div>
								</div>
							</td>
							<td class="number">
								{pred.firstTdFrequency !== null ? formatPercentage(pred.firstTdFrequency) : '—'}
							</td>
							<td class="number">
								{pred.tdProbability !== null ? formatPercentage(pred.tdProbability) : '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if !loadingAnyTime && allAnyTimePredictions.length > 0}
		<section class="any-time-section">
			<h2>Any-Time Touchdown Predictions</h2>
			<p class="section-description">
				Predictions for players most likely to score a touchdown at any point during Week {data.week} games.
			</p>

			<section class="filters-section">
				<h3>Filters</h3>
				<div class="filters-grid">
					<div class="filter-group">
						<label for="team-filter-anytime" class="filter-label">Team</label>
						<select id="team-filter-anytime" bind:value={selectedTeamAnyTime} class="team-select">
							<option value="all">All Teams</option>
							{#each availableTeamsAnyTime as team}
								<option value={team}>{team}</option>
							{/each}
						</select>
					</div>
					<div class="filter-group">
						<label class="filter-label">Position</label>
						<div class="position-filters">
							<label class="filter-toggle">
								<input type="checkbox" bind:checked={includeQBAnyTime} />
								<span class="toggle-label">
									<span class="toggle-indicator"></span>
									<span class="toggle-text">QB</span>
								</span>
							</label>
							<label class="filter-toggle">
								<input type="checkbox" bind:checked={includeRBAnyTime} />
								<span class="toggle-label">
									<span class="toggle-indicator"></span>
									<span class="toggle-text">RB</span>
								</span>
							</label>
							<label class="filter-toggle">
								<input type="checkbox" bind:checked={includeWRAnyTime} />
								<span class="toggle-label">
									<span class="toggle-indicator"></span>
									<span class="toggle-text">WR</span>
								</span>
							</label>
							<label class="filter-toggle">
								<input type="checkbox" bind:checked={includeTEAnyTime} />
								<span class="toggle-label">
									<span class="toggle-indicator"></span>
									<span class="toggle-text">TE</span>
								</span>
							</label>
							<label class="filter-toggle">
								<input type="checkbox" bind:checked={includeOtherAnyTime} />
								<span class="toggle-label">
									<span class="toggle-indicator"></span>
									<span class="toggle-text">Other</span>
								</span>
							</label>
						</div>
					</div>
				</div>
				<div class="filter-info">
					<span class="results-count">
						Showing {anyTimePredictions.length} of {allAnyTimePredictions.length} predictions
					</span>
				</div>
			</section>

			{#if anyTimePredictions.length === 0}
				<div class="empty-state">
					<p>No predictions match the selected filters.</p>
				</div>
			{:else}
				<div class="table-container">
					<table class="predictions-table">
						<thead>
							<tr>
								<th>Team</th>
								<th>Predicted Scorer</th>
								<th>Position</th>
								<th>Probability</th>
								<th>Total TDs</th>
								<th>Games Played</th>
								<th>Weeks w/ TD</th>
							</tr>
						</thead>
						<tbody>
							{#each anyTimePredictions as pred}
								<tr>
									<td class="team-cell">
										<strong>{pred.teamDisplayName}</strong>
										<span class="team-abbr">({pred.teamAbbreviation})</span>
									</td>
									<td class="player-name">{pred.playerName}</td>
									<td class="position">{pred.position || '—'}</td>
									<td class="probability">
										<span class="probability-value">{formatPercentage(pred.probabilityPercentage)}</span>
										<div class="probability-bar">
											<div
												class="probability-fill"
												style="width: {pred.probabilityPercentage}%"
											></div>
										</div>
									</td>
									<td class="number">{pred.totalTouchdowns}</td>
									<td class="number">{pred.gamesPlayed}</td>
									<td class="number">{pred.weeksWithTouchdown}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.predictions-page {
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

	.page-header h1 {
		margin: 0 0 var(--spacing-xs);
		color: var(--color-text-primary);
		font-size: 2rem;
	}

	.page-header p {
		margin: 0;
		color: var(--color-text-secondary);
	}

	.header-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--spacing-md);
		margin-top: var(--spacing-sm);
	}

	.meta {
		display: flex;
		gap: var(--spacing-md);
	}

	.export-buttons {
		display: flex;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.export-btn {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		background: white;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.export-btn:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.export-btn-primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.export-btn-primary:hover {
		background: var(--color-primary-dark, #1e40af);
		border-color: var(--color-primary-dark, #1e40af);
	}

	.export-btn svg {
		width: 16px;
		height: 16px;
	}

	.season-label {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.filters-section {
		background: white;
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.filters-section h2 {
		margin: 0 0 var(--spacing-md);
		color: var(--color-text-primary);
		font-size: 1.25rem;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--spacing-lg);
		align-items: start;
		margin-bottom: var(--spacing-md);
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.filter-label {
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 0.875rem;
	}

	.team-select {
		padding: var(--spacing-sm) var(--spacing-md);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		background: white;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: border-color 0.2s;
		min-width: 150px;
	}

	.team-select:hover {
		border-color: var(--color-primary);
	}

	.team-select:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 59, 130, 246), 0.1);
	}

	.position-filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}

	.filter-toggle {
		display: flex;
		align-items: center;
		cursor: pointer;
		user-select: none;
	}

	.filter-toggle input[type="checkbox"] {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
		transition: all 0.2s;
	}

	.filter-toggle input[type="checkbox"]:checked + .toggle-label {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.filter-toggle input[type="checkbox"]:not(:checked) + .toggle-label {
		background: var(--color-background);
		border-color: var(--color-border);
		color: var(--color-text-primary);
	}

	.filter-toggle input[type="checkbox"]:not(:checked) + .toggle-label:hover {
		background: var(--color-background-secondary);
		border-color: var(--color-primary);
	}

	.toggle-indicator {
		width: 16px;
		height: 16px;
		border: 2px solid currentColor;
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.filter-toggle input[type="checkbox"]:checked + .toggle-label .toggle-indicator {
		background: white;
		border-color: white;
	}

	.filter-toggle input[type="checkbox"]:checked + .toggle-label .toggle-indicator::after {
		content: '✓';
		color: var(--color-primary);
		font-size: 12px;
		font-weight: bold;
	}

	.toggle-text {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.filter-info {
		margin-top: var(--spacing-md);
		padding-top: var(--spacing-md);
		border-top: 1px solid var(--color-border);
	}

	.results-count {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.any-time-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.any-time-section h2 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 1.75rem;
	}

	.section-description {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.any-time-section .filters-section {
		margin-top: 0;
	}

	.any-time-section .filters-section h3 {
		margin: 0 0 var(--spacing-md);
		color: var(--color-text-primary);
		font-size: 1rem;
		font-weight: 600;
	}

	.loading-state,
	.error-state,
	.empty-state {
		background: white;
		padding: var(--spacing-2xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		text-align: center;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
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

	.table-container {
		background: white;
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow-x: auto;
		position: relative;
	}

	.predictions-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		min-width: 800px;
	}

	.predictions-table thead {
		background: var(--color-background-secondary);
		border-bottom: 2px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.predictions-table th {
		padding: var(--spacing-md);
		text-align: left;
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		height: 60px;
		min-height: 60px;
		max-height: 60px;
		vertical-align: middle;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		box-sizing: border-box;
	}

	/* Freeze first column only */
	.predictions-table th:nth-child(1),
	.predictions-table td:nth-child(1) {
		position: sticky;
		left: 0;
		z-index: 5;
		background: var(--color-background-secondary);
		box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
	}

	.predictions-table th:nth-child(1) {
		z-index: 15;
		background: var(--color-background-secondary);
	}

	.predictions-table td:nth-child(1) {
		background: white;
	}

	.predictions-table tbody tr:hover td:nth-child(1) {
		background: var(--color-background-secondary);
	}

	.predictions-table td {
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
		background: white;
	}

	.predictions-table tbody tr:hover {
		background: var(--color-background-secondary);
	}

	.team-cell {
		font-weight: 500;
		min-width: 180px;
		width: 180px;
	}

	.team-abbr {
		color: var(--color-text-secondary);
		font-weight: normal;
		margin-left: var(--spacing-xs);
	}

	.player-name {
		font-weight: 500;
		color: var(--color-text-primary);
		min-width: 200px;
		width: 200px;
	}

	.position {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.number {
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.probability {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		min-width: 150px;
	}

	.probability-value {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		min-width: 50px;
		color: var(--color-primary);
	}

	.probability-bar {
		flex: 1;
		height: 10px;
		background: var(--color-background-secondary);
		border-radius: 5px;
		overflow: hidden;
	}

	.probability-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
		border-radius: 5px;
		transition: width 0.3s ease;
	}

	@media (max-width: 768px) {
		.predictions-page {
			padding: var(--spacing-md);
		}

		.table-container {
			padding: var(--spacing-md);
		}

		.predictions-table {
			font-size: 0.875rem;
			min-width: 700px;
		}

		.predictions-table th {
			height: 60px;
			min-height: 60px;
			padding: var(--spacing-sm);
		}

		.predictions-table td {
			padding: var(--spacing-sm);
		}

		.team-cell {
			min-width: 150px;
			width: 150px;
		}

		.player-name {
			min-width: 160px;
			width: 160px;
		}
	}
</style>

