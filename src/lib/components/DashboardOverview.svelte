<script lang="ts">
	// Mock data - will be replaced with real data from API
	const recentActivity = [
		{
			id: '1',
			type: 'bet',
			description: 'Las Vegas Aces -4.5',
			amount: '$50',
			result: 'win',
			time: '2 hours ago'
		},
		{
			id: '2',
			type: 'bet',
			description: 'Over 150.5 Total Points',
			amount: '$25',
			result: 'loss',
			time: '4 hours ago'
		},
		{
			id: '3',
			type: 'analysis',
			description: 'Viewed Seattle Storm analysis',
			amount: null,
			result: null,
			time: '6 hours ago'
		},
		{
			id: '4',
			type: 'bet',
			description: 'Minnesota Lynx +2.5',
			amount: '$75',
			result: 'pending',
			time: '1 day ago'
		}
	];
	
	const topPerformers = [
		{
			player: 'A\'ja Wilson',
			team: 'Las Vegas Aces',
			stat: 'Points',
			value: '28.5',
			trend: 'up'
		},
		{
			player: 'Breanna Stewart',
			team: 'Seattle Storm',
			stat: 'Rebounds',
			value: '12.3',
			trend: 'up'
		},
		{
			player: 'Courtney Williams',
			team: 'Chicago Sky',
			stat: 'Assists',
			value: '8.7',
			trend: 'down'
		}
	];
	
	function getActivityIcon(type: string): string {
		const icons: Record<string, string> = {
			bet: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
			analysis: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
		};
		return icons[type] || icons.bet;
	}
	
	function getResultClass(result: string | null): string {
		if (!result) return '';
		switch (result) {
			case 'win':
				return 'result-win';
			case 'loss':
				return 'result-loss';
			case 'pending':
				return 'result-pending';
			default:
				return '';
		}
	}
</script>

<div class="dashboard-overview">
	<!-- Recent Activity -->
	<div class="overview-section">
		<div class="section-header">
			<h3>Recent Activity</h3>
			<a href="/history" class="view-all">View All</a>
		</div>
		
		<div class="activity-list">
			{#each recentActivity as activity}
				<div class="activity-item">
					<div class="activity-icon">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d={getActivityIcon(activity.type)} />
						</svg>
					</div>
					
					<div class="activity-content">
						<div class="activity-description">{activity.description}</div>
						<div class="activity-meta">
							{#if activity.amount}
								<span class="activity-amount">{activity.amount}</span>
							{/if}
							{#if activity.result}
								<span class="activity-result" class:result-win={activity.result === 'win'} class:result-loss={activity.result === 'loss'} class:result-pending={activity.result === 'pending'}>
									{activity.result}
								</span>
							{/if}
							<span class="activity-time">{activity.time}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
	
	<!-- Top Performers -->
	<div class="overview-section">
		<div class="section-header">
			<h3>Top Performers</h3>
			<a href="/players" class="view-all">View All</a>
		</div>
		
		<div class="performers-list">
			{#each topPerformers as performer}
				<div class="performer-item">
					<div class="performer-info">
						<div class="performer-name">{performer.player}</div>
						<div class="performer-team">{performer.team}</div>
					</div>
					
					<div class="performer-stats">
						<div class="stat-name">{performer.stat}</div>
						<div class="stat-value">
							{performer.value}
							<span class="stat-trend" class:trend-up={performer.trend === 'up'} class:trend-down={performer.trend === 'down'}>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									{#if performer.trend === 'up'}
										<polyline points="18,15 12,9 6,15"></polyline>
									{:else}
										<polyline points="6,9 12,15 18,9"></polyline>
									{/if}
								</svg>
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
	
	<!-- Quick Actions -->
	<div class="overview-section">
		<div class="section-header">
			<h3>Quick Actions</h3>
		</div>
		
		<div class="quick-actions">
			<button class="quick-action-btn">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				<span>View Analytics</span>
			</button>
			
			<button class="quick-action-btn">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
				</svg>
				<span>Add to Watchlist</span>
			</button>
			
			<button class="quick-action-btn">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				<span>AI Insights</span>
			</button>
		</div>
	</div>
</div>

<style>
	.dashboard-overview {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
	}
	
	.overview-section {
		background: white;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}
	
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg);
		border-bottom: 1px solid #e5e7eb;
	}
	
	.section-header h3 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}
	
	.view-all {
		font-size: var(--font-size-sm);
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 500;
	}
	
	.view-all:hover {
		text-decoration: underline;
	}
	
	.activity-list {
		padding: var(--spacing-md);
	}
	
	.activity-item {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		transition: background-color 0.2s ease;
	}
	
	.activity-item:hover {
		background-color: #f8fafc;
	}
	
	.activity-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #f0fdf4;
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	
	.activity-content {
		flex: 1;
		min-width: 0;
	}
	
	.activity-description {
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		margin-bottom: var(--spacing-xs);
	}
	
	.activity-meta {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: var(--font-size-xs);
	}
	
	.activity-amount {
		font-weight: 600;
		color: var(--color-text-primary);
	}
	
	.activity-result {
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.result-win {
		color: var(--color-success);
	}
	
	.result-loss {
		color: var(--color-error);
	}
	
	.result-pending {
		color: var(--color-warning);
	}
	
	.activity-time {
		color: var(--color-text-secondary);
	}
	
	.performers-list {
		padding: var(--spacing-md);
	}
	
	.performer-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		transition: background-color 0.2s ease;
	}
	
	.performer-item:hover {
		background-color: #f8fafc;
	}
	
	.performer-info {
		flex: 1;
	}
	
	.performer-name {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: var(--spacing-xs);
	}
	
	.performer-team {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}
	
	.performer-stats {
		text-align: right;
	}
	
	.stat-name {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xs);
	}
	
	.stat-value {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-primary);
	}
	
	.stat-trend {
		display: flex;
		align-items: center;
	}
	
	.trend-up {
		color: var(--color-success);
	}
	
	.trend-down {
		color: var(--color-error);
	}
	
	.quick-actions {
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}
	
	.quick-action-btn {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: #f8fafc;
		border: 1px solid #e5e7eb;
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}
	
	.quick-action-btn:hover {
		background: #f1f5f9;
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	
	.quick-action-btn svg {
		flex-shrink: 0;
	}
	
	@media (max-width: 768px) {
		.section-header {
			padding: var(--spacing-md);
		}
		
		.activity-list,
		.performers-list,
		.quick-actions {
			padding: var(--spacing-sm);
		}
		
		.activity-item,
		.performer-item {
			padding: var(--spacing-sm);
		}
	}
</style>
