import type { PageServerLoad } from './$types';
import { fetchNflTouchdownsFromDb } from '$lib/services/nfl-touchdowns-db';
import { getAvailableWeeks, type TouchdownResponse, type AvailableWeek } from '$lib/services/nfl-touchdowns';
import { getCurrentNflWeek, getCurrentWeekFromSchedule, type SeasonType } from '$lib/services/nfl-week';
import { env } from '$env/dynamic/private';

interface SelectionOption {
	value: string | number;
	label: string;
}

function getDefaultSeason(): number {
	const now = new Date();
	const year = now.getFullYear();
	// NFL regular season primarily spans into the next calendar year.
	// For November (month 10), we're in the middle of the current year's season
	return now.getMonth() < 6 ? year - 1 : year;
}

/**
 * Determines the best season to display.
 * During mid-season (months 9-11), prefer the previous year's completed season.
 */
function getDefaultSeasonForDisplay(): number {
	// Default to 2025 season (current NFL season)
	return 2025;
}

function normalizeSeasonType(value: string | null): SeasonType {
	const normalized = (value ?? 'REG').toUpperCase();
	if (normalized === 'PRE' || normalized === 'POST') {
		return normalized;
	}
	return 'REG';
}

function normalizeWeek(value: string | null, seasonType: SeasonType): number {
	const parsed = Number(value);
	const defaultWeek = seasonType === 'PRE' ? 1 : 1;

	if (Number.isNaN(parsed) || parsed < 1) return defaultWeek;

	const maxWeek = seasonType === 'PRE' ? 3 : seasonType === 'POST' ? 5 : 18;
	return Math.min(parsed, maxWeek);
}

function getSeasonOptions(): SelectionOption[] {
	const currentYear = getDefaultSeasonForDisplay();
	return Array.from({ length: 4 }, (_, index) => {
		const season = currentYear - index;
		return {
			value: season,
			label: `${season} Season`
		};
	});
}

function getSeasonTypeOptions(): SelectionOption[] {
	return [
		{ value: 'PRE', label: 'Preseason' },
		{ value: 'REG', label: 'Regular Season' },
		{ value: 'POST', label: 'Postseason' }
	];
}

function getWeekOptions(seasonType: SeasonType, availableWeeks?: AvailableWeek[], currentWeek?: number | null): SelectionOption[] {
	const maxWeek = seasonType === 'PRE' ? 3 : seasonType === 'POST' ? 5 : 18;

	// If we have availability data, show weeks that have data, plus current week if different
	if (availableWeeks && availableWeeks.length > 0) {
		const weeksWithData = availableWeeks
			.filter((w) => w.hasData)
			.map((w) => ({
				value: w.week,
				label: seasonType === 'POST' ? `Week ${w.week} (Postseason)` : `Week ${w.week}`,
				hasData: true
			}));
		
		// Add current week if it's not already in the list and it's a valid week
		if (currentWeek && currentWeek >= 1 && currentWeek <= maxWeek) {
			const hasCurrentWeek = weeksWithData.some(w => w.value === currentWeek);
			if (!hasCurrentWeek) {
				weeksWithData.push({
					value: currentWeek,
					label: seasonType === 'POST' ? `Week ${currentWeek} (Postseason)` : `Week ${currentWeek}`,
					hasData: false
				});
			}
		}
		
		// Sort by week number
		return weeksWithData.sort((a, b) => Number(a.value) - Number(b.value));
	}

	// Fallback to all possible weeks if we couldn't determine availability
	return Array.from({ length: maxWeek }, (_, index) => {
		const week = index + 1;
		return {
			value: week,
			label: seasonType === 'POST' ? `Week ${week} (Postseason)` : `Week ${week}`
		};
	});
}

