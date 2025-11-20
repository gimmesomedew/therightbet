import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import { getCurrentWeekFromSchedule } from './nfl-week.js';

const DATABASE_URL = env.DATABASE_URL;
const SPORTRADAR_API_KEY = env.SPORTRADAR_API_KEY;
const ODDS_API_KEY = env.ODDS_API_KEY;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

if (!SPORTRADAR_API_KEY) {
	throw new Error('SPORTRADAR_API_KEY environment variable is required');
}

const db = neon(DATABASE_URL);
const NFL_BASE_URL = 'https://api.sportradar.com/nfl/official/trial/v7/en';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com';

async function makeRequest(endpoint: string, retryCount = 0): Promise<any> {
	const url = `${NFL_BASE_URL}${endpoint}?api_key=${SPORTRADAR_API_KEY}`;
	
	// Add delay to avoid rate limiting
	if (retryCount > 0) {
		const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 30000);
		console.log(`   ⏳ Waiting ${delay / 1000}s before retry ${retryCount}...`);
		await new Promise(resolve => setTimeout(resolve, delay));
	} else {
		// Add initial delay before any request
		await new Promise(resolve => setTimeout(resolve, 2000));
	}
	
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429 && retryCount < 4) {
			return makeRequest(endpoint, retryCount + 1);
		}
		throw new Error(`Sportradar API error: ${response.status} ${response.statusText}`);
	}

	return await response.json();
}

async function fetchOddsAPI(endpoint: string, retryCount = 0): Promise<any> {
	const url = `${ODDS_API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${ODDS_API_KEY}`;
	
	if (retryCount > 0) {
		const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
		await new Promise(resolve => setTimeout(resolve, delay));
	} else {
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
	
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429 && retryCount < 3) {
			return fetchOddsAPI(endpoint, retryCount + 1);
		}
		const errorText = await response.text().catch(() => response.statusText);
		throw new Error(`The Odds API error: ${response.status} ${errorText}`);
	}

	return await response.json();
}

function mapSeasonType(seasonType: string): string {
	return seasonType === 'PRE' ? 'PRE' : seasonType === 'POST' ? 'PST' : 'REG';
}

async function getOrCreateNFLSport() {
	const [sport] = await db`
		SELECT id FROM sports WHERE code = 'NFL' LIMIT 1
	`;

	if (sport) {
		return sport.id;
	}

	const [newSport] = await db`
		INSERT INTO sports (name, code, is_active)
		VALUES ('National Football League', 'NFL', true)
		RETURNING id
	`;

	return newSport.id;
}

async function getOrCreateTeam(sportId: number, teamData: any) {
	const { id: externalId, name, alias, market } = teamData;
	const teamAbbreviation = alias?.toUpperCase() || '';
	const teamName = name || '';
	const teamCity = market || '';

	// Try to find existing team by external_id
	const [existingTeam] = await db`
		SELECT id FROM teams 
		WHERE sport_id = ${sportId} AND external_id = ${externalId}
		LIMIT 1
	`;

	if (existingTeam) {
		return existingTeam.id;
	}

	// Try to find by abbreviation
	const [existingByAbbr] = await db`
		SELECT id FROM teams 
		WHERE sport_id = ${sportId} AND abbreviation = ${teamAbbreviation}
		LIMIT 1
	`;

	if (existingByAbbr) {
		if (!existingByAbbr.external_id) {
			await db`
				UPDATE teams SET external_id = ${externalId}
				WHERE id = ${existingByAbbr.id}
			`;
		}
		return existingByAbbr.id;
	}

	// Create new team
	const [newTeam] = await db`
		INSERT INTO teams (sport_id, name, city, abbreviation, external_id, created_at, updated_at)
		VALUES (${sportId}, ${teamName}, ${teamCity}, ${teamAbbreviation}, ${externalId}, NOW(), NOW())
		RETURNING id
	`;

	return newTeam.id;
}

