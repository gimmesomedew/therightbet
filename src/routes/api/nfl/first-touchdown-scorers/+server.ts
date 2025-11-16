import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export interface FirstTouchdownScorer {
	gameId: string;
	teamAbbreviation: string;
	playerName: string;
	position: string | null;
	touchdownType: string;
	quarter: number;
	clock: string;
	scoreAtTd: string;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const season = parseInt(url.searchParams.get('season') || '2025');
		const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();
		const week = parseInt(url.searchParams.get('week') || '0');

		let query;
		if (week > 0) {
			// Get first TD scorers for a specific week
			query = db`
				SELECT 
					ft.game_id,
					ft.team_abbreviation,
					ft.player_name,
					ft.position,
					ft.touchdown_type,
					ft.quarter,
					ft.clock,
					ft.score_at_td
				FROM nfl_first_touchdown_scorers ft
				JOIN nfl_weeks w ON ft.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.week = ${week}
					AND w.has_data = true
				ORDER BY ft.quarter, ft.clock
			`;
		} else {
			// Get all first TD scorers for the season
			query = db`
				SELECT 
					ft.game_id,
					ft.team_abbreviation,
					ft.player_name,
					ft.position,
					ft.touchdown_type,
					ft.quarter,
					ft.clock,
					ft.score_at_td,
					w.week
				FROM nfl_first_touchdown_scorers ft
				JOIN nfl_weeks w ON ft.week_id = w.id
				WHERE w.season = ${season}
					AND w.season_type = ${seasonType}
					AND w.has_data = true
				ORDER BY w.week, ft.quarter, ft.clock
			`;
		}

		const results = await query;

		const scorers: FirstTouchdownScorer[] = results.map((row) => ({
			gameId: row.game_id,
			teamAbbreviation: row.team_abbreviation,
			playerName: row.player_name,
			position: row.position,
			touchdownType: row.touchdown_type,
			quarter: row.quarter,
			clock: row.clock,
			scoreAtTd: row.score_at_td
		}));

		return json({
			success: true,
			data: scorers,
			season,
			seasonType,
			week: week > 0 ? week : null
		});
	} catch (error: any) {
		console.error('Error fetching first touchdown scorers:', error);
		return json(
			{
				success: false,
				error: error?.message ?? 'Unknown server error'
			},
			{ status: 500 }
		);
	}
};


