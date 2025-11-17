import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import { getCurrentNflWeek } from '$lib/services/nfl-week.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Get query parameters
		const season = url.searchParams.get('season') ? parseInt(url.searchParams.get('season')!) : 2025;
		const seasonType = (url.searchParams.get('seasonType') || 'REG') as 'PRE' | 'REG' | 'POST';
		let week = url.searchParams.get('week') ? parseInt(url.searchParams.get('week')!) : null;

		// If no week specified, determine current week
		if (!week) {
			week = await getCurrentNflWeek(season, seasonType);
		}

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

		// Calculate date range for the week
		// NFL weeks typically run from Thursday to Monday/Tuesday
		// For simplicity, we'll calculate based on week number
		// Week 1 starts around early September
		let weekStart: Date;
		let weekEnd: Date;

		if (week) {
			// Calculate date range based on week number
			// Week 1 typically starts around early September
			// For 2024: Week 11 is Nov 14-18
			// For 2025: Week 11 is Nov 13-19
			const seasonStart = new Date(season, 8, 4); // September 4
			const daysOffset = (week - 1) * 7;
			weekStart = new Date(seasonStart);
			weekStart.setDate(weekStart.getDate() + daysOffset);
			// NFL weeks run Thursday to Monday/Tuesday, so add a buffer
			weekStart.setDate(weekStart.getDate() - 2); // Start 2 days before
			weekEnd = new Date(weekStart);
			weekEnd.setDate(weekEnd.getDate() + 8); // End 8 days later
			weekEnd.setHours(23, 59, 59, 999);
		} else {
			// If no week specified, get current week's games
			const now = new Date();
			weekStart = new Date(now);
			weekStart.setDate(weekStart.getDate() - 3); // Start 3 days ago
			weekEnd = new Date(now);
			weekEnd.setDate(weekEnd.getDate() + 4); // End 4 days from now
		}

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
				AND g.game_date >= ${weekStart}::timestamp with time zone
				AND g.game_date <= ${weekEnd}::timestamp with time zone
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
		console.error('Error fetching matchups:', error);
		return json({
			success: false,
			message: 'Failed to fetch matchups'
		}, { status: 500 });
	}
};

