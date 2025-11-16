import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export interface TeamFirstTdStats {
	teamAbbreviation: string;
	teamDisplayName: string;
	totalGames: number;
	topScorers: Array<{
		playerName: string;
		playerId: string;
		position: string | null;
		touchdownType: string;
		count: number;
		percentage: number;
	}>;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const season = parseInt(url.searchParams.get('season') || '2025');
		const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();

		// Get first TD scorer statistics grouped by team
		const stats = await db`
			WITH team_stats AS (
				SELECT 
					ft.team_abbreviation,
					ft.player_name,
					ft.player_id,
					ft.position,
					ft.touchdown_type,
					COUNT(*) as first_td_count
				FROM nfl_first_touchdown_scorers ft
				JOIN nfl_weeks w ON ft.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
				GROUP BY ft.team_abbreviation, ft.player_name, ft.player_id, ft.position, ft.touchdown_type
			),
			team_totals AS (
				SELECT 
					team_abbreviation,
					SUM(first_td_count) as total_first_tds
				FROM team_stats
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
					AND w.has_data = true
			)
			SELECT 
				ts.team_abbreviation,
				COALESCE(ti.team_display_name, ts.team_abbreviation) as team_display_name,
				tt.total_first_tds as total_games,
				ts.player_name,
				ts.player_id,
				ts.position,
				ts.touchdown_type,
				ts.first_td_count,
				ROUND((ts.first_td_count::float / tt.total_first_tds * 100)::numeric, 1) as percentage
			FROM team_stats ts
			JOIN team_totals tt ON ts.team_abbreviation = tt.team_abbreviation
			LEFT JOIN team_info ti ON ts.team_abbreviation = ti.team_abbreviation
			ORDER BY ts.team_abbreviation, ts.first_td_count DESC, ts.player_name
		`;

		// Group results by team
		const teamMap = new Map<string, TeamFirstTdStats>();

		for (const row of stats) {
			const teamAbbr = row.team_abbreviation;
			
			if (!teamMap.has(teamAbbr)) {
				teamMap.set(teamAbbr, {
					teamAbbreviation: teamAbbr,
					teamDisplayName: row.team_display_name || teamAbbr,
					totalGames: parseInt(row.total_games || '0'),
					topScorers: []
				});
			}

			const team = teamMap.get(teamAbbr)!;
			team.topScorers.push({
				playerName: row.player_name,
				playerId: row.player_id,
				position: row.position,
				touchdownType: row.touchdown_type,
				count: parseInt(row.first_td_count || '0'),
				percentage: parseFloat(row.percentage || '0')
			});
		}

		// Convert to array and limit to top 3 scorers per team
		const results: TeamFirstTdStats[] = Array.from(teamMap.values()).map((team) => ({
			...team,
			topScorers: team.topScorers.slice(0, 3) // Top 3 scorers per team
		}));

		// Sort by team abbreviation
		results.sort((a, b) => a.teamAbbreviation.localeCompare(b.teamAbbreviation));

		return json({
			success: true,
			data: results,
			season,
			seasonType
		});
	} catch (error: any) {
		console.error('Error fetching team first TD statistics:', error);
		return json(
			{
				success: false,
				error: error?.message ?? 'Unknown server error'
			},
			{ status: 500 }
		);
	}
};


