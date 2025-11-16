import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchNflTouchdownsFromDb } from '$lib/services/nfl-touchdowns-db';
import { fetchNflTouchdowns } from '$lib/services/nfl-touchdowns';

function parseSeason(value: string | null): number {
	const currentYear = new Date().getFullYear();
	if (!value) return currentYear;

	const parsed = Number(value);
	return Number.isNaN(parsed) ? currentYear : parsed;
}

function parseWeek(value: string | null): number {
	const parsed = Number(value);
	if (Number.isNaN(parsed)) return 1;
	return Math.max(1, parsed);
}

export const GET: RequestHandler = async ({ url }) => {
	const season = parseSeason(url.searchParams.get('season'));
	const seasonTypeParam = (url.searchParams.get('seasonType') ?? 'REG').toUpperCase();
	const week = parseWeek(url.searchParams.get('week'));

	const seasonType = seasonTypeParam === 'PRE' || seasonTypeParam === 'POST' ? seasonTypeParam : 'REG';

	try {
		// Try to fetch from database first
		const dbData = await fetchNflTouchdownsFromDb({
			season,
			seasonType,
			week
		});

		if (dbData) {
			return json(
				{
					success: true,
					data: dbData
				},
				{
					headers: {
						'Cache-Control': 'public, max-age=300'
					}
				}
			);
		}

		// Fallback to API if no database data
		console.log(`No database data found for ${season} ${seasonType} week ${week}, falling back to API`);
		const data = await fetchNflTouchdowns({
			season,
			seasonType,
			week
		});

		return json(
			{
				success: true,
				data
			},
			{
				headers: {
					'Cache-Control': 'public, max-age=300'
				}
			}
		);
	} catch (error: any) {
		console.error('NFL touchdowns API error:', error);
		return json(
			{
				success: false,
				error: error?.message ?? 'Unknown server error'
			},
			{ status: 500 }
		);
	}
};

