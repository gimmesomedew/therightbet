import { env } from '$env/dynamic/private';

type SeasonType = 'PRE' | 'REG' | 'POST';
type TouchdownCategory = 'rushing' | 'receiving' | 'passing' | 'return' | 'defensive';

/**
 * Simple in-memory cache for API responses.
 * Cache entries expire after 1 hour (3600000ms).
 * Key format: `season-seasonType-week`
 */
interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

const CACHE_TTL = 3600000; // 1 hour in milliseconds
const cache = new Map<string, CacheEntry<TouchdownResponse>>();

function getCacheKey(params: FetchParams): string {
	return `${params.season}-${params.seasonType}-${params.week}`;
}

function isCacheValid(entry: CacheEntry<TouchdownResponse> | undefined): boolean {
	if (!entry) return false;
	return Date.now() - entry.timestamp < CACHE_TTL;
}

function getFromCache(params: FetchParams): TouchdownResponse | null {
	const key = getCacheKey(params);
	const entry = cache.get(key);
	return isCacheValid(entry) ? entry.data : null;
}

function setInCache(params: FetchParams, data: TouchdownResponse): void {
	const key = getCacheKey(params);
	cache.set(key, { data, timestamp: Date.now() });
}

function clearExpiredCacheEntries(): void {
	const now = Date.now();
	for (const [key, entry] of cache.entries()) {
		if (now - entry.timestamp >= CACHE_TTL) {
			cache.delete(key);
		}
	}
}

export interface PlayerTouchdownSummary {
	playerId: string | number;
	playerName: string;
	position: string | null;
	team: string;
	rushing: number;
	receiving: number;
	passing: number;
	return: number;
	defensive: number;
	total: number;
}

export interface TeamTouchdownSummary {
	team: {
		abbreviation: string;
		displayName: string;
		location: string;
		mascot: string;
		logo?: string;
	};
	totalTouchdowns: number;
	players: PlayerTouchdownSummary[];
}

export interface TouchdownResponse {
	season: number;
	seasonType: SeasonType;
	week: number;
	updatedAt: string;
	source: 'sportradar' | 'mock';
	teams: TeamTouchdownSummary[];
}

interface FetchParams {
	season: number;
	seasonType: SeasonType;
	week: number;
}

interface TeamAccumulator {
	team: TeamTouchdownSummary['team'];
	players: Map<string, PlayerTouchdownSummary>;
	scoreboardTouchdowns: number;
}

interface TeamMetadata {
	location?: string;
	mascot?: string;
	displayName?: string;
}

export interface AvailableWeek {
	week: number;
	hasData: boolean;
}

const NFL_BASE_URL = 'https://api.sportradar.com/nfl/official/trial/v7/en';
const WEEKS_CACHE_TTL = 300000; // 5 minutes in milliseconds (for testing - can increase later)
const weeksCache = new Map<string, { data: AvailableWeek[]; timestamp: number }>();
const TEAM_DIRECTORY = '/logos/nfl';

const TEAM_META: Record<
	string,
	{
		location: string;
		mascot: string;
		display: string;
	}
