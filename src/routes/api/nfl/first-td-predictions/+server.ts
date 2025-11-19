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
		const seasonTypeNum = seasonType === 'REG' ? 1 : seasonType === 'PRE' ? 2 : 3;

		// Calculate date range for the week to identify teams playing
		const seasonStart = new Date(season, 8, 4); // September 4
		const daysOffset = (week - 1) * 7;
		const weekStartDate = new Date(seasonStart);
		weekStartDate.setDate(weekStartDate.getDate() + daysOffset - 2); // Start 2 days before
		const weekEndDate = new Date(weekStartDate);
		weekEndDate.setDate(weekEndDate.getDate() + 8); // End 8 days later
		weekEndDate.setHours(23, 59, 59, 999);

		// Get NFL sport ID for bye week detection
		const [sport] = await db`
			SELECT id FROM sports WHERE code = 'NFL' LIMIT 1
		`;

		// Calculate predictions by combining:
		// 1. Historical first TD scorer frequency
		// 2. Player touchdown probability (adjusted for opponent defense)

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
			),
			-- Identify teams playing this week (not on bye)
			teams_playing_this_week AS (
				-- Teams from games table
				SELECT DISTINCT ht.abbreviation as team_abbreviation
				FROM games g
				JOIN teams ht ON g.home_team_id = ht.id
				WHERE g.sport_id = ${sport?.id || null}
					AND g.game_date >= ${weekStartDate}::timestamp with time zone
					AND g.game_date <= ${weekEndDate}::timestamp with time zone
				
				UNION
				
				SELECT DISTINCT at.abbreviation as team_abbreviation
				FROM games g
				JOIN teams at ON g.away_team_id = at.id
				WHERE g.sport_id = ${sport?.id || null}
					AND g.game_date >= ${weekStartDate}::timestamp with time zone
					AND g.game_date <= ${weekEndDate}::timestamp with time zone
				
				UNION
				
				-- Teams from defensive stats (backup method if games table doesn't have data)
				SELECT DISTINCT ds.team_abbreviation
				FROM nfl_defensive_stats ds
				WHERE ds.season = ${season}
					AND ds.season_type = ${seasonTypeNum}
					AND ds.week = ${week}
			),
			-- Get matchups for the specific week
			week_matchups AS (
				SELECT DISTINCT
					ds.team_abbreviation,
					ds.opponent_abbreviation as opponent
				FROM nfl_defensive_stats ds
				WHERE ds.season = ${season}
					AND ds.season_type = ${seasonTypeNum}
					AND ds.week = ${week}
			),
			-- Get opponent season defensive averages (up to current week)
			opponent_season_defense AS (
				SELECT 
					ds.team_abbreviation as opponent,
					AVG(ds.points_allowed) as avg_points_allowed,
					AVG(ds.rushing_yards_allowed) as avg_rushing_yards_allowed,
					AVG(ds.passing_yards_allowed) as avg_passing_yards_allowed,
					SUM(ds.red_zone_attempts_allowed) as total_red_zone_attempts,
					SUM(ds.red_zone_conversions_allowed) as total_red_zone_conversions,
					COUNT(*) as games_played
				FROM nfl_defensive_stats ds
				WHERE ds.season = ${season}
					AND ds.season_type = ${seasonTypeNum}
					AND ds.week <= ${week} -- Use all weeks up to and including current week
				GROUP BY ds.team_abbreviation
			)
			SELECT 
				ps.team_abbreviation,
				COALESCE(ti.team_display_name, ps.team_abbreviation) as team_display_name,
				ps.player_name,
				ps.player_id,
				ps.position,
				ps.prediction_score,
				ps.first_td_frequency,
				ps.td_probability as base_td_probability,
				wm.opponent,
				-- Calculate season red zone stop rate
				CASE 
					WHEN osd.total_red_zone_attempts > 0 
					THEN ((osd.total_red_zone_attempts - osd.total_red_zone_conversions)::float / osd.total_red_zone_attempts * 100)
					ELSE NULL
				END as opponent_red_zone_stop_rate,
				osd.avg_points_allowed,
				osd.avg_rushing_yards_allowed,
				osd.avg_passing_yards_allowed,
				osd.games_played as opponent_games_played
			FROM prediction_scores ps
			JOIN team_max_scores tms ON ps.team_abbreviation = tms.team_abbreviation AND ps.prediction_score = tms.max_score
			LEFT JOIN team_info ti ON ps.team_abbreviation = ti.team_abbreviation
			LEFT JOIN week_matchups wm ON ps.team_abbreviation = wm.team_abbreviation
			LEFT JOIN opponent_season_defense osd ON wm.opponent = osd.opponent
			INNER JOIN teams_playing_this_week tptw ON ps.team_abbreviation = tptw.team_abbreviation
			ORDER BY ps.team_abbreviation
		`;

		// Calculate adjusted probabilities based on opponent defense
		const results: FirstTdPrediction[] = predictions.map((row) => {
			const baseTdProb = parseFloat(row.base_td_probability || '0');
			const firstTdFreq = parseFloat(row.first_td_frequency || '0');
			
			// Get opponent defensive metrics (season averages)
			const redZoneStopRate = row.opponent_red_zone_stop_rate !== null
				? parseFloat(row.opponent_red_zone_stop_rate)
				: null;
			
			const pointsAllowedAvg = row.avg_points_allowed !== null
				? parseFloat(row.avg_points_allowed)
				: null;
			
			const rushingYardsAllowedAvg = row.avg_rushing_yards_allowed !== null
				? parseFloat(row.avg_rushing_yards_allowed)
				: null;

			// Calculate defensive adjustment factor for TD probability component
			// (First TD frequency is historical and doesn't need adjustment)
			let tdProbAdjustmentFactor = 1.0;
			
			if (redZoneStopRate !== null && row.opponent_games_played > 0) {
				const redZoneAdjustment = 1.0 - ((redZoneStopRate - 30) / 100) * 0.6;
				tdProbAdjustmentFactor = redZoneAdjustment * 0.5;
			}
			
			if (pointsAllowedAvg !== null && row.opponent_games_played > 0) {
				const pointsAdjustment = 1.0 + ((pointsAllowedAvg - 22) / 22) * 0.15;
				tdProbAdjustmentFactor += pointsAdjustment * 0.3;
			}
			
			if (row.opponent_games_played > 0) {
				if ((row.position === 'RB' || row.position === 'FB') && rushingYardsAllowedAvg !== null) {
					const rushingAdjustment = 1.0 + ((rushingYardsAllowedAvg - 115) / 115) * 0.1;
					tdProbAdjustmentFactor += rushingAdjustment * 0.2;
				} else if ((row.position === 'WR' || row.position === 'TE') && row.avg_passing_yards_allowed !== null) {
					const passingYardsAllowedAvg = parseFloat(row.avg_passing_yards_allowed);
					const passingAdjustment = 1.0 + ((passingYardsAllowedAvg - 240) / 240) * 0.1;
					tdProbAdjustmentFactor += passingAdjustment * 0.2;
				} else {
					tdProbAdjustmentFactor += 0.2;
				}
			} else {
				tdProbAdjustmentFactor = 1.0;
			}
			
			// Clamp adjustment factor
			tdProbAdjustmentFactor = Math.max(0.3, Math.min(1.5, tdProbAdjustmentFactor));
			
			// Adjust TD probability component
			const adjustedTdProb = Math.min(100, Math.max(0, baseTdProb * tdProbAdjustmentFactor));
			
			// Recalculate prediction score with adjusted TD probability
			// Weight: 60% first TD frequency, 40% adjusted TD probability
			const adjustedPredictionScore = (firstTdFreq * 0.6) + (adjustedTdProb * 0.4);
			const adjustedProbability = Math.min(100, adjustedPredictionScore);

			return {
				teamAbbreviation: row.team_abbreviation,
				teamDisplayName: row.team_display_name || row.team_abbreviation,
				playerName: row.player_name,
				playerId: row.player_id,
				position: row.position,
				predictionScore: Math.round(adjustedPredictionScore * 100) / 100,
				probabilityPercentage: Math.round(adjustedProbability * 100) / 100,
				firstTdFrequency: firstTdFreq,
				tdProbability: Math.round(adjustedTdProb * 100) / 100
			};
		});

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

