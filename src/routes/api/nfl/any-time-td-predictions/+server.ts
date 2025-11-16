import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export interface AnyTimeTdPrediction {
	teamAbbreviation: string;
	teamDisplayName: string;
	playerName: string;
	playerId: string;
	position: string | null;
	probabilityPercentage: number;
	totalTouchdowns: number;
	gamesPlayed: number;
	weeksWithTouchdown: number;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const season = parseInt(url.searchParams.get('season') || '2025');
		const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();
		const week = parseInt(url.searchParams.get('week') || '11');

		// Get touchdown probabilities for all players
		// This uses the same calculation as the touchdown probabilities endpoint
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
			),
			player_stats AS (
				SELECT 
					pt.player_id,
					pt.player_name,
					pt.position,
					pt.team_abbreviation,
					SUM(pt.total_touchdowns) as total_touchdowns,
					COALESCE(tg.total_team_games, COUNT(DISTINCT pt.week)) as games_played,
					COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) as weeks_with_touchdown
				FROM nfl_player_touchdowns pt
				JOIN nfl_weeks w ON pt.week_id = w.id
				LEFT JOIN team_games tg ON pt.team_abbreviation = tg.team_abbreviation
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
					AND (pt.position IS NULL OR UPPER(pt.position) != 'QB')
				GROUP BY pt.player_id, pt.player_name, pt.position, pt.team_abbreviation, tg.total_team_games
				HAVING COUNT(DISTINCT pt.week) > 0
			),
			team_info AS (
				SELECT DISTINCT
					tt.team_abbreviation,
					tt.team_display_name
				FROM nfl_team_touchdowns tt
				JOIN nfl_weeks w ON tt.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
			)
			SELECT 
				ps.team_abbreviation,
				COALESCE(ti.team_display_name, ps.team_abbreviation) as team_display_name,
				ps.player_name,
				ps.player_id,
				ps.position,
				ps.total_touchdowns,
				ps.games_played,
				ps.weeks_with_touchdown,
				-- Bayesian probability calculation
				LEAST(((ps.weeks_with_touchdown + 2)::float / (ps.games_played + 5) * 100), 100) as probability_percentage
			FROM player_stats ps
			LEFT JOIN team_info ti ON ps.team_abbreviation = ti.team_abbreviation
			WHERE ps.total_touchdowns > 0
			ORDER BY ps.team_abbreviation, probability_percentage DESC, ps.total_touchdowns DESC
		`;

		// Get top scorer per team (highest probability)
		const topScorers = await db`
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
			),
			player_stats AS (
				SELECT 
					pt.player_id,
					pt.player_name,
					pt.position,
					pt.team_abbreviation,
					SUM(pt.total_touchdowns) as total_touchdowns,
					COALESCE(tg.total_team_games, COUNT(DISTINCT pt.week)) as games_played,
					COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) as weeks_with_touchdown,
					LEAST(((COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) + 2)::float / (COALESCE(tg.total_team_games, COUNT(DISTINCT pt.week)) + 5) * 100), 100) as probability_percentage
				FROM nfl_player_touchdowns pt
				JOIN nfl_weeks w ON pt.week_id = w.id
				LEFT JOIN team_games tg ON pt.team_abbreviation = tg.team_abbreviation
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
					AND (pt.position IS NULL OR UPPER(pt.position) != 'QB')
				GROUP BY pt.player_id, pt.player_name, pt.position, pt.team_abbreviation, tg.total_team_games
				HAVING COUNT(DISTINCT pt.week) > 0 AND SUM(pt.total_touchdowns) > 0
			),
			team_max_prob AS (
				SELECT 
					team_abbreviation,
					MAX(probability_percentage) as max_probability
				FROM player_stats
				GROUP BY team_abbreviation
			),
			team_info AS (
				SELECT DISTINCT
					tt.team_abbreviation,
					tt.team_display_name
				FROM nfl_team_touchdowns tt
				JOIN nfl_weeks w ON tt.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
			)
			SELECT 
				ps.team_abbreviation,
				COALESCE(ti.team_display_name, ps.team_abbreviation) as team_display_name,
				ps.player_name,
				ps.player_id,
				ps.position,
				ps.probability_percentage,
				ps.total_touchdowns,
				ps.games_played,
				ps.weeks_with_touchdown
			FROM player_stats ps
			JOIN team_max_prob tmp ON ps.team_abbreviation = tmp.team_abbreviation 
				AND ps.probability_percentage = tmp.max_probability
			LEFT JOIN team_info ti ON ps.team_abbreviation = ti.team_abbreviation
			ORDER BY ps.team_abbreviation
		`;

		const results: AnyTimeTdPrediction[] = topScorers.map((row) => ({
			teamAbbreviation: row.team_abbreviation,
			teamDisplayName: row.team_display_name || row.team_abbreviation,
			playerName: row.player_name,
			playerId: row.player_id,
			position: row.position,
			probabilityPercentage: parseFloat(row.probability_percentage || '0'),
			totalTouchdowns: parseInt(row.total_touchdowns || '0'),
			gamesPlayed: parseInt(row.games_played || '0'),
			weeksWithTouchdown: parseInt(row.weeks_with_touchdown || '0')
		}));

		return json({
			success: true,
			data: results,
			season,
			seasonType,
			week
		});
	} catch (error: any) {
		console.error('Error calculating any-time TD predictions:', error);
		return json(
			{
				success: false,
				error: error?.message ?? 'Unknown server error'
			},
			{ status: 500 }
		);
	}
};


