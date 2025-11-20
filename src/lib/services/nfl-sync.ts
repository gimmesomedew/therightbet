import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

const DATABASE_URL = env.DATABASE_URL;
const SPORTSDATAIO_API_KEY = env.SPORTSDATAIO_API_KEY;
const ODDS_API_KEY = env.ODDS_API_KEY;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

if (!SPORTSDATAIO_API_KEY) {
	throw new Error('SPORTSDATAIO_API_KEY environment variable is required');
}

const db = neon(DATABASE_URL);
const SPORTSDATAIO_BASE_URL = 'https://api.sportsdata.io/v3/nfl';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com';

async function makeSportsDataIORequest(endpoint: string, retryCount = 0): Promise<any> {
	const url = `${SPORTSDATAIO_BASE_URL}${endpoint}?key=${SPORTSDATAIO_API_KEY}`;
	
	// Add delay to avoid rate limiting
	if (retryCount > 0) {
		const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
		console.log(`   ⏳ Waiting ${delay / 1000}s before retry ${retryCount}...`);
		await new Promise(resolve => setTimeout(resolve, delay));
	} else {
		// Add initial delay before any request
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
	
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429 && retryCount < 3) {
			return makeSportsDataIORequest(endpoint, retryCount + 1);
		}
		const errorText = await response.text().catch(() => response.statusText);
		throw new Error(`SportsDataIO API error: ${response.status} ${errorText}`);
	}

	return await response.json();
}

