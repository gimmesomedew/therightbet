import { json } from '@sveltejs/kit';
import { sportsRadar } from '$lib/services/sportradar';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const gameId = params.id;
		
		// For now, we'll use mock data since we need to map our game IDs to SportsRadar team IDs
		// In a real implementation, you would:
		// 1. Get the game details from your database
		// 2. Map your team IDs to SportsRadar team IDs
		// 3. Call the SportsRadar head-to-head API
		
		// Team ID mappings from SportsRadar (using real teams with actual head-to-head games)
		const teamMappings = {
			'a2a9accd-4d63-4b09-bf13-6b83d3155c52': {
				homeTeamId: '5d70a9af-8c2b-4aec-9e68-9acc6ddb93e4', // Atlanta Dream
				awayTeamId: '0a5ad38d-2fe3-43ba-894b-1ba3d5042ea9'   // Los Angeles Sparks
			},
			'a09064ea-3cfb-450c-b74c-deff8357aca0': {
				homeTeamId: 'f073a15f-0486-4179-b0a3-dfd0294eb595', // Indiana Fever
				awayTeamId: '3c409388-ab73-4c7f-953d-3a71062240f6'  // Chicago Sky (they have 5 games)
			}
		};

		const teamMapping = teamMappings[gameId as keyof typeof teamMappings];
		
		if (!teamMapping) {
			return json({ 
				success: false, 
				message: 'Team mapping not found for this game' 
			}, { status: 404 });
		}

		// Try to get real data from SportsRadar
		try {
			const headToHeadGames = await sportsRadar.getHeadToHeadGamesForMultipleSeasons(
				teamMapping.homeTeamId,
				teamMapping.awayTeamId,
				[2025] // Current season only - rosters change year to year
			);

			// Process the real data
			const completedGames = headToHeadGames.filter(game => game.home_points && game.away_points);
			const processedData = {
				allTimeSeries: `${completedGames.length} completed games (2025 season)`,
				seriesLeader: completedGames.length > 0 ? 'Current season data from SportsRadar' : 'No completed games yet',
				lastFiveMeetings: headToHeadGames.slice(0, 5).map(game => ({
					date: new Date(game.scheduled).toISOString().split('T')[0],
					homeTeam: sportsRadar.getTeamName(game.home),
					awayTeam: sportsRadar.getTeamName(game.away),
					homeScore: game.home_points || 0,
					awayScore: game.away_points || 0,
					result: game.home_points && game.away_points 
						? (game.home_points > game.away_points ? `${sportsRadar.getTeamName(game.home)} Win` : `${sportsRadar.getTeamName(game.away)} Win`)
						: 'Game not completed',
					venue: game.venue?.name || 'TBD',
					gameId: game.id
				})),
				bettingTrends: {
					ats: 'Data from SportsRadar',
					overUnder: 'Data from SportsRadar',
					avgTotal: 'Data from SportsRadar'
				},
				source: 'SportsRadar API'
			};

			return json({
				success: true,
				data: processedData
			});

		} catch (sportsRadarError) {
			console.error('SportsRadar API error:', sportsRadarError);
			
			// Fallback to mock data if SportsRadar fails
			const mockHeadToHeadData = {
				'a2a9accd-4d63-4b09-bf13-6b83d3155c52': {
					// Atlanta Dream vs Los Angeles Sparks
					allTimeSeries: '8-12',
					seriesLeader: 'Los Angeles leads series',
					lastFiveMeetings: [
						{
							date: '2025-05-27',
							homeTeam: 'Atlanta Dream',
							awayTeam: 'Los Angeles Sparks',
							homeScore: 78,
							awayScore: 85,
							result: 'Los Angeles Win',
							venue: 'Gateway Center Arena',
							gameId: 'game-2025-05-27-atl-la'
						},
						{
							date: '2024-08-15',
							homeTeam: 'Los Angeles Sparks',
							awayTeam: 'Atlanta Dream',
							homeScore: 89,
							awayScore: 82,
							result: 'Los Angeles Win',
							venue: 'Crypto.com Arena',
							gameId: 'game-2024-08-15-la-atl'
						},
						{
							date: '2024-06-22',
							homeTeam: 'Atlanta Dream',
							awayTeam: 'Los Angeles Sparks',
							homeScore: 91,
							awayScore: 87,
							result: 'Atlanta Win',
							venue: 'Gateway Center Arena',
							gameId: 'game-2024-06-22-atl-la'
						},
						{
							date: '2024-05-18',
							homeTeam: 'Los Angeles Sparks',
							awayTeam: 'Atlanta Dream',
							homeScore: 76,
							awayScore: 84,
							result: 'Atlanta Win',
							venue: 'Crypto.com Arena',
							gameId: 'game-2024-05-18-la-atl'
						},
						{
							date: '2023-09-02',
							homeTeam: 'Atlanta Dream',
							awayTeam: 'Los Angeles Sparks',
							homeScore: 88,
							awayScore: 92,
							result: 'Los Angeles Win',
							venue: 'Gateway Center Arena',
							gameId: 'game-2023-09-02-atl-la'
						}
					],
					bettingTrends: {
						ats: '3-2 Los Angeles ATS',
						overUnder: '3-2 Over Total',
						avgTotal: '166.8 Avg Total Points'
					},
					source: 'Mock Data (SportsRadar API unavailable)'
				},
				'a09064ea-3cfb-450c-b74c-deff8357aca0': {
					// Chicago Sky vs Connecticut Sun
					allTimeSeries: '12-18',
					seriesLeader: 'Connecticut leads series',
					lastFiveMeetings: [
						{
							date: '2025-05-27',
							homeTeam: 'Chicago Sky',
							awayTeam: 'Connecticut Sun',
							homeScore: 82,
							awayScore: 89,
							result: 'Connecticut Win',
							venue: 'Wintrust Arena',
							gameId: 'game-2025-05-27-chi-conn'
						},
						{
							date: '2024-08-20',
							homeTeam: 'Connecticut Sun',
							awayTeam: 'Chicago Sky',
							homeScore: 89,
							awayScore: 82,
							result: 'Connecticut Win',
							venue: 'Mohegan Sun Arena',
							gameId: 'game-2024-08-20-conn-chi'
						},
						{
							date: '2024-07-15',
							homeTeam: 'Chicago Sky',
							awayTeam: 'Connecticut Sun',
							homeScore: 84,
							awayScore: 76,
							result: 'Chicago Win',
							venue: 'Wintrust Arena',
							gameId: 'game-2024-07-15-chi-conn'
						},
						{
							date: '2024-06-10',
							homeTeam: 'Connecticut Sun',
							awayTeam: 'Chicago Sky',
							homeScore: 91,
							awayScore: 78,
							result: 'Connecticut Win',
							venue: 'Mohegan Sun Arena',
							gameId: 'game-2024-06-10-conn-chi'
						},
						{
							date: '2024-05-25',
							homeTeam: 'Chicago Sky',
							awayTeam: 'Connecticut Sun',
							homeScore: 88,
							awayScore: 85,
							result: 'Chicago Win',
							venue: 'Wintrust Arena',
							gameId: 'game-2024-05-25-chi-conn'
						}
					],
					bettingTrends: {
						ats: '3-2 Connecticut ATS',
						overUnder: '3-2 Over Total',
						avgTotal: '168.2 Avg Total Points'
					},
					source: 'Mock Data (SportsRadar API unavailable)'
				}
			};

			const fallbackData = mockHeadToHeadData[gameId as keyof typeof mockHeadToHeadData];
			
			if (!fallbackData) {
				return json({ 
					success: false, 
					message: 'Head-to-head data not found for this game' 
				}, { status: 404 });
			}

			return json({
				success: true,
				data: fallbackData
			});
		}

	} catch (error) {
		console.error('Error fetching head-to-head data:', error);
		return json({ 
			success: false, 
			message: 'Failed to fetch head-to-head data' 
		}, { status: 500 });
	}
};
