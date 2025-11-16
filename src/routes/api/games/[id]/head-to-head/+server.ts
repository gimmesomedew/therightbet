import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const gameId = params.id;
		
		// For now, we'll use mock data since we need to map our game IDs to SportsRadar team IDs
		// In a real implementation, you would:
		// 1. Get the game details from your database
		// 2. Map your team IDs to SportsRadar team IDs
		// 3. Call the head-to-head API
		
		// Mock head-to-head data based on the game ID
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
				}
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
				}
			}
		};

		const headToHeadData = mockHeadToHeadData[gameId as keyof typeof mockHeadToHeadData];
		
		if (!headToHeadData) {
			return json({ 
				success: false, 
				message: 'Head-to-head data not found for this game' 
			}, { status: 404 });
		}

		return json({
			success: true,
			data: headToHeadData
		});

	} catch (error) {
		console.error('Error fetching head-to-head data:', error);
		return json({ 
			success: false, 
			message: 'Failed to fetch head-to-head data' 
		}, { status: 500 });
	}
};