async function fetchOddsAPI(endpoint: string, retryCount = 0): Promise<any> {
	if (!ODDS_API_KEY) {
		return [];
	}

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

function mapSeasonType(seasonType: string): number {
	// SportsDataIO uses: 1=REG, 2=PRE, 3=POST
	return seasonType === 'PRE' ? 2 : seasonType === 'POST' ? 3 : 1;
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
	// SportsDataIO format: { TeamID, Key, City, Name, Conference, Division }
	const externalId = teamData.TeamID || teamData.team_id || null;
	const teamAbbreviation = (teamData.Key || teamData.key || '').toUpperCase();
	const teamName = teamData.Name || teamData.name || '';
	const teamCity = teamData.City || teamData.city || '';

	if (!teamName && !teamAbbreviation) {
		return null;
	}

	// Try to find existing team by external_id
	if (externalId) {
		const [existingTeam] = await db`
			SELECT id FROM teams 
			WHERE sport_id = ${sportId} AND external_id = ${String(externalId)}
			LIMIT 1
		`;

		if (existingTeam) {
			return existingTeam.id;
		}
	}

	// Try to find by abbreviation
	if (teamAbbreviation) {
		const [existingByAbbr] = await db`
			SELECT id FROM teams 
			WHERE sport_id = ${sportId} AND abbreviation = ${teamAbbreviation}
			LIMIT 1
		`;

		if (existingByAbbr) {
			if (externalId && !existingByAbbr.external_id) {
				await db`
					UPDATE teams SET external_id = ${String(externalId)}
					WHERE id = ${existingByAbbr.id}
				`;
			}
			return existingByAbbr.id;
		}
	}

	// Create new team
	const [newTeam] = await db`
		INSERT INTO teams (sport_id, name, city, abbreviation, external_id, created_at, updated_at)
		VALUES (${sportId}, ${teamName}, ${teamCity}, ${teamAbbreviation}, ${externalId ? String(externalId) : null}, NOW(), NOW())
		RETURNING id
	`;

	return newTeam.id;
}

export async function syncNFLMatchups() {
	console.log('🏈 Starting NFL Matchups Sync (SportsDataIO)\n');

	try {
		const sportId = await getOrCreateNFLSport();
		console.log(`✅ NFL Sport ID: ${sportId}`);

		// Determine current season and week
		const now = new Date();
		const currentYear = now.getFullYear();
		const season = currentYear;
		const seasonType = 'REG'; // Default to regular season
		const seasonTypeNum = mapSeasonType(seasonType);

		// Try to determine current week from SportsDataIO
		let currentWeek: number | null = null;
		
		try {
			// First, try to get current week from SportsDataIO Timeframes endpoint
			// This is the most reliable way to get the current week
			console.log('📊 Fetching current week from SportsDataIO Timeframes endpoint...');
			try {
				const timeframes = await makeSportsDataIORequest('/scores/json/Timeframes/current');
				
				// Handle different response formats
				if (Array.isArray(timeframes)) {
					// If it's an array, find the current timeframe
					const currentTimeframe = timeframes.find((tf: any) => 
						tf.Name === 'Current' || tf.Season === season || tf.Week !== undefined
					);
					if (currentTimeframe && currentTimeframe.Week) {
						currentWeek = currentTimeframe.Week;
						console.log(`✅ Found current week ${currentWeek} from Timeframes endpoint`);
					}
				} else if (timeframes && typeof timeframes === 'object') {
					// If it's a single object
					if (timeframes.Week) {
						currentWeek = timeframes.Week;
						console.log(`✅ Found current week ${currentWeek} from Timeframes endpoint`);
					} else if (timeframes.CurrentWeek) {
						currentWeek = timeframes.CurrentWeek;
						console.log(`✅ Found current week ${currentWeek} from Timeframes endpoint`);
					} else if (timeframes.UpcomingWeek) {
						currentWeek = timeframes.UpcomingWeek;
						console.log(`✅ Using upcoming week ${currentWeek} from Timeframes endpoint`);
					}
				}
			} catch (timeframesError: any) {
				console.log(`   ⚠️  Timeframes endpoint not available: ${timeframesError.message.substring(0, 80)}`);
			}

			// Fallback: Try to get current week from schedules
			if (!currentWeek) {
				console.log('📊 Fallback: Checking schedules to determine current week...');
				
				// Estimate week based on date (NFL season typically starts first Thursday of September)
				const septemberStart = new Date(season, 8, 1); // September 1
				const daysSinceSeasonStart = Math.floor((now.getTime() - septemberStart.getTime()) / (1000 * 60 * 60 * 24));
				const estimatedWeek = Math.max(1, Math.min(18, Math.floor(daysSinceSeasonStart / 7) + 1));
				
				console.log(`📊 Estimated week based on date: ${estimatedWeek}`);
				
				// Fetch schedules for all weeks to find current week
				console.log('📊 Fetching schedules from SportsDataIO to determine current week...');
			let nearestWeek: number | null = null;
			let nearestDaysDiff = Infinity;
			let foundCurrentWeek = false;

			// Try all weeks from 1 to 18
			for (let week = 1; week <= 18; week++) {
				try {
					console.log(`   Checking week ${week}...`);
					const schedule = await makeSportsDataIORequest(`/scores/json/Schedules/${season}/${week}`);
					
					// Handle different response formats
					let games: any[] = [];
					if (Array.isArray(schedule)) {
						games = schedule;
					} else if (schedule && typeof schedule === 'object') {
						// Might be wrapped in an object
						if (Array.isArray(schedule.Games)) {
							games = schedule.Games;
						} else if (Array.isArray(schedule.games)) {
							games = schedule.games;
						} else if (schedule.Week && Array.isArray(schedule.Week.Games)) {
							games = schedule.Week.Games;
						}
					}

					if (games.length > 0) {
						console.log(`   ✅ Week ${week}: Found ${games.length} games`);
						
						// Check each game's date
						for (const game of games) {
							const gameDateStr = game.Date || game.DateTime || game.GameDate || game.Scheduled;
							if (!gameDateStr) continue;
							
							const gameDate = new Date(gameDateStr);
							if (isNaN(gameDate.getTime())) {
								console.log(`   ⚠️  Invalid date format: ${gameDateStr}`);
								continue;
							}
							
							const daysDiff = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
							
							// If game is within 3 days before or 7 days after today, it's the current week
							if (daysDiff >= -3 && daysDiff <= 7) {
								currentWeek = week;
								foundCurrentWeek = true;
								console.log(`✅ Found current week ${currentWeek} (game on ${gameDate.toISOString().split('T')[0]}, ${daysDiff.toFixed(1)} days away)`);
								break;
							}
							
							// Track nearest future week as fallback
							if (daysDiff >= -7 && daysDiff < nearestDaysDiff) {
								nearestDaysDiff = daysDiff;
								nearestWeek = week;
							}
						}
						
						if (foundCurrentWeek) break;
					} else {
						console.log(`   ℹ️  Week ${week}: No games found`);
					}
				} catch (error: any) {
					// Log error but continue
					const errorMsg = error.message || String(error);
					if (errorMsg.includes('404') || errorMsg.includes('not found')) {
						console.log(`   ℹ️  Week ${week}: Not available (404)`);
					} else {
						console.log(`   ⚠️  Week ${week} error: ${errorMsg.substring(0, 80)}`);
					}
					continue;
				}
			}

			// If we didn't find a current week, use the nearest week
			if (!currentWeek && nearestWeek !== null) {
				currentWeek = nearestWeek;
				console.log(`✅ Using nearest week ${currentWeek} (${nearestDaysDiff.toFixed(1)} days away)`);
			}
		} catch (error: any) {
			console.error(`❌ Error determining week from schedule: ${error.message}`);
			console.error(error);
		}
		
		if (!currentWeek) {
			console.log('⚠️  Could not determine current week');
			return {
				success: false,
				syncedCount: 0,
				updatedCount: 0,
				errorCount: 0,
				totalProcessed: 0,
				message: 'Could not determine current week. Please ensure SPORTSDATAIO_API_KEY is set and the API is accessible.'
			};
		}

		console.log(`📅 Season: ${season}, Type: ${seasonType}, Week: ${currentWeek}`);

		// Fetch schedule for current week from SportsDataIO
		// Try multiple endpoint formats since SportsDataIO may use different paths
		console.log(`\n📊 Fetching Week ${currentWeek} schedule from SportsDataIO...`);
		let schedule: any = null;
		let games: any[] = [];
		
		// Try different endpoint formats
		const scheduleEndpoints = [
			`/scores/json/Schedules/${season}/${currentWeek}`,
			`/scores/json/SchedulesByWeek/${season}/${currentWeek}`,
			`/scores/json/Schedules/${season}/${seasonTypeNum}/${currentWeek}`,
		];
		
		for (const endpoint of scheduleEndpoints) {
			try {
				console.log(`   Trying endpoint: ${endpoint}...`);
				schedule = await makeSportsDataIORequest(endpoint);
				
				// Handle different response formats
				if (Array.isArray(schedule)) {
					games = schedule;
				} else if (schedule && typeof schedule === 'object') {
					if (Array.isArray(schedule.Games)) {
						games = schedule.Games;
					} else if (Array.isArray(schedule.games)) {
						games = schedule.games;
					} else if (schedule.Week && Array.isArray(schedule.Week.Games)) {
						games = schedule.Week.Games;
					} else if (Array.isArray(schedule.Schedules)) {
						games = schedule.Schedules;
					}
				}
				
				if (games.length > 0) {
					console.log(`✅ Found ${games.length} games using endpoint: ${endpoint}`);
					break;
				}
			} catch (error: any) {
				const errorMsg = error.message || String(error);
				if (errorMsg.includes('404')) {
					console.log(`   ⚠️  Endpoint ${endpoint} returned 404`);
					continue;
				} else {
					console.log(`   ⚠️  Endpoint ${endpoint} error: ${errorMsg.substring(0, 80)}`);
					continue;
				}
			}
		}

		// If schedule endpoint failed, try getting games from TeamGameStats
		if (games.length === 0) {
			console.log(`📊 Schedule endpoint not available, trying TeamGameStats to get games...`);
			try {
				const teamStats = await makeSportsDataIORequest(`/stats/json/TeamGameStats/${season}/${currentWeek}`);
				
				if (Array.isArray(teamStats) && teamStats.length > 0) {
					// Extract unique games from team stats
					const gameMap = new Map<string, any>();
					
					for (const stat of teamStats) {
						// Filter by season type if available
						if (stat.SeasonType !== undefined && stat.SeasonType !== seasonTypeNum) {
							continue;
						}
						
						const gameKey = stat.GameKey || `${stat.Date}-${stat.Team}-${stat.Opponent}`;
						if (!gameMap.has(gameKey)) {
							gameMap.set(gameKey, {
								GameKey: stat.GameKey,
								Date: stat.Date,
								DateTime: stat.Date,
								HomeTeam: stat.HomeOrAway === 'HOME' ? stat.Team : stat.Opponent,
								AwayTeam: stat.HomeOrAway === 'HOME' ? stat.Opponent : stat.Team,
								HomeTeamID: null, // Will need to look up
								AwayTeamID: null, // Will need to look up
								Status: stat.Date ? 'Scheduled' : 'Final',
								HomeScore: stat.HomeOrAway === 'HOME' ? stat.Score : stat.OpponentScore,
								AwayScore: stat.HomeOrAway === 'HOME' ? stat.OpponentScore : stat.Score,
								Season: stat.Season,
								Week: stat.Week,
								SeasonType: stat.SeasonType
							});
						}
					}
					
					games = Array.from(gameMap.values());
					console.log(`✅ Found ${games.length} games from TeamGameStats`);
				}
			} catch (error: any) {
				console.log(`   ⚠️  TeamGameStats error: ${error.message?.substring(0, 80)}`);
			}
		}

		// If still no games, try using The Odds API as primary source
		if (games.length === 0 && ODDS_API_KEY) {
			console.log(`📊 No games from SportsDataIO, trying The Odds API...`);
			try {
				const oddsEvents = await fetchOddsAPI('/v4/sports/americanfootball_nfl/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american');
				
				if (Array.isArray(oddsEvents) && oddsEvents.length > 0) {
					console.log(`✅ Found ${oddsEvents.length} games from The Odds API`);
					
					// Convert Odds API events to game format
					for (const event of oddsEvents) {
						// Parse team names from event
						const homeTeamName = event.home_team || '';
						const awayTeamName = event.away_team || '';
						
						// Extract team abbreviations (usually last word or abbreviation)
						const homeTeamAbbr = homeTeamName.split(' ').pop() || homeTeamName;
						const awayTeamAbbr = awayTeamName.split(' ').pop() || awayTeamName;
						
						// Get game date from commence_time
						const gameDate = event.commence_time ? new Date(event.commence_time) : null;
						
						// Only include games within the current week window
						if (gameDate) {
							const daysDiff = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
							if (daysDiff >= -3 && daysDiff <= 7) {
								games.push({
									GameKey: event.id || `${homeTeamAbbr}-${awayTeamAbbr}-${event.commence_time}`,
									Date: gameDate.toISOString(),
									DateTime: gameDate.toISOString(),
									HomeTeam: homeTeamAbbr,
									AwayTeam: awayTeamAbbr,
									HomeTeamName: homeTeamName,
									AwayTeamName: awayTeamName,
									HomeTeamID: null,
									AwayTeamID: null,
									Status: 'Scheduled',
									HomeScore: 0,
									AwayScore: 0,
									Season: season,
									Week: currentWeek,
									SeasonType: seasonTypeNum,
									OddsEvent: event // Store full event for odds processing
								});
							}
						}
					}
					
					if (games.length > 0) {
						console.log(`✅ Created ${games.length} games from The Odds API`);
					}
				}
			} catch (error: any) {
				console.log(`   ⚠️  The Odds API error: ${error.message?.substring(0, 80)}`);
			}
		}

		if (games.length === 0) {
			console.log(`⚠️  No games found for Week ${currentWeek}`);
			return {
				success: true,
				syncedCount: 0,
				updatedCount: 0,
				errorCount: 0,
				totalProcessed: 0,
				message: `No games found for Week ${currentWeek}. The schedule may not be available yet or the endpoint format may have changed.`
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

		// Fetch teams list to get team details
		let teamsMap: Record<string, any> = {};
		try {
			console.log('📊 Fetching teams list from SportsDataIO...');
			const teams = await makeSportsDataIORequest('/scores/json/Teams');
			if (Array.isArray(teams)) {
				teams.forEach((team: any) => {
					if (team.TeamID) {
						teamsMap[team.TeamID] = team;
					}
				});
				console.log(`✅ Loaded ${Object.keys(teamsMap).length} teams`);
			}
		} catch (error: any) {
			console.log(`⚠️  Failed to fetch teams list: ${error.message}`);
		}

		let syncedCount = 0;
		let updatedCount = 0;
		let errorCount = 0;

		// Process each game
		for (const game of games) {
			try {
				// Filter by season type if available
				if (game.SeasonType !== undefined && game.SeasonType !== seasonTypeNum) {
					continue;
				}

				const gameId = game.GameKey || game.GameID || String(game.Week) + '-' + (game.HomeTeam || '') + '-' + (game.AwayTeam || '');
				const scheduled = game.Date || game.DateTime || null;
				const status = game.Status || 'Scheduled';
				
				// Get team details from teams map or use names from game
				let homeTeamData = game.HomeTeamID ? teamsMap[game.HomeTeamID] : null;
				let awayTeamData = game.AwayTeamID ? teamsMap[game.AwayTeamID] : null;
				
				// If teams not found by ID, try to find by abbreviation or name
				if (!homeTeamData && game.HomeTeam) {
					homeTeamData = Object.values(teamsMap).find((t: any) => 
						t.Key?.toUpperCase() === game.HomeTeam?.toUpperCase() || 
						t.Name === game.HomeTeamName ||
						t.Name?.includes(game.HomeTeam) ||
						game.HomeTeamName?.includes(t.Name)
					) || null;
				}
				
				if (!awayTeamData && game.AwayTeam) {
					awayTeamData = Object.values(teamsMap).find((t: any) => 
						t.Key?.toUpperCase() === game.AwayTeam?.toUpperCase() || 
						t.Name === game.AwayTeamName ||
						t.Name?.includes(game.AwayTeam) ||
						game.AwayTeamName?.includes(t.Name)
					) || null;
				}

				const homeTeam = {
					TeamID: game.HomeTeamID || homeTeamData?.TeamID || null,
					Key: game.HomeTeam || homeTeamData?.Key || game.HomeTeamName?.split(' ').pop() || '',
					Name: homeTeamData?.Name || game.HomeTeamName || game.HomeTeam || '',
					City: homeTeamData?.City || game.HomeTeamName?.split(' ').slice(0, -1).join(' ') || ''
				};

				const awayTeam = {
					TeamID: game.AwayTeamID || awayTeamData?.TeamID || null,
					Key: game.AwayTeam || awayTeamData?.Key || game.AwayTeamName?.split(' ').pop() || '',
					Name: awayTeamData?.Name || game.AwayTeamName || game.AwayTeam || '',
					City: awayTeamData?.City || game.AwayTeamName?.split(' ').slice(0, -1).join(' ') || ''
				};

				if (!homeTeam.Key || !awayTeam.Key) {
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
					source: 'sportsdataio'
				};

				// Get scores if available
				const homeScore = game.HomeScore !== undefined ? game.HomeScore : (game.Score !== undefined ? game.Score : 0);
				const awayScore = game.AwayScore !== undefined ? game.AwayScore : (game.OpponentScore !== undefined ? game.OpponentScore : 0);

				// Try to match odds from The Odds API
				// If game came from Odds API, use the stored event, otherwise try to match
				let matchingEvent = game.OddsEvent || null;
				
				if (!matchingEvent && ODDS_API_KEY && oddsEvents.length > 0) {
					const homeTeamName = homeTeam.Name || homeTeam.Key || game.HomeTeamName;
					const awayTeamName = awayTeam.Name || awayTeam.Key || game.AwayTeamName;
					
					matchingEvent = oddsEvents.find((event) => {
						const homeMatch = event.home_team.toLowerCase().includes(homeTeamName.toLowerCase()) ||
							homeTeamName.toLowerCase().includes(event.home_team.toLowerCase()) ||
							event.home_team.toLowerCase().includes(game.HomeTeam?.toLowerCase() || '');
						const awayMatch = event.away_team.toLowerCase().includes(awayTeamName.toLowerCase()) ||
							awayTeamName.toLowerCase().includes(event.away_team.toLowerCase()) ||
							event.away_team.toLowerCase().includes(game.AwayTeam?.toLowerCase() || '');
						return homeMatch && awayMatch;
					}) || null;
				}

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

				// Map status from SportsDataIO format
				let gameStatus = 'scheduled';
				if (status === 'Final' || status === 'F') {
					gameStatus = 'final';
				} else if (status === 'InProgress' || status === 'Ongoing') {
					gameStatus = 'in_progress';
				} else if (status === 'Scheduled' || status === 'S') {
					gameStatus = 'scheduled';
				}

				if (existingGame) {
					// Update existing game
					await db`
						UPDATE games SET
							home_team_id = ${homeTeamId},
							away_team_id = ${awayTeamId},
							game_date = ${scheduled}::timestamp with time zone,
							status = ${gameStatus},
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
							${gameStatus}, ${homeScore}, ${awayScore}, ${gameId}, ${JSON.stringify(oddsData)},
							NOW(), NOW()
						)
					`;
					syncedCount++;
				}
			} catch (gameError: any) {
				console.error(`   ❌ Error syncing game ${game.GameKey || game.GameID}: ${gameError.message}`);
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
