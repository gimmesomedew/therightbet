import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Get team statistics with player counts
		const teamStats = await db`
			SELECT 
				t.id,
				t.name,
				t.abbreviation,
				t.logo_url,
				t.city,
				COUNT(p.id) as player_count,
				COUNT(CASE WHEN p.position = 'PG' THEN 1 END) as pg_count,
				COUNT(CASE WHEN p.position = 'SG' THEN 1 END) as sg_count,
				COUNT(CASE WHEN p.position = 'SF' THEN 1 END) as sf_count,
				COUNT(CASE WHEN p.position = 'PF' THEN 1 END) as pf_count,
				COUNT(CASE WHEN p.position = 'C' THEN 1 END) as c_count
			FROM teams t
			LEFT JOIN players p ON t.id = p.team_id
			WHERE t.sport_id = (SELECT id FROM sports WHERE code = 'WNBA')
			GROUP BY t.id, t.name, t.abbreviation, t.logo_url, t.city
			ORDER BY t.name
		`;

		// Transform the data
		const transformedStats = teamStats.map(team => ({
			id: team.id,
			name: team.name,
			abbreviation: team.abbreviation,
			city: team.city,
			logo: team.logo_url || `/logos/${team.abbreviation.toLowerCase()}.png`,
			playerCount: parseInt(team.player_count),
			positionBreakdown: {
				PG: parseInt(team.pg_count),
				SG: parseInt(team.sg_count),
				SF: parseInt(team.sf_count),
				PF: parseInt(team.pf_count),
				C: parseInt(team.c_count)
			}
		}));

		return json({
			success: true,
			data: transformedStats,
			count: transformedStats.length
		});

	} catch (error: any) {
		console.error('Error fetching team stats:', error);
		return json({
			success: false,
			message: 'Failed to fetch team statistics',
			error: error.message
		}, { status: 500 });
	}
};