export const load: PageServerLoad = async ({ url }) => {
	const selectedSeasonType = normalizeSeasonType(url.searchParams.get('seasonType'));
	
	// Use season from URL if provided, otherwise use the best default for this time of year
	const seasonParam = url.searchParams.get('season');
	let selectedSeason: number;
	
	if (seasonParam) {
		const parsed = Number(seasonParam);
		selectedSeason = Number.isNaN(parsed) ? getDefaultSeasonForDisplay() : parsed;
	} else {
		selectedSeason = getDefaultSeasonForDisplay();
	}

	let availableWeeks: AvailableWeek[] = [];
	let selectedWeek: number;

	try {
		// Fetch available weeks with data
		availableWeeks = await getAvailableWeeks(selectedSeason, selectedSeasonType);

		// Get requested week from URL
		const requestedWeek = Number(url.searchParams.get('week'));
		const requestedHasData =
			!Number.isNaN(requestedWeek) &&
			availableWeeks.some((w) => w.week === requestedWeek && w.hasData);

		if (requestedHasData) {
			// Use requested week if it has data
			selectedWeek = requestedWeek;
		} else {
		// Determine current week
		let currentWeek: number | null = null;

		// First, try to get current week from SportsDataIO Timeframes (most reliable)
		try {
			const SPORTSDATAIO_API_KEY = env.SPORTSDATAIO_API_KEY;
			if (SPORTSDATAIO_API_KEY) {
				const timeframesResponse = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/Timeframes/current?key=${SPORTSDATAIO_API_KEY}`);
				if (timeframesResponse.ok) {
					const timeframes = await timeframesResponse.json();
					if (Array.isArray(timeframes) && timeframes.length > 0 && timeframes[0].Week) {
						currentWeek = timeframes[0].Week;
					} else if (timeframes && typeof timeframes === 'object' && timeframes.Week) {
						currentWeek = timeframes.Week;
					}
				}
			}
		} catch (error) {
			// Continue to fallback methods
		}

		// Try to get current week from database
		if (!currentWeek) {
			currentWeek = await getCurrentNflWeek(selectedSeason, selectedSeasonType);
		}

		// If not found in database, try Sportradar schedule
		if (!currentWeek) {
			currentWeek = await getCurrentWeekFromSchedule(selectedSeason, selectedSeasonType);
		}

			// If we found a current week and it has data, use it
			if (currentWeek && availableWeeks.some((w) => w.week === currentWeek && w.hasData)) {
				selectedWeek = currentWeek;
			} else {
				// Fallback to first week with data, or week 1
				if (availableWeeks.every((w) => !w.hasData)) {
					selectedWeek = currentWeek || 1;
				} else {
					const firstWeekWithData = availableWeeks.find((w) => w.hasData);
					selectedWeek = firstWeekWithData?.week ?? currentWeek ?? 1;
				}
			}
		}
	} catch (error) {
		console.error('Error fetching available weeks:', error);
		// Try to get current week as fallback
		const currentWeek = await getCurrentNflWeek(selectedSeason, selectedSeasonType);
		selectedWeek = currentWeek || 1;
	}

	let touchdowns: TouchdownResponse;

	try {
		// Try to fetch from database first
		const dbData = await fetchNflTouchdownsFromDb({
			season: selectedSeason,
			seasonType: selectedSeasonType,
			week: selectedWeek
		});

		if (dbData) {
			touchdowns = dbData;
		} else {
			// If no database data, fallback to API
			console.log(`No database data for week ${selectedWeek}, fetching from API...`);
			const { fetchNflTouchdowns } = await import('$lib/services/nfl-touchdowns');
			touchdowns = await fetchNflTouchdowns({
				season: selectedSeason,
				seasonType: selectedSeasonType,
				week: selectedWeek
			});
		}
	} catch (error) {
		console.error('Error fetching NFL touchdown data in page load:', error);
		throw error;
	}

	return {
		selectedSeason,
		selectedSeasonType,
		selectedWeek,
		seasonOptions: getSeasonOptions(),
		seasonTypeOptions: getSeasonTypeOptions(),
		weekOptions: getWeekOptions(selectedSeasonType, availableWeeks, currentWeek),
		touchdowns
	};
};

