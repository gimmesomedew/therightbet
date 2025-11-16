import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
		const status = url.searchParams.get('status'); // upcoming, live, completed
		const limit = parseInt(url.searchParams.get('limit') || '10');

		// Build the query based on parameters
		let query = `
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
		`;

		const params: any[] = [];

		// Add date filter
		query += ` AND DATE(g.game_date) = $${params.length + 1}`;
		params.push(date);

		// Add status filter if provided
		if (status) {
			query += ` AND g.status = $${params.length + 1}`;
			params.push(status);
		}

		// Add ordering and limit
		query += ` ORDER BY g.game_date ASC LIMIT $${params.length + 1}`;
		params.push(limit);

		const games = await db.unsafe(query, params);

		// Transform the data to match our frontend expectations
		const transformedGames = games.map(game => ({
			id: game.id,
			homeTeam: {
				id: game.home_team_id,
				name: game.home_team_name,
				abbreviation: game.home_team_abbr,
				logo: game.home_team_logo || `/logos/${game.home_team_abbr.toLowerCase()}.png`
			},
			awayTeam: {
				id: game.away_team_id,
				name: game.away_team_name,
				abbreviation: game.away_team_abbr,
				logo: game.away_team_logo || `/logos/${game.away_team_abbr.toLowerCase()}.png`
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
			date,
			count: transformedGames.length
		});

	} catch (error: any) {
		console.error('Error fetching games:', error);
		return json({
			success: false,
			message: 'Failed to fetch games',
			error: error.message
		}, { status: 500 });
	}
};
