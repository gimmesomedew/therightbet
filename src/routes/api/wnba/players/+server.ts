import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const teamId = url.searchParams.get('teamId');
		
		let players;
		if (teamId) {
			// Get players for specific team
			players = await db`
				SELECT 
					p.id,
					p.first_name,
					p.last_name,
					p.position,
					p.jersey_number,
					p.height,
					p.weight,
					p.external_id,
					t.name as team_name,
					t.abbreviation as team_abbreviation
				FROM players p
				JOIN teams t ON p.team_id = t.id
				WHERE p.team_id = ${teamId}
				ORDER BY p.jersey_number, p.last_name
			`;
		} else {
			// Get all players
			players = await db`
				SELECT 
					p.id,
					p.first_name,
					p.last_name,
					p.position,
					p.jersey_number,
					p.height,
					p.weight,
					p.external_id,
					t.name as team_name,
					t.abbreviation as team_abbreviation
				FROM players p
				JOIN teams t ON p.team_id = t.id
				WHERE t.sport_id = (SELECT id FROM sports WHERE code = 'WNBA')
				ORDER BY t.name, p.jersey_number, p.last_name
			`;
		}
		
		return json({
			success: true,
			data: players
		});
	} catch (error) {
		console.error('Error fetching WNBA players:', error);
		
		return json({
			success: false,
			message: 'Failed to fetch WNBA players',
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
