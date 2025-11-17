import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
const SPORTRADAR_API_KEY = process.env.SPORTRADAR_API_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

if (!SPORTRADAR_API_KEY) {
	console.error('❌ SPORTRADAR_API_KEY environment variable is required');
	process.exit(1);
}

if (!ODDS_API_KEY) {
	console.warn('⚠️  ODDS_API_KEY not set. Odds data will not be fetched from The Odds API.');
}

const db = neon(DATABASE_URL);
const NFL_BASE_URL = 'https://api.sportradar.com/nfl/official/trial/v7/en';

async function makeRequest(endpoint, retryCount = 0) {
	const url = `${NFL_BASE_URL}${endpoint}?api_key=${SPORTRADAR_API_KEY}`;
	
	// Add delay to avoid rate limiting
	if (retryCount > 0) {
		// Exponential backoff: 5s, 10s, 20s, max 30s
		const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 30000);
		console.log(`   ⏳ Waiting ${delay / 1000}s before retry ${retryCount}...`);
		await new Promise(resolve => setTimeout(resolve, delay));
	} else {
		// Add initial delay before any request (5 seconds to avoid rate limits)
		console.log(`   ⏳ Waiting 5s before API request to avoid rate limits...`);
		await new Promise(resolve => setTimeout(resolve, 5000));
	}
	
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429 && retryCount < 4) {
			// Rate limited - retry with exponential backoff (up to 4 retries)
			return makeRequest(endpoint, retryCount + 1);
		}
		throw new Error(`Sportradar API error: ${response.status} ${response.statusText}`);
	}

	return await response.json();
}

function mapSeasonType(seasonType) {
	return seasonType === 'PRE' ? 'PRE' : seasonType === 'POST' ? 'PST' : 'REG';
}

async function getOrCreateNFLSport() {
	// Get NFL sport
	const [sport] = await db`
		SELECT id FROM sports WHERE code = 'NFL' LIMIT 1
	`;

	if (sport) {
		return sport.id;
	}

	// Create NFL sport if it doesn't exist
	const [newSport] = await db`
		INSERT INTO sports (name, code, is_active)
		VALUES ('National Football League', 'NFL', true)
		RETURNING id
	`;

	return newSport.id;
}

