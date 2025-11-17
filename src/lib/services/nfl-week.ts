import { db } from '$lib/database/connection.js';

export type SeasonType = 'PRE' | 'REG' | 'POST';

/**
 * Determines the current NFL week based on games in the database
 * Returns the week number that contains games scheduled for today or the nearest future week
 */
export async function getCurrentNflWeek(
	season: number,
	seasonType: SeasonType = 'REG'
): Promise<number | null> {
	try {
		// Get NFL sport ID
		const [sport] = await db`
			SELECT id FROM sports WHERE code = 'NFL' LIMIT 1
		`;

		if (!sport) {
			return null;
		}

		const now = new Date();
		// Look for games within a 2-week window (past week and next week)
		const startDate = new Date(now);
		startDate.setDate(startDate.getDate() - 7);
		const endDate = new Date(now);
		endDate.setDate(endDate.getDate() + 14);

		// Get games around the current date
		const games = await db`
			SELECT DISTINCT
				g.game_date,
				g.external_id
			FROM games g
			WHERE g.sport_id = ${sport.id}
				AND g.game_date >= ${startDate}::timestamp with time zone
				AND g.game_date <= ${endDate}::timestamp with time zone
			ORDER BY g.game_date ASC
			LIMIT 20
		`;

		if (games.length === 0) {
			return null;
		}

		// Try to determine week from games by matching game dates to weeks in nfl_team_touchdowns
		// This finds which week has games closest to today
		const [currentWeekFromGames] = await db`
			SELECT DISTINCT ntt.week
			FROM games g
			JOIN nfl_team_touchdowns ntt ON ntt.season = ${season} AND ntt.season_type = ${seasonType}
			WHERE g.sport_id = ${sport.id}
				AND g.game_date >= ${startDate}::timestamp with time zone
				AND g.game_date <= ${endDate}::timestamp with time zone
			ORDER BY ABS(EXTRACT(EPOCH FROM (g.game_date - ${now}::timestamp with time zone)))
			LIMIT 1
		`;

		if (currentWeekFromGames) {
			return currentWeekFromGames.week;
		}

		// Try to determine week from nfl_weeks table
		// Check which week has games closest to today
		const [currentWeek] = await db`
			SELECT DISTINCT nw.week
			FROM nfl_weeks nw
			JOIN games g ON g.sport_id = ${sport.id}
			WHERE nw.season = ${season}
				AND nw.season_type = ${seasonType}
				AND g.game_date >= ${startDate}::timestamp with time zone
				AND g.game_date <= ${endDate}::timestamp with time zone
			ORDER BY ABS(EXTRACT(EPOCH FROM (g.game_date - ${now}::timestamp with time zone)))
			LIMIT 1
		`;

		if (currentWeek) {
			return currentWeek.week;
		}

		// Fallback: Try to get week from nfl_team_touchdowns table
		const [weekFromTouchdowns] = await db`
			SELECT DISTINCT week
			FROM nfl_team_touchdowns
			WHERE season = ${season}
				AND season_type = ${seasonType}
			ORDER BY week DESC
			LIMIT 1
		`;

		if (weekFromTouchdowns) {
			return weekFromTouchdowns.week;
		}

		// Final fallback: If we're in November, determine likely week
		// This is a temporary fallback until we have better week detection
		if (season === 2025 && seasonType === 'REG') {
			const month = now.getMonth() + 1; // getMonth() returns 0-11
			const day = now.getDate();
			// Week 11 is typically mid-November (around Nov 13-19)
			if (month === 11 && day >= 13 && day <= 19) {
				return 11;
			}
			// If we're past week 11, return the latest week we have data for
			if (month === 11 && day > 19) {
				// Try to get the latest week from database
				const [latestWeek] = await db`
					SELECT MAX(week) as week
					FROM nfl_team_touchdowns
					WHERE season = ${season}
						AND season_type = ${seasonType}
				`;
				if (latestWeek && latestWeek.week) {
					return latestWeek.week;
				}
			}
		}

		return null;
	} catch (error) {
		console.error('Error determining current NFL week:', error);
		return null;
	}
}

/**
 * Gets the current week from Sportradar schedule
 * This is more accurate as it uses the actual schedule
 */
export async function getCurrentWeekFromSchedule(
	season: number,
	seasonType: SeasonType = 'REG'
): Promise<number | null> {
	try {
		const { SPORTRADAR_API_KEY } = await import('$env/static/private');
		if (!SPORTRADAR_API_KEY) {
			return null;
		}

		const NFL_BASE_URL = 'https://api.sportradar.com/nfl/official/trial/v7/en';
		const now = new Date();

		// Fetch the schedule to find current week
		const mapSeasonType = (type: SeasonType) => {
			return type === 'PRE' ? 'PRE' : type === 'POST' ? 'PST' : 'REG';
		};

		const scheduleUrl = `${NFL_BASE_URL}/games/${season}/${mapSeasonType(seasonType)}/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
		const response = await fetch(scheduleUrl);

		if (!response.ok) {
			return null;
		}

		const schedule = await response.json();
		const weeks = Array.isArray(schedule?.weeks) ? schedule.weeks : [];

		// Find the week that contains games around the current date
		// NFL weeks typically run Thursday to Monday/Tuesday
		// Look for games within 3 days before or after today
		for (const weekData of weeks) {
			const games = Array.isArray(weekData?.games) ? weekData.games : [];
			const weekNumber = weekData.sequence || weekData.week || null;

			if (!weekNumber) continue;

			// Check if any game in this week is within 3 days of now (before or after)
			for (const game of games) {
				if (game.scheduled) {
					const gameDate = new Date(game.scheduled);
					const daysDiff = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

					// If game is within 3 days before or 7 days after, it's the current week
					if (daysDiff >= -3 && daysDiff <= 7) {
						return weekNumber;
					}
				}
			}
		}

		// If no current week found, find the week with the nearest future game
		let nearestWeek: number | null = null;
		let nearestDaysDiff = Infinity;

		for (const weekData of weeks) {
			const games = Array.isArray(weekData?.games) ? weekData.games : [];
			const weekNumber = weekData.sequence || weekData.week || null;

			if (!weekNumber) continue;

			for (const game of games) {
				if (game.scheduled) {
					const gameDate = new Date(game.scheduled);
					const daysDiff = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

					// Prefer future games, but accept past games if no future games found
					if (daysDiff >= -7 && daysDiff < nearestDaysDiff) {
						nearestDaysDiff = daysDiff;
						nearestWeek = weekNumber;
					}
				}
			}
		}

		if (nearestWeek !== null) {
			return nearestWeek;
		}

		// Final fallback: return the latest week with games
		for (let i = weeks.length - 1; i >= 0; i--) {
			const weekData = weeks[i];
			const games = Array.isArray(weekData?.games) ? weekData.games : [];
			if (games.length > 0) {
				return weekData.sequence || weekData.week || null;
			}
		}

		return null;
	} catch (error) {
		console.error('Error getting current week from schedule:', error);
		return null;
	}
}