> = {
	ARI: { location: 'Arizona', mascot: 'Cardinals', display: 'Arizona Cardinals' },
	ATL: { location: 'Atlanta', mascot: 'Falcons', display: 'Atlanta Falcons' },
	BAL: { location: 'Baltimore', mascot: 'Ravens', display: 'Baltimore Ravens' },
	BUF: { location: 'Buffalo', mascot: 'Bills', display: 'Buffalo Bills' },
	CAR: { location: 'Carolina', mascot: 'Panthers', display: 'Carolina Panthers' },
	CHI: { location: 'Chicago', mascot: 'Bears', display: 'Chicago Bears' },
	CIN: { location: 'Cincinnati', mascot: 'Bengals', display: 'Cincinnati Bengals' },
	CLE: { location: 'Cleveland', mascot: 'Browns', display: 'Cleveland Browns' },
	DAL: { location: 'Dallas', mascot: 'Cowboys', display: 'Dallas Cowboys' },
	DEN: { location: 'Denver', mascot: 'Broncos', display: 'Denver Broncos' },
	DET: { location: 'Detroit', mascot: 'Lions', display: 'Detroit Lions' },
	GB: { location: 'Green Bay', mascot: 'Packers', display: 'Green Bay Packers' },
	HOU: { location: 'Houston', mascot: 'Texans', display: 'Houston Texans' },
	IND: { location: 'Indianapolis', mascot: 'Colts', display: 'Indianapolis Colts' },
	JAX: { location: 'Jacksonville', mascot: 'Jaguars', display: 'Jacksonville Jaguars' },
	KC: { location: 'Kansas City', mascot: 'Chiefs', display: 'Kansas City Chiefs' },
	LAC: { location: 'Los Angeles', mascot: 'Chargers', display: 'Los Angeles Chargers' },
	LAR: { location: 'Los Angeles', mascot: 'Rams', display: 'Los Angeles Rams' },
	LV: { location: 'Las Vegas', mascot: 'Raiders', display: 'Las Vegas Raiders' },
	MIA: { location: 'Miami', mascot: 'Dolphins', display: 'Miami Dolphins' },
	MIN: { location: 'Minnesota', mascot: 'Vikings', display: 'Minnesota Vikings' },
	NE: { location: 'New England', mascot: 'Patriots', display: 'New England Patriots' },
	NO: { location: 'New Orleans', mascot: 'Saints', display: 'New Orleans Saints' },
	NYG: { location: 'New York', mascot: 'Giants', display: 'New York Giants' },
	NYJ: { location: 'New York', mascot: 'Jets', display: 'New York Jets' },
	PHI: { location: 'Philadelphia', mascot: 'Eagles', display: 'Philadelphia Eagles' },
	PIT: { location: 'Pittsburgh', mascot: 'Steelers', display: 'Pittsburgh Steelers' },
	SF: { location: 'San Francisco', mascot: '49ers', display: 'San Francisco 49ers' },
	SEA: { location: 'Seattle', mascot: 'Seahawks', display: 'Seattle Seahawks' },
	TB: { location: 'Tampa Bay', mascot: 'Buccaneers', display: 'Tampa Bay Buccaneers' },
	TEN: { location: 'Tennessee', mascot: 'Titans', display: 'Tennessee Titans' },
	WAS: { location: 'Washington', mascot: 'Commanders', display: 'Washington Commanders' }
};

/**
 * Fetches the list of available weeks with touchdown data for a given season/seasonType.
 * Checks the database first, then falls back to API if needed.
 */
export async function getAvailableWeeks(season: number, seasonType: SeasonType): Promise<AvailableWeek[]> {
	// First, try to get available weeks from database
	try {
		const { db } = await import('$lib/database/connection.js');
		const dbWeeks = await db`
			SELECT week, has_data
			FROM nfl_weeks
			WHERE season = ${season} AND season_type = ${seasonType}
			ORDER BY week
		`;

		if (dbWeeks.length > 0) {
			console.log(`Found ${dbWeeks.length} weeks in database for ${season} ${seasonType}`);
			return dbWeeks.map((w) => ({
				week: w.week,
				hasData: w.has_data
			}));
		}
	} catch (error) {
		console.log('Could not fetch weeks from database, falling back to API:', error);
	}

	// Fallback to API-based detection
	const apiKey = env.SPORTRADAR_API_KEY;
	const cacheKey = `${season}-${seasonType}`;

	// Check cache
	const cached = weeksCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < WEEKS_CACHE_TTL) {
		console.log(`Cache hit for available weeks: ${season} ${seasonType}`);
		return cached.data;
	}

	if (!apiKey) {
		console.warn('SPORTRADAR_API_KEY is missing. Cannot fetch available weeks.');
		return [];
	}

	try {
		const schedule = await makeRequest<any>(apiKey, `/games/${season}/${mapSeasonType(seasonType)}/schedule.json`);
		const weeks: AvailableWeek[] = [];

		// Extract weeks from the schedule and check if they have completed games with full statistics
		const allWeeks = Array.isArray(schedule?.weeks) ? schedule.weeks : [];
		for (const weekData of allWeeks) {
			const games = Array.isArray(weekData?.games) ? weekData.games : [];
			const weekNumber = weekData.sequence || weeks.length + 1;

			// Check if this week has any closed games with player-level statistics
			let hasData = false;
			const closedGames = games.filter((g: any) => g.status === 'closed');
			
			if (closedGames.length > 0) {
				// Try to fetch statistics for the first closed game
				// Check if it has player-level statistics (arrays with length > 0)
				const firstClosedGame = closedGames[0];
				try {
					const gameStats = await makeRequest<any>(apiKey, `/games/${firstClosedGame.id}/statistics.json`);
					const rushingPlayers = gameStats?.statistics?.home?.rushing?.players;
					const passingPlayers = gameStats?.statistics?.home?.passing?.players;
					const receivingPlayers = gameStats?.statistics?.home?.receiving?.players;
					
					// Week has data if any player array exists and has length > 0
					hasData =
						(Array.isArray(rushingPlayers) && rushingPlayers.length > 0) ||
						(Array.isArray(passingPlayers) && passingPlayers.length > 0) ||
						(Array.isArray(receivingPlayers) && receivingPlayers.length > 0);
				} catch (error) {
					// If we can't fetch stats, assume the week doesn't have complete data yet
					hasData = false;
				}
			}

			weeks.push({
				week: weekNumber,
				hasData
			});
		}

		// Cache the result
		weeksCache.set(cacheKey, { data: weeks, timestamp: Date.now() });
		console.log(`Found ${weeks.filter(w => w.hasData).length} weeks with data for ${season} ${seasonType}`);
		return weeks;
	} catch (error) {
		console.error('Failed to fetch available weeks:', error);
		return [];
	}
}

