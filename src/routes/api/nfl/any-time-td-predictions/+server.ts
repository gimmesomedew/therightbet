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

		// Get touchdown probabilities for all players with defensive adjustments
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
			player_stats AS (
				SELECT 
					pt.player_id,
					pt.player_name,
					pt.position,
					pt.team_abbreviation,
					SUM(pt.total_touchdowns) as total_touchdowns,
					COALESCE(tg.total_team_games, COUNT(DISTINCT pt.week)) as games_played,
					COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) as weeks_with_touchdown,
					-- Bayesian probability calculation (base probability)
					LEAST(((COUNT(DISTINCT CASE WHEN pt.total_touchdowns > 0 THEN pt.week END) + 2)::float / (COALESCE(tg.total_team_games, COUNT(DISTINCT pt.week)) + 5) * 100), 100) as base_probability
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
					SUM(ds.red_zone_touchdowns_allowed) as total_red_zone_touchdowns_allowed,
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
				ps.total_touchdowns,
				ps.games_played,
				ps.weeks_with_touchdown,
				ps.base_probability,
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
				osd.total_red_zone_attempts,
				osd.total_red_zone_conversions,
				osd.games_played as opponent_games_played
			FROM player_stats ps
			LEFT JOIN team_info ti ON ps.team_abbreviation = ti.team_abbreviation
			LEFT JOIN week_matchups wm ON ps.team_abbreviation = wm.team_abbreviation
			LEFT JOIN opponent_season_defense osd ON wm.opponent = osd.opponent
			INNER JOIN teams_playing_this_week tptw ON ps.team_abbreviation = tptw.team_abbreviation
			WHERE ps.total_touchdowns > 0
			ORDER BY ps.team_abbreviation, ps.base_probability DESC, ps.total_touchdowns DESC
		`;

		// Calculate adjusted probabilities based on opponent defense
		const resultsWithDefense = probabilities.map((row) => {
			const baseProb = parseFloat(row.base_probability || '0');
			
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

			// Calculate defensive adjustment factor
			// Factors:
			// 1. Red zone stop rate (most important for touchdowns) - 50% weight
			// 2. Points allowed average - 30% weight  
			// 3. Rushing yards allowed (for RBs) or passing yards (for WRs/TEs) - 20% weight
			
			let adjustmentFactor = 1.0; // No adjustment by default
			
			if (redZoneStopRate !== null && row.opponent_games_played > 0) {
				// Higher red zone stop rate = lower probability
				// Average red zone stop rate is around 30-40%
				// If opponent stops 100% of red zone attempts, reduce probability significantly
				// If opponent stops 0% of red zone attempts, increase probability slightly
				const redZoneAdjustment = 1.0 - ((redZoneStopRate - 30) / 100) * 0.6; // Scale adjustment
				adjustmentFactor = redZoneAdjustment * 0.5; // 50% weight
			}
			
			if (pointsAllowedAvg !== null && row.opponent_games_played > 0) {
				// Lower points allowed = better defense = lower probability
				// Average points allowed is around 21-24
				// If opponent allows 10 points/game, reduce probability
				// If opponent allows 35 points/game, increase probability
				const pointsAdjustment = 1.0 + ((pointsAllowedAvg - 22) / 22) * 0.15;
				adjustmentFactor += pointsAdjustment * 0.3; // 30% weight
			}
			
			if (row.opponent_games_played > 0) {
				if ((row.position === 'RB' || row.position === 'FB') && rushingYardsAllowedAvg !== null) {
					// Lower rushing yards allowed = better run defense = lower probability for RBs
					// Average rushing yards allowed is around 110-120
					const rushingAdjustment = 1.0 + ((rushingYardsAllowedAvg - 115) / 115) * 0.1;
					adjustmentFactor += rushingAdjustment * 0.2; // 20% weight
				} else if ((row.position === 'WR' || row.position === 'TE') && row.avg_passing_yards_allowed !== null) {
					// Lower passing yards allowed = better pass defense = lower probability for WRs/TEs
					const passingYardsAllowedAvg = parseFloat(row.avg_passing_yards_allowed);
					const passingAdjustment = 1.0 + ((passingYardsAllowedAvg - 240) / 240) * 0.1;
					adjustmentFactor += passingAdjustment * 0.2; // 20% weight
				} else {
					// For other positions, use neutral weight
					adjustmentFactor += 0.2;
				}
			} else {
				// No defensive data available, use neutral adjustment
				adjustmentFactor = 1.0;
			}
			
			// Clamp adjustment factor between 0.3 and 1.5
			// Don't reduce below 30% or increase above 150% of base probability
			adjustmentFactor = Math.max(0.3, Math.min(1.5, adjustmentFactor));
			
			// Calculate adjusted probability
			const adjustedProb = Math.min(100, Math.max(0, baseProb * adjustmentFactor));

			return {
				...row,
				probability_percentage: Math.round(adjustedProb * 100) / 100,
				base_probability: Math.round(baseProb * 100) / 100,
				opponent_red_zone_stop_rate: redZoneStopRate !== null ? Math.round(redZoneStopRate * 100) / 100 : null,
				opponent_points_allowed_avg: pointsAllowedAvg !== null ? Math.round(pointsAllowedAvg * 100) / 100 : null,
				adjustment_factor: Math.round(adjustmentFactor * 1000) / 1000
			};
		});

		// Find top scorer per team using adjusted probabilities
		const teamMaxProbs = new Map<string, { player: any; prob: number }>();
		
		for (const player of resultsWithDefense) {
			const team = player.team_abbreviation;
			const currentMax = teamMaxProbs.get(team);
			const adjustedProb = player.probability_percentage;
			
			if (!currentMax || adjustedProb > currentMax.prob) {
				teamMaxProbs.set(team, { player, prob: adjustedProb });
			}
		}

		const results: AnyTimeTdPrediction[] = Array.from(teamMaxProbs.values())
			.map(({ player }) => ({
				teamAbbreviation: player.team_abbreviation,
				teamDisplayName: player.team_display_name || player.team_abbreviation,
				playerName: player.player_name,
				playerId: player.player_id,
				position: player.position,
				probabilityPercentage: player.probability_percentage, // This is the adjusted probability
				totalTouchdowns: parseInt(player.total_touchdowns || '0'),
				gamesPlayed: parseInt(player.games_played || '0'),
				weeksWithTouchdown: parseInt(player.weeks_with_touchdown || '0')
			}))
			.sort((a, b) => a.teamAbbreviation.localeCompare(b.teamAbbreviation));

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


