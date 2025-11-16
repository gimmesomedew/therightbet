import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// Fetch dashboard stats
		const statsResponse = await fetch('/api/dashboard/stats');
		const statsData = await statsResponse.json();

		// Fetch today's games
		const gamesResponse = await fetch('/api/games/today');
		const gamesData = await gamesResponse.json();

		// Transform stats data to match frontend expectations
		let stats = [];
		if (statsData.success && statsData.data) {
			const rawStats = statsData.data;
			stats = [
				{
					label: "Today's Games",
					value: rawStats.todaysGames?.toString() || '0',
					icon: 'calendar',
					color: 'green'
				},
				{
					label: 'Total Teams',
					value: rawStats.totalTeams?.toString() || '0',
					icon: 'activity',
					color: 'orange'
				},
				{
					label: 'Total Players',
					value: rawStats.totalPlayers?.toString() || '0',
					icon: 'trophy',
					color: 'yellow'
				},
				{
					label: 'Upcoming Games',
					value: rawStats.upcomingGames?.toString() || '0',
					icon: 'dollar-sign',
					color: 'green'
				}
			];
		}

		return {
			stats,
			games: gamesData.success ? gamesData.data : []
		};
	} catch (error: any) {
		console.error('Error loading dashboard data:', error);
		return {
			stats: [],
			games: []
		};
	}
};
