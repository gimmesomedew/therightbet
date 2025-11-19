import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export interface EnhancedAnyTimeTdPrediction {
	playerId: string;
	playerName: string;
	position: string;
	team: string;
	teamDisplayName: string;
	opponent: string;
	opponentDisplayName: string;
	
	// Base probability (without defensive adjustment)
	baseProbability: number;
	
	// Defensive adjustments
	opponentRedZoneStopRate: number | null;
	opponentPointsAllowedAvg: number | null;
	opponentRushingYardsAllowedAvg: number | null;
	
	// Adjusted probability (factoring in defense)
	adjustedProbability: number;
	
	// Historical stats
	totalTouchdowns: number;
	gamesPlayed: number;
	weeksWithTouchdown: number;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const season = parseInt(url.searchParams.get('season') || '2025');
		const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();
		const week = parseInt(url.searchParams.get('week') || '11');

		// Get player touchdown probabilities
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
					COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) as weeks_with_touchdown,
					-- Bayesian probability calculation
					LEAST(((COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) + 2)::float / (COALESCE(tg.total_team_games, COUNT(DISTINCT pt.week)) + 5) * 100), 100) as base_probability
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
			team_info AS (
				SELECT DISTINCT
					tt.team_abbreviation,
					tt.team_display_name
				FROM nfl_team_touchdowns tt
				JOIN nfl_weeks w ON tt.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
			),
			-- Get opponent defensive stats for the specific week
			opponent_defense AS (
				SELECT 
					ds.team_abbreviation as opponent,
					ds.red_zone_stop_percentage,
					ds.red_zone_scoring_percentage_allowed,
					ds.points_allowed,
					ds.rushing_yards_allowed
				FROM nfl_defensive_stats ds
				WHERE ds.season = ${season}
					AND ds.season_type = ${seasonType === 'REG' ? 1 : seasonType === 'PRE' ? 2 : 3}
					AND ds.week = ${week}
			),
			-- Get opponent averages for the season
			opponent_season_avg AS (
				SELECT 
					ds.team_abbreviation as opponent,
					AVG(ds.points_allowed) as avg_points_allowed,
					AVG(ds.rushing_yards_allowed) as avg_rushing_yards_allowed,
					AVG(ds.red_zone_stop_percentage) as avg_red_zone_stop_pct,
					SUM(ds.red_zone_attempts_allowed) as total_red_zone_attempts,
					SUM(ds.red_zone_conversions_allowed) as total_red_zone_conversions
				FROM nfl_defensive_stats ds
				WHERE ds.season = ${season}
					AND ds.season_type = ${seasonType === 'REG' ? 1 : seasonType === 'PRE' ? 2 : 3}
					AND ds.week < ${week} -- Only use previous weeks for season average
				GROUP BY ds.team_abbreviation
			),
			-- Get matchups for the week (to know who plays whom)
			week_matchups AS (
				SELECT DISTINCT
					ds.team_abbreviation,
					ds.opponent_abbreviation as opponent
				FROM nfl_defensive_stats ds
				WHERE ds.season = ${season}
					AND ds.season_type = ${seasonType === 'REG' ? 1 : seasonType === 'PRE' ? 2 : 3}
					AND ds.week = ${week}
			)
			SELECT 
				ps.team_abbreviation as team,
				COALESCE(ti.team_display_name, ps.team_abbreviation) as team_display_name,
				wm.opponent,
				ps.player_name,
				ps.player_id,
				ps.position,
				ps.total_touchdowns,
				ps.games_played,
				ps.weeks_with_touchdown,
				ps.base_probability,
				COALESCE(od.red_zone_stop_percentage, osa.avg_red_zone_stop_pct) as opponent_red_zone_stop_rate,
				COALESCE(od.points_allowed, osa.avg_points_allowed) as opponent_points_allowed_avg,
				COALESCE(od.rushing_yards_allowed, osa.avg_rushing_yards_allowed) as opponent_rushing_yards_allowed_avg,
				-- Calculate season red zone stop rate if not available for this week
				CASE 
					WHEN osa.total_red_zone_attempts > 0 
					THEN ((osa.total_red_zone_attempts - osa.total_red_zone_conversions)::float / osa.total_red_zone_attempts * 100)
					ELSE NULL
				END as opponent_season_red_zone_stop_rate
			FROM player_stats ps
			LEFT JOIN team_info ti ON ps.team_abbreviation = ti.team_abbreviation
			LEFT JOIN week_matchups wm ON ps.team_abbreviation = wm.team_abbreviation
			LEFT JOIN opponent_defense od ON wm.opponent = od.opponent
			LEFT JOIN opponent_season_avg osa ON wm.opponent = osa.opponent
			WHERE ps.total_touchdowns > 0
			ORDER BY ps.team_abbreviation, ps.base_probability DESC, ps.total_touchdowns DESC
		`;

		// Calculate adjusted probabilities based on opponent defense
		const results: EnhancedAnyTimeTdPrediction[] = probabilities.map((row) => {
			const baseProb = parseFloat(row.base_probability || '0');
			
			// Get opponent defensive metrics
			const redZoneStopRate = row.opponent_red_zone_stop_rate 
				? parseFloat(row.opponent_red_zone_stop_rate) 
				: row.opponent_season_red_zone_stop_rate 
					? parseFloat(row.opponent_season_red_zone_stop_rate)
					: null;
			
			const pointsAllowedAvg = row.opponent_points_allowed_avg 
				? parseFloat(row.opponent_points_allowed_avg)
				: null;
			
			const rushingYardsAllowedAvg = row.opponent_rushing_yards_allowed_avg
				? parseFloat(row.opponent_rushing_yards_allowed_avg)
				: null;

			// Calculate defensive adjustment factor
			// Factors:
			// 1. Red zone stop rate (most important for touchdowns) - 50% weight
			// 2. Points allowed average - 30% weight  
			// 3. Rushing yards allowed (for RBs) - 20% weight
			
			let adjustmentFactor = 1.0; // No adjustment by default
			
			if (redZoneStopRate !== null) {
				// Higher red zone stop rate = lower probability
				// If opponent stops 100% of red zone attempts, reduce probability by 50%
				// If opponent stops 0% of red zone attempts, increase probability by 10%
				// Average red zone stop rate is around 30-40%
				const redZoneAdjustment = 1.0 - ((redZoneStopRate - 30) / 100) * 0.5; // Scale adjustment
				adjustmentFactor *= redZoneAdjustment * 0.5; // 50% weight
			}
			
			if (pointsAllowedAvg !== null) {
				// Lower points allowed = better defense = lower probability
				// Average points allowed is around 21-24
				// If opponent allows 10 points/game, reduce probability by 20%
				// If opponent allows 35 points/game, increase probability by 15%
				const pointsAdjustment = 1.0 + ((pointsAllowedAvg - 22) / 22) * 0.15; // Scale adjustment
				adjustmentFactor += pointsAdjustment * 0.3; // 30% weight
			}
			
			if (rushingYardsAllowedAvg !== null && (row.position === 'RB' || row.position === 'FB')) {
				// Lower rushing yards allowed = better run defense = lower probability for RBs
				// Average rushing yards allowed is around 110-120
				// If opponent allows 80 yards/game, reduce probability by 15%
				// If opponent allows 150 yards/game, increase probability by 10%
				const rushingAdjustment = 1.0 + ((rushingYardsAllowedAvg - 115) / 115) * 0.1; // Scale adjustment
				adjustmentFactor += rushingAdjustment * 0.2; // 20% weight
			} else {
				// For non-RBs, use average of other factors
				adjustmentFactor += 0.2; // Neutral weight
			}
			
			// Clamp adjustment factor between 0.3 and 1.5 (don't reduce below 30% or increase above 150%)
			adjustmentFactor = Math.max(0.3, Math.min(1.5, adjustmentFactor));
			
			// Calculate adjusted probability
			const adjustedProb = Math.min(100, Math.max(0, baseProb * adjustmentFactor));

			return {
				playerId: row.player_id,
				playerName: row.player_name,
				position: row.position,
				team: row.team,
				teamDisplayName: row.team_display_name,
				opponent: row.opponent || 'TBD',
				opponentDisplayName: row.opponent || 'TBD',
				baseProbability: Math.round(baseProb * 100) / 100,
				opponentRedZoneStopRate: redZoneStopRate ? Math.round(redZoneStopRate * 100) / 100 : null,
				opponentPointsAllowedAvg: pointsAllowedAvg ? Math.round(pointsAllowedAvg * 100) / 100 : null,
				opponentRushingYardsAllowedAvg: rushingYardsAllowedAvg ? Math.round(rushingYardsAllowedAvg * 100) / 100 : null,
				adjustedProbability: Math.round(adjustedProb * 100) / 100,
				totalTouchdowns: parseInt(row.total_touchdowns || '0'),
				gamesPlayed: parseInt(row.games_played || '0'),
				weeksWithTouchdown: parseInt(row.weeks_with_touchdown || '0')
			};
		});

		return json({
			success: true,
			data: results,
			season,
			seasonType,
			week
		});
	} catch (error: any) {
		console.error('Error fetching enhanced touchdown predictions:', error);
		return json(
			{
				success: false,
				error: error?.message ?? 'Unknown server error'
			},
			{ status: 500 }
		);
	}
};

