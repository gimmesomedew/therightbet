import type { PageServerLoad } from './$types';
import { db } from '$lib/database/connection.js';

export const load: PageServerLoad = async ({ url }) => {
	const season = parseInt(url.searchParams.get('season') || '2025');
	const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();

	// Get the current week (highest week with data)
	let currentWeek = 1;
	try {
		const latestWeek = await db`
			SELECT MAX(week) as max_week
			FROM nfl_weeks
			WHERE season = ${season}
				AND season_type = ${seasonType}
				AND has_data = true
		`;
		if (latestWeek[0]?.max_week) {
			currentWeek = latestWeek[0].max_week;
		}
	} catch (error) {
		console.error('Error fetching current week:', error);
	}

	return {
		season,
		seasonType,
		currentWeek
	};
};


