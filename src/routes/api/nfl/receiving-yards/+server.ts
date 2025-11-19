import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export interface ReceivingYardsPlayer {
	teamAbbreviation: string;
	teamDisplayName: string;
	playerName: string;
	playerId: string;
	position: string | null;
	receptions: number;
	receivingYards: number;
	receivingTouchdowns: number;
	targets: number;
	longestReception: number;
	gamesPlayed: number;
	totalReceptions: number;
	totalReceivingYards: number;
	totalReceivingTouchdowns: number;
	totalTargets: number;
	avgReceivingYards: number;
	avgReceptions: number;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const season = parseInt(url.searchParams.get('season') || '2025');
		const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();
		const week = url.searchParams.get('week') ? parseInt(url.searchParams.get('week')!) : null;
		const teamAbbreviation = url.searchParams.get('teamAbbreviation');
		const position = url.searchParams.get('position'); // Filter by RB, WR, TE
		const minYards = url.searchParams.get('minYards') ? parseInt(url.searchParams.get('minYards')!) : null;

		// Build query
		let query = db`
			WITH player_stats AS (
				SELECT 
					ry.team_abbreviation,
					ry.player_id,
					ry.player_name,
					ry.position,
					COUNT(DISTINCT ry.week) as games_played,
					SUM(ry.receptions) as total_receptions,
					SUM(ry.receiving_yards) as total_receiving_yards,
					SUM(ry.receiving_touchdowns) as total_receiving_touchdowns,
					SUM(ry.targets) as total_targets,
					MAX(ry.longest_reception) as longest_reception,
					AVG(ry.receiving_yards) as avg_receiving_yards,
					AVG(ry.receptions) as avg_receptions
				FROM nfl_player_receiving_yards ry
				JOIN nfl_weeks w ON ry.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
					${week ? db`AND ry.week = ${week}` : db``}
					${teamAbbreviation ? db`AND ry.team_abbreviation = ${teamAbbreviation}` : db``}
					${position ? db`AND UPPER(ry.position) = ${position.toUpperCase()}` : db``}
					${minYards !== null ? db`AND ry.receiving_yards >= ${minYards}` : db``}
				GROUP BY ry.team_abbreviation, ry.player_id, ry.player_name, ry.position
				HAVING SUM(ry.receiving_yards) > 0
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
				ps.games_played,
				ps.total_receptions,
				ps.total_receiving_yards,
				ps.total_receiving_touchdowns,
				ps.total_targets,
				ps.longest_reception,
				ROUND(ps.avg_receiving_yards::numeric, 2) as avg_receiving_yards,
				ROUND(ps.avg_receptions::numeric, 2) as avg_receptions
			FROM player_stats ps
			LEFT JOIN team_info ti ON ps.team_abbreviation = ti.team_abbreviation
			ORDER BY ps.total_receiving_yards DESC, ps.total_receiving_touchdowns DESC
		`;

		const results = await query;

		const players: ReceivingYardsPlayer[] = results.map((row) => ({
			teamAbbreviation: row.team_abbreviation,
			teamDisplayName: row.team_display_name || row.team_abbreviation,
			playerName: row.player_name,
			playerId: row.player_id,
			position: row.position,
			receptions: parseInt(row.total_receptions || '0'),
			receivingYards: parseInt(row.total_receiving_yards || '0'),
			receivingTouchdowns: parseInt(row.total_receiving_touchdowns || '0'),
			targets: parseInt(row.total_targets || '0'),
			longestReception: parseInt(row.longest_reception || '0'),
			gamesPlayed: parseInt(row.games_played || '0'),
			totalReceptions: parseInt(row.total_receptions || '0'),
			totalReceivingYards: parseInt(row.total_receiving_yards || '0'),
			totalReceivingTouchdowns: parseInt(row.total_receiving_touchdowns || '0'),
			totalTargets: parseInt(row.total_targets || '0'),
			avgReceivingYards: parseFloat(row.avg_receiving_yards || '0'),
			avgReceptions: parseFloat(row.avg_receptions || '0')
		}));

		return json({
			success: true,
			data: players,
			season,
			seasonType,
			week,
			teamAbbreviation,
			position,
			count: players.length
		});
	} catch (error: any) {
		console.error('Error fetching receiving yards:', error);
		return json(
			{
				success: false,
				error: error?.message ?? 'Unknown server error'
			},
			{ status: 500 }
		);
	}
};

