import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export interface FirstTdPrediction {
	teamAbbreviation: string;
	teamDisplayName: string;
	playerName: string;
	playerId: string;
	position: string | null;
	predictionScore: number;
	probabilityPercentage: number;
	firstTdFrequency: number | null;
	tdProbability: number | null;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const season = parseInt(url.searchParams.get('season') || '2025');
		const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();
		const week = parseInt(url.searchParams.get('week') || '11');

		// Calculate predictions by combining:
		// 1. Historical first TD scorer frequency
		// 2. Player touchdown probability

		const predictions = await db`
			WITH team_total_games AS (
				-- Get total games played per team
				SELECT 
					tt.team_abbreviation,
					COUNT(DISTINCT tt.week) as total_games
				FROM nfl_team_touchdowns tt
				JOIN nfl_weeks w ON tt.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
				GROUP BY tt.team_abbreviation
			),
			first_td_stats AS (
				-- Get historical first TD scorer frequency for each player/team
				-- Exclude QBs as they are not bettable for first TD scorer
				SELECT 
					ft.team_abbreviation,
					ft.player_id,
					ft.player_name,
					ft.position,
					COUNT(*) as first_td_count,
					-- Calculate frequency as percentage: (first TD count / total team games) * 100
					(COUNT(*)::float / NULLIF(ttg.total_games, 0) * 100) as first_td_frequency
				FROM nfl_first_touchdown_scorers ft
				JOIN nfl_weeks w ON ft.week_id = w.id
				JOIN team_total_games ttg ON ft.team_abbreviation = ttg.team_abbreviation
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
					AND (ft.position IS NULL OR UPPER(ft.position) != 'QB')
				GROUP BY ft.team_abbreviation, ft.player_id, ft.player_name, ft.position, ttg.total_games
			),
			td_probabilities AS (
				-- Get touchdown probability for each player
				-- Exclude QBs as they are not bettable for first TD scorer
				SELECT 
					pt.team_abbreviation,
					pt.player_id,
					pt.player_name,
					pt.position,
					COUNT(DISTINCT pt.week) as games_played,
					COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) as weeks_with_td,
					CASE 
						WHEN COUNT(DISTINCT pt.week) > 0 
						THEN (COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END)::float + 2) / (COUNT(DISTINCT pt.week)::float + 5) * 100
						ELSE 0
					END as td_probability
				FROM nfl_player_touchdowns pt
				JOIN nfl_weeks w ON pt.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
					AND (pt.position IS NULL OR UPPER(pt.position) != 'QB')
				GROUP BY pt.team_abbreviation, pt.player_id, pt.player_name, pt.position
			),
			team_games AS (
				-- Get total games per team
				SELECT 
					tt.team_abbreviation,
					COUNT(DISTINCT tt.week) as total_games
				FROM nfl_team_touchdowns tt
				JOIN nfl_weeks w ON tt.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
				GROUP BY tt.team_abbreviation
			),
			combined_stats AS (
				-- Combine first TD stats with TD probabilities
				SELECT 
					COALESCE(ft.team_abbreviation, tp.team_abbreviation) as team_abbreviation,
					COALESCE(ft.player_id, tp.player_id) as player_id,
					COALESCE(ft.player_name, tp.player_name) as player_name,
					COALESCE(ft.position, tp.position) as position,
					COALESCE(ft.first_td_count, 0) as first_td_count,
					COALESCE(ft.first_td_frequency, 0) as first_td_frequency,
					COALESCE(tp.td_probability, 0) as td_probability,
					COALESCE(ttg.total_games, tp.games_played, 0) as total_games
				FROM first_td_stats ft
				FULL OUTER JOIN td_probabilities tp 
					ON ft.team_abbreviation = tp.team_abbreviation 
					AND ft.player_id = tp.player_id
				LEFT JOIN team_total_games ttg ON COALESCE(ft.team_abbreviation, tp.team_abbreviation) = ttg.team_abbreviation
			),
			prediction_scores AS (
				-- Calculate prediction score: weighted combination of first TD frequency and TD probability
				-- Exclude QBs as they are not bettable for first TD scorer
				SELECT 
					cs.*,
					-- Weight: 60% first TD frequency (as percentage), 40% TD probability
					-- First TD frequency is already a percentage (0-100), TD probability is also 0-100
					(cs.first_td_frequency * 0.6 + cs.td_probability * 0.4) as prediction_score
				FROM combined_stats cs
				WHERE cs.total_games > 0
					AND (cs.position IS NULL OR UPPER(cs.position) != 'QB')
			),
			team_max_scores AS (
				-- Get the top scorer for each team
				SELECT 
					team_abbreviation,
					MAX(prediction_score) as max_score
				FROM prediction_scores
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
				ps.prediction_score,
				-- Calculate probability as the prediction score itself (already weighted combination)
				-- Cap at 100% and ensure it's meaningful
				LEAST(ps.prediction_score, 100) as probability_percentage,
				ps.first_td_frequency,
				ps.td_probability
			FROM prediction_scores ps
			JOIN team_max_scores tms ON ps.team_abbreviation = tms.team_abbreviation AND ps.prediction_score = tms.max_score
			LEFT JOIN team_info ti ON ps.team_abbreviation = ti.team_abbreviation
			ORDER BY ps.team_abbreviation
		`;

		const results: FirstTdPrediction[] = predictions.map((row) => ({
			teamAbbreviation: row.team_abbreviation,
			teamDisplayName: row.team_display_name || row.team_abbreviation,
			playerName: row.player_name,
			playerId: row.player_id,
			position: row.position,
			predictionScore: parseFloat(row.prediction_score || '0'),
			probabilityPercentage: parseFloat(row.probability_percentage || '0'),
			firstTdFrequency: row.first_td_frequency ? parseFloat(row.first_td_frequency) : null,
			tdProbability: row.td_probability ? parseFloat(row.td_probability) : null
		}));

		// Store predictions in database
		if (results.length > 0) {
			for (const pred of results) {
				await db`
					INSERT INTO nfl_first_touchdown_predictions (
						season, season_type, week,
						team_abbreviation, player_id, player_name, position,
						prediction_score, probability_percentage,
						first_td_frequency, td_probability
					)
					VALUES (
						${season}, ${seasonType}, ${week},
						${pred.teamAbbreviation}, ${pred.playerId}, ${pred.playerName}, ${pred.position},
						${pred.predictionScore}, ${pred.probabilityPercentage},
						${pred.firstTdFrequency}, ${pred.tdProbability}
					)
					ON CONFLICT (season, season_type, week, team_abbreviation, player_id)
					DO UPDATE SET
						player_name = EXCLUDED.player_name,
						position = EXCLUDED.position,
						prediction_score = EXCLUDED.prediction_score,
						probability_percentage = EXCLUDED.probability_percentage,
						first_td_frequency = EXCLUDED.first_td_frequency,
						td_probability = EXCLUDED.td_probability,
						updated_at = NOW()
				`;
			}
		}

		return json({
			success: true,
			data: results,
			season,
			seasonType,
			week
		});
	} catch (error: any) {
		console.error('Error calculating first TD predictions:', error);
		return json(
			{
				success: false,
				error: error?.message ?? 'Unknown server error'
			},
			{ status: 500 }
		);
	}
};

