import { json } from '@sveltejs/kit';
import { sportsRadar } from '$lib/services/sportradar.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		console.log('🧪 Testing SportsRadar API connection...');
		
		// Test teams endpoint
		const teams = await sportsRadar.getWNBATeams();
		
		if (teams && teams.length > 0) {
			return json({
				success: true,
				message: 'SportsRadar API connection successful',
				data: {
					teamsCount: teams.length,
					sampleTeams: teams.slice(0, 3).map(team => ({
						id: team.id,
						name: team.name,
						market: team.market,
						alias: team.alias
					}))
				}
			});
		} else {
			return json({
				success: false,
				message: 'SportsRadar API returned no data'
			}, { status: 500 });
		}
	} catch (error) {
		console.error('SportsRadar API test error:', error);
		
		return json({
			success: false,
			message: 'SportsRadar API connection failed',
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