export async function fetchNflTouchdowns(params: FetchParams): Promise<TouchdownResponse> {
	// Check cache first
	const cachedResult = getFromCache(params);
	if (cachedResult) {
		console.log(`Cache hit for week ${params.week} of ${params.season} ${params.seasonType}`);
		return cachedResult;
	}

	// Periodically clean up expired entries
	clearExpiredCacheEntries();

	const apiKey = env.SPORTRADAR_API_KEY;
	const meta: Omit<TouchdownResponse, 'teams'> = {
		season: params.season,
		seasonType: params.seasonType,
		week: params.week,
		updatedAt: new Date().toISOString(),
		source: 'sportradar'
	};

	if (!apiKey) {
		console.warn('SPORTRADAR_API_KEY is missing. Falling back to mock NFL touchdown data.');
		const mockResult = {
			...meta,
			source: 'mock' as const,
			teams: buildMockTouchdownData(params)
		};
		setInCache(params, mockResult);
		return mockResult;
	}

	try {
		// Validate week is within regular season bounds
		const maxWeek = params.seasonType === 'REG' ? 18 : params.seasonType === 'PRE' ? 3 : 5;
		if (params.week < 1 || params.week > maxWeek) {
			console.warn(`Week ${params.week} is outside valid range (1-${maxWeek}) for ${params.seasonType}`);
			const emptyResult = {
				...meta,
				source: 'sportradar' as const,
				teams: []
			};
			setInCache(params, emptyResult);
			return emptyResult;
		}

		const schedule = await makeRequest<any>(
			apiKey,
			`/games/${params.season}/${mapSeasonType(params.seasonType)}/${params.week}/schedule.json`
		);

		const games: any[] = Array.isArray(schedule?.week?.games)
			? schedule.week.games
			: Array.isArray(schedule?.games)
			? schedule.games
			: [];

		if (games.length === 0) {
			console.log(`No games found for week ${params.week} of ${params.season} ${params.seasonType}`);
			// Return empty result instead of mock data when no games are scheduled
			const emptyResult = {
				...meta,
				source: 'sportradar' as const,
				teams: []
			};
			setInCache(params, emptyResult);
			return emptyResult;
		}

		const teamAccumulators = new Map<string, TeamAccumulator>();

		const results = await Promise.allSettled(
			games.map((game) => makeRequest<any>(apiKey, `/games/${game.id}/statistics.json`))
		);

		results.forEach((result, index) => {
			if (result.status !== 'fulfilled') return;
			const statistics = result.value?.statistics;
			const game = games[index];
			if (!statistics) return;

			processTeamStatistics(teamAccumulators, statistics.home, game?.home);
			processTeamStatistics(teamAccumulators, statistics.away, game?.away);
		});

		const teams = buildTeamSummaries(teamAccumulators);

		// Return real data even if no touchdowns were scored
		// (as long as games were played in this week)
		const result = {
			...meta,
			teams
		};
		setInCache(params, result);
		return result;
	} catch (error) {
		console.error('Failed to fetch NFL touchdown data from Sportradar:', error);
		const mockResult = {
			...meta,
			source: 'mock' as const,
			teams: buildMockTouchdownData(params)
		};
		setInCache(params, mockResult);
		return mockResult;
	}
}

