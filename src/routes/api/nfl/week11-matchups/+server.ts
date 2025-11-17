import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Get NFL sport ID
		const [sport] = await db`
			SELECT id FROM sports WHERE code = 'NFL' LIMIT 1
		`;

		if (!sport) {
			return json({
				success: false,
				message: 'NFL sport not found'
			}, { status: 404 });
		}

		// Get Week 11 games (assuming 2024 season, REG type)
		// You can adjust the date range to match Week 11
		// Week 11 typically falls in mid-November
		const week11Start = new Date('2024-11-14T00:00:00Z');
		const week11End = new Date('2024-11-18T23:59:59Z');

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
				AND g.game_date >= ${week11Start}::timestamp with time zone
				AND g.game_date <= ${week11End}::timestamp with time zone
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
					source: odds.source || 'sportradar'
				}
			};
		});

		return json({
			success: true,
			data: formattedGames,
			count: formattedGames.length
		});
	} catch (error) {
		console.error('Error fetching Week 11 matchups:', error);
		return json({
			success: false,
			message: 'Failed to fetch Week 11 matchups'
		}, { status: 500 });
	}
};

