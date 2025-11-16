import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const teams = await db`
			SELECT 
				t.id,
				t.name,
				t.city,
				t.abbreviation,
				t.logo_url,
				t.external_id,
				COUNT(p.id) as player_count
			FROM teams t
			LEFT JOIN players p ON t.id = p.team_id
			WHERE t.sport_id = (SELECT id FROM sports WHERE code = 'WNBA')
			GROUP BY t.id, t.name, t.city, t.abbreviation, t.logo_url, t.external_id
			ORDER BY t.name
		`;
		
		return json({
			success: true,
			data: teams
		});
	} catch (error) {
		console.error('Error fetching WNBA teams:', error);
		
		return json({
			success: false,
			message: 'Failed to fetch WNBA teams',
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
