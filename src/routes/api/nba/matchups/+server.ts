import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Get NBA sport ID
		const [sport] = await db`
			SELECT id FROM sports WHERE code = 'NBA' LIMIT 1
		`;

		if (!sport) {
			return json({
				success: false,
				message: 'NBA sport not found'
			}, { status: 404 });
		}

		// Calculate current week's date range (today through next 6 days)
		const now = new Date();
		
		// Current week starts today at midnight local time
		const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
		
		// Current week ends 6 days from today (7 days total) at 23:59:59
		const currentWeekEnd = new Date(currentWeekStart);
		currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
		currentWeekEnd.setHours(23, 59, 59, 999);

		const games = await db`
			SELECT 
				g.id,
				g.game_date,
				g.status,
				g.home_score,
				g.away_score,
				g.quarter,
				g.time_remaining,
				g.external_id,
				g.odds,
				ht.name as home_team_name,
				ht.abbreviation as home_team_abbr,
				ht.city as home_team_city,
				at.name as away_team_name,
				at.abbreviation as away_team_abbr,
				at.city as away_team_city
			FROM games g
			JOIN teams ht ON g.home_team_id = ht.id
			JOIN teams at ON g.away_team_id = at.id
			WHERE g.sport_id = ${sport.id}
				AND g.game_date >= ${currentWeekStart}::timestamp with time zone
				AND g.game_date <= ${currentWeekEnd}::timestamp with time zone
			ORDER BY g.game_date ASC
		`;

		// Format games with spread data
		const formattedGames = games.map(game => {
			const odds = game.odds || {};
			const spread = odds.spread || {};
			const total = odds.total || {};
			const moneyline = odds.moneyline || {};

			return {
				id: game.id,
				externalId: game.external_id,
				gameDate: game.game_date,
				status: game.status,
				homeScore: game.home_score,
				awayScore: game.away_score,
				quarter: game.quarter,
				timeRemaining: game.time_remaining,
				homeTeam: {
					name: game.home_team_name,
					abbreviation: game.home_team_abbr,
					city: game.home_team_city,
					score: game.home_score
				},
				awayTeam: {
					name: game.away_team_name,
					abbreviation: game.away_team_abbr,
					city: game.away_team_city,
					score: game.away_score
				},
				bettingLines: {
					spread: {
						line: spread.line,
						home: spread.home,
						away: spread.away,
						homeOdds: spread.homeOdds,
						awayOdds: spread.awayOdds
					},
					total: {
						line: total.line,
						over: total.over,
						under: total.under,
						overOdds: total.overOdds,
						underOdds: total.underOdds
					},
					moneyline: {
						home: moneyline.home,
						away: moneyline.away
					},
					lastUpdated: odds.lastUpdated,
					source: odds.source || 'the-odds-api'
				}
			};
		});

		return json({
			success: true,
			data: formattedGames,
			count: formattedGames.length,
			weekStart: currentWeekStart.toISOString(),
			weekEnd: currentWeekEnd.toISOString()
		});
	} catch (error) {
		console.error('Error fetching NBA matchups:', error);
		return json({
			success: false,
			message: 'Failed to fetch NBA matchups'
		}, { status: 500 });
	}
};