async function getOrCreateTeam(sportId, teamData) {
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
		// Update external_id if missing
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

async function syncWeek11Matchups(season = 2025, seasonType = 'REG', week = 11) {
	console.log(`🏈 Starting Week ${week} NFL Matchups Sync`);
	console.log(`📅 Season: ${season}, Type: ${seasonType}\n`);

	try {
		// Get or create NFL sport
		const sportId = await getOrCreateNFLSport();
		console.log(`✅ NFL Sport ID: ${sportId}`);

		// Fetch Week 11 schedule
		console.log(`\n📊 Fetching Week ${week} schedule from Sportradar...`);
		const schedule = await makeRequest(
			`/games/${season}/${mapSeasonType(seasonType)}/${week}/schedule.json`
		);

		const games = Array.isArray(schedule?.week?.games) 
			? schedule.week.games 
			: Array.isArray(schedule?.games) 
				? schedule.games 
				: [];

		if (games.length === 0) {
			console.log(`⚠️  No games found for Week ${week}`);
			return;
		}

		console.log(`✅ Found ${games.length} games for Week ${week}\n`);

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

				if (!homeTeam || !awayTeam) {
					console.log(`⚠️  Skipping game ${gameId}: Missing team data`);
					continue;
				}

				// Get or create teams
				const homeTeamId = await getOrCreateTeam(sportId, homeTeam);
				const awayTeamId = await getOrCreateTeam(sportId, awayTeam);

				// Check if game already exists
				const [existingGame] = await db`
					SELECT id FROM games WHERE external_id = ${gameId} LIMIT 1
				`;

				// Prepare odds/spread data structure
				let oddsData = {
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

				// Try to fetch odds from The Odds API first (better data)
				if (ODDS_API_KEY) {
					try {
						// Match team names between Sportradar and The Odds API
						const homeTeamName = homeTeam.name || homeTeam.market;
						const awayTeamName = awayTeam.name || awayTeam.market;
						
						// Fetch odds from The Odds API
						const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${ODDS_API_KEY}`;
						await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
						
						const oddsResponse = await fetch(oddsUrl);
						if (oddsResponse.ok) {
							const oddsEvents = await oddsResponse.json();
							
							// Find matching event by team names
							const matchingEvent = oddsEvents.find((event) => {
								const homeMatch = event.home_team.toLowerCase().includes(homeTeamName.toLowerCase()) ||
									homeTeamName.toLowerCase().includes(event.home_team.toLowerCase());
								const awayMatch = event.away_team.toLowerCase().includes(awayTeamName.toLowerCase()) ||
									awayTeamName.toLowerCase().includes(event.away_team.toLowerCase());
								return homeMatch && awayMatch;
							});

							if (matchingEvent && matchingEvent.bookmakers && matchingEvent.bookmakers.length > 0) {
								// Extract best odds from all bookmakers
								let bestSpread = null;
								let bestTotal = null;
								let bestMoneyline = { home: null, away: null };

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
								console.log(`   ✅ Odds from The Odds API`);
							}
						}
					} catch (error) {
						console.log(`   ℹ️  The Odds API not available: ${error.message}`);
					}
				}

				// Fallback to Sportradar if The Odds API didn't provide data
				if (oddsData.source === 'sportradar') {
					try {
						// Add delay between game summary requests to avoid rate limiting (2 seconds between requests)
						await new Promise(resolve => setTimeout(resolve, 2000));
						const gameSummary = await makeRequest(`/games/${gameId}/summary.json`);
						
						// Check if summary contains odds/spread data
						if (gameSummary?.odds) {
							// Map Sportradar odds format to our structure
							const odds = gameSummary.odds;
							if (odds.spread) {
								oddsData.spread = {
									home: odds.spread.home,
									away: odds.spread.away,
									line: odds.spread.line,
									homeOdds: odds.spread.home_odds,
									awayOdds: odds.spread.away_odds
								};
							}
							if (odds.total) {
								oddsData.total = {
									over: odds.total.over,
									under: odds.total.under,
									line: odds.total.line,
									overOdds: odds.total.over_odds,
									underOdds: odds.total.under_odds
								};
							}
							if (odds.moneyline) {
								oddsData.moneyline = {
									home: odds.moneyline.home,
									away: odds.moneyline.away
								};
							}
							oddsData.lastUpdated = new Date().toISOString();
						}
					} catch (summaryError) {
						// Summary might not be available for future games, that's okay
						console.log(`   ℹ️  Game summary not available for ${gameId} (may be scheduled)`);
					}
				}

				// Add delay between requests to avoid rate limiting
				if (games.indexOf(game) > 0) {
					await new Promise(resolve => setTimeout(resolve, 500));
				}

				if (existingGame) {
					// Update existing game
					await db`
						UPDATE games SET
							home_team_id = ${homeTeamId},
							away_team_id = ${awayTeamId},
							game_date = ${scheduled}::timestamp with time zone,
							status = ${status.toLowerCase()},
							home_score = ${game.home_points || 0},
							away_score = ${game.away_points || 0},
							quarter = ${game.quarter || null},
							time_remaining = ${game.clock || null},
							odds = ${JSON.stringify(oddsData)},
							updated_at = NOW()
						WHERE external_id = ${gameId}
					`;
					updatedCount++;
					console.log(`   ✅ Updated: ${awayTeam.alias} @ ${homeTeam.alias}`);
				} else {
					// Insert new game
					await db`
						INSERT INTO games (
							sport_id, home_team_id, away_team_id, game_date,
							status, home_score, away_score, quarter,
							time_remaining, external_id, odds, created_at, updated_at
						) VALUES (
							${sportId}, ${homeTeamId}, ${awayTeamId}, ${scheduled}::timestamp with time zone,
							${status.toLowerCase()}, ${game.home_points || 0}, ${game.away_points || 0}, ${game.quarter || null},
							${game.clock || null}, ${gameId}, ${JSON.stringify(oddsData)}, NOW(), NOW()
						)
					`;
					syncedCount++;
					console.log(`   ✅ Synced: ${awayTeam.alias} @ ${homeTeam.alias}`);
					
					// Display spread if available
					if (oddsData.spread.line !== null) {
						const spreadLine = oddsData.spread.line > 0 ? `+${oddsData.spread.line}` : `${oddsData.spread.line}`;
						console.log(`      📊 Spread: ${spreadLine}`);
					}
				}
			} catch (error) {
				errorCount++;
				console.error(`   ❌ Error syncing game ${game.id}:`, error.message);
			}
		}

		console.log(`\n✅ Week ${week} sync completed:`);
		console.log(`   📥 New games: ${syncedCount}`);
		console.log(`   🔄 Updated games: ${updatedCount}`);
		console.log(`   ❌ Errors: ${errorCount}`);
		console.log(`   📊 Total processed: ${games.length}`);

	} catch (error) {
		console.error('❌ Sync failed:', error);
		throw error;
	}
}

// Run the sync
const season = process.argv[2] ? parseInt(process.argv[2]) : 2025;
const seasonType = process.argv[3] || 'REG';
const week = process.argv[4] ? parseInt(process.argv[4]) : 11;

syncWeek11Matchups(season, seasonType, week)
	.then(() => {
		console.log('\n🎉 Sync completed successfully!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n💥 Sync failed:', error);
		process.exit(1);
	});

