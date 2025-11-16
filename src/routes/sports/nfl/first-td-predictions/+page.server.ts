import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const season = parseInt(url.searchParams.get('season') || '2025');
	const seasonType = (url.searchParams.get('seasonType') || 'REG').toUpperCase();
	const week = parseInt(url.searchParams.get('week') || '11');

	return {
		season,
		seasonType,
		week
	};
};


