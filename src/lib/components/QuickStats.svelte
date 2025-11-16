<script lang="ts">
	// Mock data - will be replaced with real data from API
	const stats = [
		{
			label: "Today's Games",
			value: '8',
			icon: 'calendar',
			iconColor: 'green',
			valueColor: 'green'
		},
		{
			label: 'Active Bets',
			value: '12',
			icon: 'activity',
			iconColor: 'orange',
			valueColor: 'orange'
		},
		{
			label: 'Win Rate',
			value: '67%',
			icon: 'trophy',
			iconColor: 'yellow',
			valueColor: 'yellow'
		},
		{
			label: 'Profit/Loss',
			value: '+$1,247',
			icon: 'dollar-sign',
			iconColor: 'green',
			valueColor: 'green'
		}
	];
	
	function getIconPath(iconName: string): string {
		const icons: Record<string, string> = {
			calendar: 'M8 2v3 M16 2v3 M3.5 9.09h17M21 8.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2V8.5a2 2 0 012-2h14a2 2 0 012 2z',
			activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
			trophy: 'M6 9H4.5A2.5 2.5 0 012 6.5v-1A2.5 2.5 0 014.5 3H6M18 9h1.5A2.5 2.5 0 0022 6.5v-1A2.5 2.5 0 0019.5 3H18M6 9v6a2 2 0 002 2h8a2 2 0 002-2V9M6 9H4.5A2.5 2.5 0 012 6.5v-1A2.5 2.5 0 014.5 3H6M18 9h1.5A2.5 2.5 0 0022 6.5v-1A2.5 2.5 0 0019.5 3H18',
			'dollar-sign': 'M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'
		};
		return icons[iconName] || icons.calendar;
	}
</script>

<div class="quick-stats">
	{#each stats as stat}
		<div class="stat-card">
			<div class="stat-icon" class:green={stat.iconColor === 'green'} class:orange={stat.iconColor === 'orange'} class:yellow={stat.iconColor === 'yellow'}>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d={getIconPath(stat.icon)} />
				</svg>
			</div>
			
			<div class="stat-content">
				<div class="stat-value" class:green={stat.valueColor === 'green'} class:orange={stat.valueColor === 'orange'} class:yellow={stat.valueColor === 'yellow'}>{stat.value}</div>
				<div class="stat-label">{stat.label}</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.quick-stats {
		display: contents;
	}
	
	.stat-card {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		padding: var(--spacing-lg);
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		transition: all 0.2s ease;
	}
	
	.stat-card:hover {
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}
	
	.stat-icon {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	
	.stat-icon.green {
		background: var(--color-primary);
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
		min-width: 0;
	}
	
	.stat-value {
		font-size: var(--font-size-3xl);
		font-weight: 700;
		line-height: 1;
		margin-bottom: var(--spacing-xs);
	}
	
	.stat-value.green {
		color: var(--color-primary);
	}
	
	.stat-value.orange {
		color: #f59e0b;
	}
	
	.stat-value.yellow {
		color: #eab308;
	}
	
	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-weight: 500;
	}
	
	@media (max-width: 768px) {
		.stat-card {
			padding: var(--spacing-md);
		}
		
		.stat-icon {
			width: 40px;
			height: 40px;
		}
		
		.stat-value {
			font-size: var(--font-size-2xl);
		}
	}
</style>
