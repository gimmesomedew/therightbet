import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const today = new Date().toISOString().split('T')[0];

		// Get today's games with team information
		const games = await db`
			SELECT 
				g.id,
				g.game_date,
				g.status,
				g.home_score,
				g.away_score,
				g.quarter,
				g.time_remaining,
				ht.id as home_team_id,
				ht.name as home_team_name,
				ht.abbreviation as home_team_abbr,
				ht.logo_url as home_team_logo,
				at.id as away_team_id,
				at.name as away_team_name,
				at.abbreviation as away_team_abbr,
				at.logo_url as away_team_logo
			FROM games g
			JOIN teams ht ON g.home_team_id = ht.id
			JOIN teams at ON g.away_team_id = at.id
			WHERE ht.sport_id = (SELECT id FROM sports WHERE code = 'WNBA')
			AND at.sport_id = (SELECT id FROM sports WHERE code = 'WNBA')
			AND DATE(g.game_date) = ${today}
			ORDER BY g.game_date ASC
		`;

		// If no real games found for today, return mock data for demonstration
		if (games.length === 0) {
			const mockGames = [
				{
					id: 'game-001',
					homeTeam: {
						id: '1',
						name: 'Las Vegas Aces',
						abbreviation: 'LV',
						logo: '/logos/las-vegas-aces.png'
					},
					awayTeam: {
						id: '2',
						name: 'Seattle Storm',
						abbreviation: 'SEA',
						logo: '/logos/seattle-storm.png'
					},
					gameTime: new Date().toISOString(),
					status: 'upcoming',
					homeScore: null,
					awayScore: null,
					venue: 'Michelob ULTRA Arena',
					season: '2024',
					week: 'Regular Season'
				},
				{
					id: 'game-002',
					homeTeam: {
						id: '3',
						name: 'Phoenix Mercury',
						abbreviation: 'PHX',
						logo: '/logos/phoenix-mercury.png'
					},
					awayTeam: {
						id: '4',
						name: 'Connecticut Sun',
						abbreviation: 'CONN',
						logo: '/logos/connecticut-sun.png'
					},
					gameTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
					status: 'upcoming',
					homeScore: null,
					awayScore: null,
					venue: 'Footprint Center',
					season: '2024',
					week: 'Regular Season'
				}
			];

			return json({
				success: true,
				data: mockGames,
				date: today,
				count: mockGames.length,
				note: 'Using mock data - no real games scheduled for today'
			});
		}

		// Team records mapping (from SportsRadar 2025 season data)
		const teamRecords = {
			'Dream': '26-14',
			'Sparks': '19-20',
			'Aces': '26-14',
			'Storm': '22-20',
			'Mercury': '26-14',
			'Sun': '10-30',
			'Lynx': '32-8',
			'Liberty': '24-17',
			'Valkyries': '22-18',
			'Fever': '21-20',
			'Mystics': '16-25',
			'Wings': '9-32',
			'Sky': '9-30'
		};

		// Transform the real data
		const transformedGames = games.map(game => ({
			id: game.id,
			homeTeam: {
				id: game.home_team_id,
				name: game.home_team_name,
				abbreviation: game.home_team_abbr,
				logo: game.home_team_logo || `/logos/${game.home_team_abbr.toLowerCase()}.png`,
				record: teamRecords[game.home_team_name] || 'N/A'
			},
			awayTeam: {
				id: game.away_team_id,
				name: game.away_team_name,
				abbreviation: game.away_team_abbr,
				logo: game.away_team_logo || `/logos/${game.away_team_abbr.toLowerCase()}.png`,
				record: teamRecords[game.away_team_name] || 'N/A'
			},
			gameTime: game.game_date,
			gameDate: game.game_date,
			status: game.status,
			homeScore: game.home_score,
			awayScore: game.away_score,
			quarter: game.quarter,
			timeRemaining: game.time_remaining
		}));

		return json({
			success: true,
			data: transformedGames,
			date: today,
			count: transformedGames.length
		});

	} catch (error: any) {
		console.error('Error fetching today\'s games:', error);
		return json({
			success: false,
			message: 'Failed to fetch today\'s games',
			error: error.message
		}, { status: 500 });
	}
};