export async function syncNFLMatchups() {
	console.log('🏈 Starting NFL Matchups Sync\n');

	try {
		const sportId = await getOrCreateNFLSport();
		console.log(`✅ NFL Sport ID: ${sportId}`);

		// Determine current season and week
		const now = new Date();
		const currentYear = now.getFullYear();
		const season = currentYear;
		const seasonType = 'REG'; // Default to regular season

		// Get current week from schedule
		const currentWeek = await getCurrentWeekFromSchedule(season, seasonType);
		
		if (!currentWeek) {
			console.log('⚠️  Could not determine current week');
			return {
				success: false,
				syncedCount: 0,
				updatedCount: 0,
				errorCount: 0,
				totalProcessed: 0,
				message: 'Could not determine current week'
			};
		}

		console.log(`📅 Season: ${season}, Type: ${seasonType}, Week: ${currentWeek}`);

		// Fetch schedule for current week
		console.log(`\n📊 Fetching Week ${currentWeek} schedule from Sportradar...`);
		const schedule = await makeRequest(
			`/games/${season}/${mapSeasonType(seasonType)}/${currentWeek}/schedule.json`
		);

		const games = Array.isArray(schedule?.week?.games) 
			? schedule.week.games 
			: Array.isArray(schedule?.games) 
				? schedule.games 
				: [];

		if (games.length === 0) {
			console.log(`⚠️  No games found for Week ${currentWeek}`);
			return {
				success: true,
				syncedCount: 0,
				updatedCount: 0,
				errorCount: 0,
				totalProcessed: 0,
				message: `No games found for Week ${currentWeek}`
			};
		}

		console.log(`✅ Found ${games.length} games for Week ${currentWeek}\n`);

		// Fetch odds from The Odds API if available
		let oddsEvents: any[] = [];
		if (ODDS_API_KEY) {
			try {
				console.log('📊 Fetching odds from The Odds API...');
				oddsEvents = await fetchOddsAPI('/v4/sports/americanfootball_nfl/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american');
				console.log(`✅ Found ${oddsEvents.length} events with odds`);
			} catch (error: any) {
				console.log(`⚠️  Failed to fetch odds: ${error.message}`);
			}
		}

		let syncedCount = 0;
		let updatedCount = 0;
		let errorCount = 0;

		// Process each game
		for (const game of games) {
			try {
				const gameId = game.id;
				const homeTeam = game.home;
				const awayTeam = game.away;
				const scheduled = game.scheduled;
				const status = game.status || 'scheduled';
				const homeScore = game.home_points || game.scoring?.home?.points || 0;
				const awayScore = game.away_points || game.scoring?.away?.points || 0;

				if (!homeTeam || !awayTeam) {
					console.log(`⚠️  Skipping game ${gameId}: Missing team data`);
					continue;
				}

				// Get or create teams
				const homeTeamId = await getOrCreateTeam(sportId, homeTeam);
				const awayTeamId = await getOrCreateTeam(sportId, awayTeam);

				if (!homeTeamId || !awayTeamId) {
					console.log(`⚠️  Skipping game ${gameId}: Could not create teams`);
					continue;
				}

				// Check if game already exists
				const [existingGame] = await db`
					SELECT id FROM games WHERE external_id = ${gameId} LIMIT 1
				`;

				// Prepare odds/spread data structure
				let oddsData: any = {
					spread: {
						home: null,
						away: null,
						line: null,
						homeOdds: null,
						awayOdds: null
					},
					total: {
						over: null,
						under: null,
						line: null,
						overOdds: null,
						underOdds: null
					},
					moneyline: {
						home: null,
						away: null
					},
					lastUpdated: null,
					source: 'sportradar'
				};

				// Try to match odds from The Odds API
				if (ODDS_API_KEY && oddsEvents.length > 0) {
					const homeTeamName = homeTeam.name || homeTeam.market;
					const awayTeamName = awayTeam.name || awayTeam.market;
					
					const matchingEvent = oddsEvents.find((event) => {
						const homeMatch = event.home_team.toLowerCase().includes(homeTeamName.toLowerCase()) ||
							homeTeamName.toLowerCase().includes(event.home_team.toLowerCase());
						const awayMatch = event.away_team.toLowerCase().includes(awayTeamName.toLowerCase()) ||
							awayTeamName.toLowerCase().includes(event.away_team.toLowerCase());
						return homeMatch && awayMatch;
					});

					if (matchingEvent && matchingEvent.bookmakers && matchingEvent.bookmakers.length > 0) {
						let bestSpread: any = null;
						let bestTotal: any = null;
						let bestMoneyline: any = { home: null, away: null };

						for (const bookmaker of matchingEvent.bookmakers) {
							for (const market of bookmaker.markets) {
								if (market.key === 'spreads') {
									for (const outcome of market.outcomes) {
										if (outcome.point !== undefined) {
											if (!bestSpread || Math.abs(outcome.point) < Math.abs(bestSpread.line)) {
												bestSpread = {
													line: outcome.point,
													homeOdds: outcome.name === matchingEvent.home_team ? outcome.price : null,
													awayOdds: outcome.name === matchingEvent.away_team ? outcome.price : null
												};
											}
										}
									}
								} else if (market.key === 'totals') {
									for (const outcome of market.outcomes) {
										if (outcome.point !== undefined && !bestTotal) {
											bestTotal = {
												line: outcome.point,
												overOdds: outcome.name === 'Over' ? outcome.price : null,
												underOdds: outcome.name === 'Under' ? outcome.price : null
											};
										}
									}
								} else if (market.key === 'h2h') {
									for (const outcome of market.outcomes) {
										if (outcome.name === matchingEvent.home_team) {
											if (!bestMoneyline.home || outcome.price > bestMoneyline.home) {
												bestMoneyline.home = outcome.price;
											}
										} else if (outcome.name === matchingEvent.away_team) {
											if (!bestMoneyline.away || outcome.price > bestMoneyline.away) {
												bestMoneyline.away = outcome.price;
											}
										}
									}
								}
							}
						}

						if (bestSpread) {
							oddsData.spread = {
								line: bestSpread.line,
								homeOdds: bestSpread.homeOdds?.toString() || null,
								awayOdds: bestSpread.awayOdds?.toString() || null,
								home: null,
								away: null
							};
						}
						if (bestTotal) {
							oddsData.total = {
								line: bestTotal.line,
								overOdds: bestTotal.overOdds?.toString() || null,
								underOdds: bestTotal.underOdds?.toString() || null,
								over: null,
								under: null
							};
						}
						if (bestMoneyline.home || bestMoneyline.away) {
							oddsData.moneyline = {
								home: bestMoneyline.home?.toString() || null,
								away: bestMoneyline.away?.toString() || null
							};
						}
						oddsData.lastUpdated = new Date().toISOString();
						oddsData.source = 'the-odds-api';
					}
				}

				if (existingGame) {
					// Update existing game
					await db`
						UPDATE games SET
							home_team_id = ${homeTeamId},
							away_team_id = ${awayTeamId},
							game_date = ${scheduled}::timestamp with time zone,
							status = ${status.toLowerCase()},
							home_score = ${homeScore},
							away_score = ${awayScore},
							odds = ${JSON.stringify(oddsData)},
							updated_at = NOW()
						WHERE external_id = ${gameId}
					`;
					updatedCount++;
				} else {
					// Insert new game
					await db`
						INSERT INTO games (
							sport_id, home_team_id, away_team_id, game_date,
							status, home_score, away_score, external_id, odds,
							created_at, updated_at
						) VALUES (
							${sportId}, ${homeTeamId}, ${awayTeamId}, ${scheduled}::timestamp with time zone,
							${status.toLowerCase()}, ${homeScore}, ${awayScore}, ${gameId}, ${JSON.stringify(oddsData)},
							NOW(), NOW()
						)
					`;
					syncedCount++;
				}
			} catch (gameError: any) {
				console.error(`   ❌ Error syncing game ${game.id}: ${gameError.message}`);
				errorCount++;
			}
		}

		console.log(`\n✅ NFL sync completed:`);
		console.log(`   📥 New games: ${syncedCount}`);
		console.log(`   🔄 Updated games: ${updatedCount}`);
		console.log(`   ❌ Errors: ${errorCount}`);
		console.log(`   📊 Total processed: ${games.length}`);
		console.log('\n🎉 Sync completed successfully!');

		return {
			success: true,
			syncedCount,
			updatedCount,
			errorCount,
			totalProcessed: games.length,
			week: currentWeek
		};
	} catch (error: any) {
		console.error('❌ Sync failed:', error);
		throw error;
	}
}

