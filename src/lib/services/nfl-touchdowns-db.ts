import { db } from '$lib/database/connection.js';
import type { TouchdownResponse, TeamTouchdownSummary, PlayerTouchdownSummary } from './nfl-touchdowns.js';

type SeasonType = 'PRE' | 'REG' | 'POST';

interface FetchParams {
	season: number;
	seasonType: SeasonType;
	week: number;
}

/**
 * Fetches NFL touchdown data from the database
 */
export async function fetchNflTouchdownsFromDb(params: FetchParams): Promise<TouchdownResponse | null> {
	try {
		// Check if week has data
		const [weekRecord] = await db`
			SELECT id, has_data, synced_at
			FROM nfl_weeks
			WHERE season = ${params.season}
				AND season_type = ${params.seasonType}
				AND week = ${params.week}
		`;

		if (!weekRecord || !weekRecord.has_data) {
			return null;
		}

		const weekId = weekRecord.id;

		// Fetch teams with their touchdown data
		const teams = await db`
			SELECT 
				tt.id,
				tt.team_abbreviation,
				tt.team_display_name,
				tt.team_location,
				tt.team_mascot,
				tt.total_touchdowns
			FROM nfl_team_touchdowns tt
			WHERE tt.week_id = ${weekId}
			ORDER BY tt.team_abbreviation
		`;

		if (teams.length === 0) {
			return null;
		}

		// Fetch players for each team
		const teamSummaries: TeamTouchdownSummary[] = [];

		for (const team of teams) {
			const players = await db`
				SELECT 
					player_id,
					player_name,
					position,
					rushing_touchdowns,
					receiving_touchdowns,
					passing_touchdowns,
					return_touchdowns,
					defensive_touchdowns,
					total_touchdowns
				FROM nfl_player_touchdowns
				WHERE team_touchdown_id = ${team.id}
				ORDER BY total_touchdowns DESC, player_name
			`;

			const playerSummaries: PlayerTouchdownSummary[] = players.map((p) => ({
				playerId: p.player_id,
				playerName: p.player_name,
				position: p.position,
				team: team.team_abbreviation,
				rushing: p.rushing_touchdowns || 0,
				receiving: p.receiving_touchdowns || 0,
				passing: p.passing_touchdowns || 0,
				return: p.return_touchdowns || 0,
				defensive: p.defensive_touchdowns || 0,
				total: p.total_touchdowns || 0
			}));

			teamSummaries.push({
				team: {
					abbreviation: team.team_abbreviation,
					displayName: team.team_display_name,
					location: team.team_location || '',
					mascot: team.team_mascot || '',
					logo: `/logos/nfl/${team.team_abbreviation.toLowerCase()}.png`
				},
				totalTouchdowns: team.total_touchdowns || 0,
				players: playerSummaries
			});
		}

		return {
			season: params.season,
			seasonType: params.seasonType,
			week: params.week,
			updatedAt: weekRecord.synced_at?.toISOString() || new Date().toISOString(),
			source: 'sportradar',
			teams: teamSummaries
		};
	} catch (error) {
		console.error('Error fetching NFL touchdown data from database:', error);
		return null;
	}
}


