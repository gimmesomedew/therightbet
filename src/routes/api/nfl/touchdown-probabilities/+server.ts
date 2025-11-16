import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export interface PlayerTouchdownProbability {
	playerId: string;
	playerName: string;
	position: string | null;
	team: string;
	totalTouchdowns: number;
	gamesPlayed: number;
	weeksWithTouchdown: number;
	touchdownProbability: number; // Percentage (0-100)
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const season = parseInt(url.searchParams.get('season') || '2025');
		const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();

		// Query to calculate touchdown probabilities
		// For each player, count:
		// - Total games their TEAM played (more accurate than just player appearances)
		// - Weeks the player scored at least 1 TD
		// - Total touchdowns across all weeks
		// Note: We use the team's total games played as the denominator to account for
		// games where the player didn't appear (injury, benched, etc.)
		const probabilities = await db`
			WITH team_games AS (
				SELECT 
					tt.team_abbreviation,
					COUNT(DISTINCT tt.week) as total_team_games
				FROM nfl_team_touchdowns tt
				JOIN nfl_weeks w ON tt.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
				GROUP BY tt.team_abbreviation
			)
			SELECT 
				pt.player_id,
				pt.player_name,
				pt.position,
				pt.team_abbreviation as team,
				SUM(pt.total_touchdowns) as total_touchdowns,
				COALESCE(tg.total_team_games, COUNT(DISTINCT pt.week)) as games_played,
				COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) as weeks_with_touchdown
			FROM nfl_player_touchdowns pt
			JOIN nfl_weeks w ON pt.week_id = w.id
			LEFT JOIN team_games tg ON pt.team_abbreviation = tg.team_abbreviation
			WHERE w.season = ${season}
				AND w.season_type = ${seasonType}
				AND w.has_data = true
			GROUP BY pt.player_id, pt.player_name, pt.position, pt.team_abbreviation, tg.total_team_games
			HAVING COUNT(DISTINCT pt.week) > 0
			ORDER BY 
				(COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END)::float / COALESCE(tg.total_team_games, COUNT(DISTINCT pt.week))) DESC,
				SUM(pt.total_touchdowns) DESC,
				pt.player_name
		`;

		// Transform results and calculate percentage
		// Using a Bayesian approach with regression to the mean to avoid 100% probabilities
		// Formula: (weeksWithTD + prior) / (gamesPlayed + prior + 1) * 100
		// This uses Laplace's rule of succession to provide more realistic probabilities
		const PRIOR_SUCCESSES = 2; // Prior assumption: 2 successful weeks
		const PRIOR_TRIALS = 5; // Prior assumption: 5 total weeks
		
		const results: PlayerTouchdownProbability[] = probabilities.map((row) => {
			const gamesPlayed = parseInt(row.games_played || '0');
			const weeksWithTouchdown = parseInt(row.weeks_with_touchdown || '0');
			
			// Bayesian probability with regression to the mean
			// This prevents 100% probabilities and accounts for sample size
			const touchdownProbability =
				gamesPlayed > 0
					? ((weeksWithTouchdown + PRIOR_SUCCESSES) / (gamesPlayed + PRIOR_TRIALS)) * 100
					: 0;

			return {
				playerId: row.player_id,
				playerName: row.player_name,
				position: row.position,
				team: row.team,
				totalTouchdowns: parseInt(row.total_touchdowns || '0'),
				gamesPlayed,
				weeksWithTouchdown,
				touchdownProbability: Math.round(touchdownProbability * 100) / 100 // Round to 2 decimal places
			};
		});

		return json({
			success: true,
			data: results,
			season,
			seasonType
		});
	} catch (error: any) {
		console.error('Error fetching touchdown probabilities:', error);
		return json(
			{
				success: false,
				error: error?.message ?? 'Unknown server error'
			},
			{ status: 500 }
		);
	}
};