async function makeRequest<T>(apiKey: string, endpoint: string): Promise<T> {
	const url = `${NFL_BASE_URL}${endpoint}?api_key=${apiKey}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Sportradar API error: ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as T;
}

function processTeamStatistics(
	accumulators: Map<string, TeamAccumulator>,
	statsTeam: any,
	scheduleTeam: any
) {
	if (!statsTeam && !scheduleTeam) return;

	const alias = resolveAlias(statsTeam) ?? resolveAlias(scheduleTeam);
	if (!alias) return;

	const teamMeta = buildTeamMeta(alias, statsTeam, scheduleTeam);
	const accumulator = ensureTeamAccumulator(accumulators, alias, teamMeta);

	const scoreboardTouchdowns = safeNumber(statsTeam?.touchdowns?.total);
	if (scoreboardTouchdowns > accumulator.scoreboardTouchdowns) {
		accumulator.scoreboardTouchdowns = scoreboardTouchdowns;
	}

	addTouchdownsFromPlayers(accumulator, statsTeam?.rushing?.players, 'rushing');
	addTouchdownsFromPlayers(accumulator, statsTeam?.receiving?.players, 'receiving');
	addTouchdownsFromPlayers(accumulator, statsTeam?.passing?.players, 'passing');
	addTouchdownsFromPlayers(accumulator, statsTeam?.kick_returns?.players, 'return');
	addTouchdownsFromPlayers(accumulator, statsTeam?.punt_returns?.players, 'return');
	addTouchdownsFromPlayers(accumulator, statsTeam?.misc_returns?.players, 'return');
	addTouchdownsFromPlayers(accumulator, statsTeam?.int_returns?.players, 'defensive');
	addTouchdownsFromPlayers(
		accumulator,
		statsTeam?.fumbles?.players,
		'defensive',
		['return_touchdowns', 'own_rec_tds', 'opp_rec_tds', 'ez_rec_tds']
	);
}

function ensureTeamAccumulator(
	accumulators: Map<string, TeamAccumulator>,
	alias: string,
	meta: TeamMetadata
): TeamAccumulator {
	const key = alias.toUpperCase();
	let accumulator = accumulators.get(key);

	if (!accumulator) {
		const defaults = TEAM_META[key] ?? {
			location: meta.location ?? alias,
			mascot: meta.mascot ?? '',
			display: meta.displayName ?? alias
		};

		accumulator = {
			team: {
				abbreviation: key,
				displayName: meta.displayName ?? defaults.display,
				location: meta.location ?? defaults.location,
				mascot: meta.mascot ?? defaults.mascot,
				logo: `${TEAM_DIRECTORY}/${key.toLowerCase()}.png`
			},
			players: new Map(),
			scoreboardTouchdowns: 0
		};

		accumulators.set(key, accumulator);
	}

	return accumulator;
}

function buildTeamMeta(alias: string, statsTeam: any, scheduleTeam: any): TeamMetadata {
	const market = statsTeam?.market ?? scheduleTeam?.market;
	const name = statsTeam?.name ?? scheduleTeam?.name;
	return {
		location: market ?? TEAM_META[alias]?.location ?? alias,
		mascot: name ?? TEAM_META[alias]?.mascot ?? '',
		displayName: buildDisplayName(market, name) ?? TEAM_META[alias]?.display ?? alias
	};
}

function addTouchdownsFromPlayers(
	accumulator: TeamAccumulator,
	players: any[],
	category: TouchdownCategory,
	extraFields: string[] = ['touchdowns']
) {
	if (!Array.isArray(players)) return;

	for (const player of players) {
		const touchdowns = extractTouchdownCount(player, extraFields);
		if (touchdowns <= 0) continue;

		const playerId = String(
			player?.id ??
				player?.sr_id ??
				player?.player_id ??
				`${accumulator.team.abbreviation}-${player?.name ?? 'unknown'}-${category}`
		);

		const existing = accumulator.players.get(playerId);
		const summary: PlayerTouchdownSummary =
			existing ??
			{
				playerId,
				playerName: player?.name ?? player?.full_name ?? 'Unknown Player',
				position: player?.position ?? null,
				team: accumulator.team.abbreviation,
				rushing: 0,
				receiving: 0,
				passing: 0,
				return: 0,
				defensive: 0,
				total: 0
			};

		summary[category] += touchdowns;
		summary.total =
			summary.rushing + summary.receiving + summary.passing + summary.return + summary.defensive;

		accumulator.players.set(playerId, summary);
	}
}

function buildTeamSummaries(accumulators: Map<string, TeamAccumulator>): TeamTouchdownSummary[] {
	return Array.from(accumulators.values())
		.map((accumulator) => {
			const players = Array.from(accumulator.players.values()).sort((a, b) => b.total - a.total);

			const scoreboard =
				accumulator.scoreboardTouchdowns > 0
					? accumulator.scoreboardTouchdowns
					: players.reduce(
							(sum, player) => sum + player.rushing + player.receiving + player.return + player.defensive,
							0
					  );

			return {
				team: accumulator.team,
				totalTouchdowns: scoreboard,
				players
			};
		})
		.filter((team) => team.totalTouchdowns > 0)
		.sort((a, b) => b.totalTouchdowns - a.totalTouchdowns);
}

function extractTouchdownCount(player: any, fields: string[]): number {
	let total = 0;
	for (const field of fields) {
		total += safeNumber(player?.[field]);
	}
	return total;
}

function resolveAlias(team: any): string | undefined {
	if (!team) return undefined;
	if (team.alias) return String(team.alias).toUpperCase();
	if (team.abbreviation) return String(team.abbreviation).toUpperCase();
	if (team.abbr) return String(team.abbr).toUpperCase();
	return undefined;
}

function mapSeasonType(type: SeasonType): 'PRE' | 'REG' | 'PST' {
	if (type === 'POST') return 'PST';
	return type;
}

function buildDisplayName(market?: string, name?: string): string | undefined {
	if (market && name) return `${market} ${name}`;
	return market || name || undefined;
}

function safeNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function buildMockTouchdownData(params: FetchParams): TeamTouchdownSummary[] {
	const mock: TeamTouchdownSummary[] = [
		{
			team: {
				abbreviation: 'KC',
				displayName: 'Kansas City Chiefs',
				location: 'Kansas City',
				mascot: 'Chiefs',
				logo: `${TEAM_DIRECTORY}/kc.png`
			},
			totalTouchdowns: 4,
			players: [
				{
					playerId: 'patrick-mahomes',
					playerName: 'Patrick Mahomes',
					position: 'QB',
					team: 'KC',
					passing: 2,
					rushing: 0,
					receiving: 0,
					return: 0,
					defensive: 0,
					total: 2
				},
				{
					playerId: 'travis-kelce',
					playerName: 'Travis Kelce',
					position: 'TE',
					team: 'KC',
					passing: 0,
					rushing: 0,
					receiving: 2,
					return: 0,
					defensive: 0,
					total: 2
				}
			]
		},
		{
			team: {
				abbreviation: 'CHI',
				displayName: 'Chicago Bears',
				location: 'Chicago',
				mascot: 'Bears',
				logo: `${TEAM_DIRECTORY}/chi.png`
			},
			totalTouchdowns: 3,
			players: [
				{
					playerId: 'dj-moore',
					playerName: 'DJ Moore',
					position: 'WR',
					team: 'CHI',
					passing: 0,
					rushing: 0,
					receiving: 2,
					return: 0,
					defensive: 0,
					total: 2
				},
				{
					playerId: 'khalil-herbert',
					playerName: 'Khalil Herbert',
					position: 'RB',
					team: 'CHI',
					passing: 0,
					rushing: 1,
					receiving: 0,
					return: 0,
					defensive: 0,
					total: 1
				}
			]
		}
	];

	return mock.map((team, index) => {
		const adjustment = (params.week + index) % 2;
		if (adjustment === 0) return team;

		const adjustedPlayers = team.players.map((player, playerIdx) => {
			if (playerIdx === 0) {
				return { ...player, rushing: player.rushing + 1, total: player.total + 1 };
			}
			return player;
		});

		return {
			...team,
			totalTouchdowns: team.totalTouchdowns + 1,
			players: adjustedPlayers
		};
	});
}
