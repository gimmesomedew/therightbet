import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

const DATABASE_URL = env.DATABASE_URL;
const ODDS_API_KEY = env.ODDS_API_KEY;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

if (!ODDS_API_KEY) {
	throw new Error('ODDS_API_KEY environment variable is required for NCAA Football');
}

const db = neon(DATABASE_URL);
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com';

// NCAA Football Team to Conference Mapping
const NCAA_TEAM_CONFERENCES: Record<string, string> = {
	// SEC (Southeastern Conference)
	'Alabama': 'SEC',
	'Arkansas': 'SEC',
	'Auburn': 'SEC',
	'Florida': 'SEC',
	'Georgia': 'SEC',
	'Kentucky': 'SEC',
	'LSU': 'SEC',
	'Mississippi State': 'SEC',
	'Missouri': 'SEC',
	'Ole Miss': 'SEC',
	'South Carolina': 'SEC',
	'Tennessee': 'SEC',
	'Texas A&M': 'SEC',
	'Vanderbilt': 'SEC',
	
	// Big Ten
	'Illinois': 'Big Ten',
	'Indiana': 'Big Ten',
	'Iowa': 'Big Ten',
	'Maryland': 'Big Ten',
	'Michigan': 'Big Ten',
	'Michigan State': 'Big Ten',
	'Minnesota': 'Big Ten',
	'Nebraska': 'Big Ten',
	'Northwestern': 'Big Ten',
	'Ohio State': 'Big Ten',
	'Penn State': 'Big Ten',
	'Purdue': 'Big Ten',
	'Rutgers': 'Big Ten',
	'Wisconsin': 'Big Ten',
	
	// ACC (Atlantic Coast Conference)
	'Boston College': 'ACC',
	'Clemson': 'ACC',
	'Duke': 'ACC',
	'Florida State': 'ACC',
	'Georgia Tech': 'ACC',
	'Louisville': 'ACC',
	'Miami': 'ACC',
	'North Carolina': 'ACC',
	'NC State': 'ACC',
	'Pittsburgh': 'ACC',
	'Syracuse': 'ACC',
	'Virginia': 'ACC',
	'Virginia Tech': 'ACC',
	'Wake Forest': 'ACC',
	
	// Big 12
	'Baylor': 'Big 12',
	'BYU': 'Big 12',
	'Cincinnati': 'Big 12',
	'Houston': 'Big 12',
	'Iowa State': 'Big 12',
	'Kansas': 'Big 12',
	'Kansas State': 'Big 12',
	'Oklahoma State': 'Big 12',
	'TCU': 'Big 12',
	'Texas': 'Big 12',
	'Texas Tech': 'Big 12',
	'UCF': 'Big 12',
	'West Virginia': 'Big 12',
	
	// Pac-12
	'Arizona': 'Pac-12',
	'Arizona State': 'Pac-12',
	'California': 'Pac-12',
	'Colorado': 'Pac-12',
	'Oregon': 'Pac-12',
	'Oregon State': 'Pac-12',
	'Stanford': 'Pac-12',
	'UCLA': 'Pac-12',
	'USC': 'Pac-12',
	'Utah': 'Pac-12',
	'Washington': 'Pac-12',
	'Washington State': 'Pac-12',
	
	// AAC (American Athletic Conference)
	'Charlotte': 'AAC',
	'ECU': 'AAC',
	'FAU': 'AAC',
	'Memphis': 'AAC',
	'Navy': 'AAC',
	'North Texas': 'AAC',
	'Rice': 'AAC',
	'SMU': 'AAC',
	'South Florida': 'AAC',
	'Temple': 'AAC',
	'Tulane': 'AAC',
	'Tulsa': 'AAC',
	'UTSA': 'AAC',
	
	// Mountain West
	'Air Force': 'Mountain West',
	'Boise State': 'Mountain West',
	'Colorado State': 'Mountain West',
	'Fresno State': 'Mountain West',
	'Hawaii': 'Mountain West',
	'Nevada': 'Mountain West',
	'New Mexico': 'Mountain West',
	'San Diego State': 'Mountain West',
	'San Jose State': 'Mountain West',
	'UNLV': 'Mountain West',
	'Utah State': 'Mountain West',
	'Wyoming': 'Mountain West',
	
	// Conference USA
	'FIU': 'Conference USA',
	'Jacksonville State': 'Conference USA',
	'Liberty': 'Conference USA',
	'Louisiana Tech': 'Conference USA',
	'Middle Tennessee': 'Conference USA',
	'New Mexico State': 'Conference USA',
	'Sam Houston': 'Conference USA',
	'UTEP': 'Conference USA',
	'WKU': 'Conference USA',
	
	// MAC (Mid-American Conference)
	'Akron': 'MAC',
	'Ball State': 'MAC',
	'Bowling Green': 'MAC',
	'Buffalo': 'MAC',
	'Central Michigan': 'MAC',
	'Eastern Michigan': 'MAC',
	'Kent State': 'MAC',
	'Miami (OH)': 'MAC',
	'Northern Illinois': 'MAC',
	'Ohio': 'MAC',
	'Toledo': 'MAC',
	'Western Michigan': 'MAC',
	
	// Sun Belt
	'Appalachian State': 'Sun Belt',
	'Arkansas State': 'Sun Belt',
	'Coastal Carolina': 'Sun Belt',
	'Georgia Southern': 'Sun Belt',
	'Georgia State': 'Sun Belt',
	'James Madison': 'Sun Belt',
	'Louisiana': 'Sun Belt',
	'Louisiana-Monroe': 'Sun Belt',
	'Marshall': 'Sun Belt',
	'Old Dominion': 'Sun Belt',
	'South Alabama': 'Sun Belt',
	'Southern Miss': 'Sun Belt',
	'Texas State': 'Sun Belt',
	'Troy': 'Sun Belt',
	
	// Independents
	'Notre Dame': 'Independent',
	'UMass': 'Independent',
};

// Helper function to find conference by team name (fuzzy matching)
function findConference(teamName: string | null): string | null {
	if (!teamName) return null;
	
	// Direct match
	if (NCAA_TEAM_CONFERENCES[teamName]) {
		return NCAA_TEAM_CONFERENCES[teamName];
	}
	
	// Try partial matches (e.g., "Alabama Crimson Tide" -> "Alabama")
	const teamNameLower = teamName.toLowerCase();
	
	for (const [key, conference] of Object.entries(NCAA_TEAM_CONFERENCES)) {
		const keyLower = key.toLowerCase();
		
		// Check if team name contains the key or vice versa
		if (teamNameLower.includes(keyLower) || keyLower.includes(teamNameLower.split(' ')[0])) {
			return conference;
		}
		
		// Check common variations
		if (teamNameLower.includes('crimson tide') && key === 'Alabama') return conference;
		if (teamNameLower.includes('tigers') && key === 'LSU') return conference;
		if (teamNameLower.includes('buckeyes') && key === 'Ohio State') return conference;
		if (teamNameLower.includes('wolverines') && key === 'Michigan') return conference;
		if (teamNameLower.includes('longhorns') && key === 'Texas') return conference;
		if (teamNameLower.includes('sooners') && key === 'Oklahoma') return conference;
		if (teamNameLower.includes('trojan') && key === 'USC') return conference;
		if (teamNameLower.includes('bruins') && key === 'UCLA') return conference;
		if (teamNameLower.includes('ducks') && key === 'Oregon') return conference;
		if (teamNameLower.includes('badgers') && key === 'Wisconsin') return conference;
	}
	
	return null;
}

async function fetchOddsAPI(endpoint: string, retryCount = 0): Promise<any> {
	const url = `${ODDS_API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${ODDS_API_KEY}`;
	
	// Add delay to avoid rate limiting
	if (retryCount > 0) {
		const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
		console.log(`   ⏳ Waiting ${delay / 1000}s before retry ${retryCount}...`);
		await new Promise(resolve => setTimeout(resolve, delay));
	} else {
		// Small delay before first request
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

	// Check rate limit headers
	const requestsRemaining = response.headers.get('x-requests-remaining');
	if (requestsRemaining) {
		console.log(`   📊 API requests remaining: ${requestsRemaining}`);
	}

	return await response.json();
}

async function getOrCreateNCAAFBSport() {
	const [sport] = await db`
		SELECT id FROM sports WHERE code = 'NCAAFB' LIMIT 1
	`;

	if (sport) {
		return sport.id;
	}

	const [newSport] = await db`
		INSERT INTO sports (name, code, is_active)
		VALUES ('NCAA Football', 'NCAAFB', true)
		RETURNING id
	`;

	return newSport.id;
}

function generateAbbreviation(teamName: string, providedAbbr: string | null = null, providedAlias: string | null = null): string {
	// If we have a provided abbreviation, use it (but limit to 10 chars)
	if (providedAbbr) {
		return providedAbbr.substring(0, 10).toUpperCase();
	}
	
	// If alias is short enough, use it
	if (providedAlias && providedAlias.length <= 10) {
		return providedAlias.substring(0, 10).toUpperCase();
	}
	
	// Generate abbreviation from team name
	// Try to extract meaningful parts (e.g., "Alabama Crimson Tide" -> "ALA")
	const words = teamName.split(' ');
	if (words.length > 1) {
		// Take first letter of each word, up to 10 characters
		const abbr = words.map(w => w[0]).join('').toUpperCase();
		return abbr.substring(0, 10);
	}
	
	// Fallback: first 10 characters of team name
	return teamName.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function getOrCreateTeam(sportId: number, teamData: any) {
	if (!teamData || !teamData.name) {
		return null;
	}

	const teamName = teamData.name || 'Unknown';
	const teamAbbreviation = generateAbbreviation(teamName, teamData.abbreviation, teamData.alias);
	const teamCity = teamData.market || teamData.city || teamName;
	const externalId = teamData.id || null;

	// Try to find existing team by external_id first (if available)
	if (externalId) {
		const [existingTeam] = await db`
			SELECT id FROM teams WHERE external_id = ${externalId} AND sport_id = ${sportId} LIMIT 1
		`;

		if (existingTeam) {
			return existingTeam.id;
		}
	}

	// Try to find by name and abbreviation (case-insensitive)
	const [existingByName] = await db`
		SELECT id, external_id, conference FROM teams 
		WHERE sport_id = ${sportId} 
			AND (LOWER(name) = LOWER(${teamName}) OR LOWER(abbreviation) = LOWER(${teamAbbreviation}))
		LIMIT 1
	`;

	if (existingByName) {
		// Update external_id and conference if we have them
		const conference = findConference(teamName);
		const needsUpdate = (externalId && !existingByName.external_id) || (conference && !existingByName.conference);
		
		if (needsUpdate) {
			await db`
				UPDATE teams 
				SET 
					external_id = COALESCE(${externalId}, external_id),
					conference = COALESCE(${conference}, conference),
					updated_at = NOW()
				WHERE id = ${existingByName.id}
			`;
		}
		
		return existingByName.id;
	}

	// Determine conference
	const conference = findConference(teamName);

	// Create new team
	const [newTeam] = await db`
		INSERT INTO teams (
			sport_id, name, abbreviation, city, external_id, conference, created_at, updated_at
		) VALUES (
			${sportId},
			${teamName},
			${teamAbbreviation},
			${teamCity},
			${externalId},
			${conference},
			NOW(),
			NOW()
		)
		RETURNING id
	`;

	return newTeam.id;
}

export async function syncNCAAMatchups() {
	console.log('🏈 Starting NCAA Football Matchups Sync\n');

	try {
		const sportId = await getOrCreateNCAAFBSport();
		console.log(`✅ NCAA Football Sport ID: ${sportId}`);

		// Calculate current week's date range (today through next 6 days)
		const now = new Date();
		
		// Current week starts today at midnight local time
		const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
		
		// Current week ends 6 days from today (7 days total) at 23:59:59
		const currentWeekEnd = new Date(currentWeekStart);
		currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
		currentWeekEnd.setHours(23, 59, 59, 999);

		console.log(`📅 Current week: ${currentWeekStart.toISOString().split('T')[0]} to ${currentWeekEnd.toISOString().split('T')[0]}`);

		// Fetch games and odds from The Odds API
		console.log(`\n📊 Fetching NCAA Football games and odds from The Odds API...`);
		let allGames: any[] = [];
		
		try {
			const oddsEvents = await fetchOddsAPI('/v4/sports/americanfootball_ncaaf/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american');
			
			// Filter events for current week and convert to our format
			for (const event of oddsEvents) {
				if (event.commence_time) {
					const gameDate = new Date(event.commence_time);
					if (gameDate >= currentWeekStart && gameDate <= currentWeekEnd) {
						// Convert Odds API event to our format
						allGames.push({
							id: event.id,
							scheduled: event.commence_time,
							home: { 
								name: event.home_team, 
								market: event.home_team, 
								alias: event.home_team 
							},
							away: { 
								name: event.away_team, 
								market: event.away_team, 
								alias: event.away_team 
							},
							status: 'scheduled',
							home_points: null,
							away_points: null,
							quarter: null,
							clock: null,
							oddsEvent: event // Store full event for odds extraction
						});
					}
				}
			}
			console.log(`✅ Found ${allGames.length} games from The Odds API`);
		} catch (error: any) {
			console.error(`❌ Failed to fetch from The Odds API: ${error.message}`);
			throw error;
		}

		if (allGames.length === 0) {
			console.log(`⚠️  No games found for current week`);
			console.log(`   💡 Tip: Make sure ODDS_API_KEY is set and The Odds API has NCAA Football games available`);
			return {
				success: true,
				syncedCount: 0,
				updatedCount: 0,
				errorCount: 0,
				totalProcessed: 0
			};
		}

		console.log(`✅ Found ${allGames.length} games for current week\n`);

		let syncedCount = 0;
		let updatedCount = 0;
		let errorCount = 0;

		// Process each game
		for (const game of allGames) {
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

				if (!homeTeamId || !awayTeamId) {
					console.log(`⚠️  Skipping game ${gameId}: Could not create teams`);
					continue;
				}

				// Check if game already exists
				const [existingGame] = await db`
					SELECT id FROM games WHERE external_id = ${gameId} LIMIT 1
				`;

				// Extract odds from The Odds API event
				const oddsEvent = game.oddsEvent;
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
					source: 'the-odds-api'
				};

				if (oddsEvent && oddsEvent.bookmakers && oddsEvent.bookmakers.length > 0) {
					// Extract best odds from all bookmakers
					let bestSpread: any = null;
					let bestTotal: any = null;
					let bestMoneyline: any = { home: null, away: null };

					for (const bookmaker of oddsEvent.bookmakers) {
						for (const market of bookmaker.markets) {
							if (market.key === 'spreads') {
								for (const outcome of market.outcomes) {
									if (outcome.point !== undefined) {
										if (!bestSpread || Math.abs(outcome.point) < Math.abs(bestSpread.line)) {
											bestSpread = {
												line: outcome.point,
												homeOdds: outcome.name === oddsEvent.home_team ? outcome.price : null,
												awayOdds: outcome.name === oddsEvent.away_team ? outcome.price : null
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
									if (outcome.name === oddsEvent.home_team) {
										if (!bestMoneyline.home || outcome.price > bestMoneyline.home) {
											bestMoneyline.home = outcome.price;
										}
									} else if (outcome.name === oddsEvent.away_team) {
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
				}
			} catch (gameError: any) {
				console.error(`   ❌ Error syncing game ${game.id}: ${gameError.message}`);
				errorCount++;
			}
		}

		console.log(`\n✅ NCAA Football sync completed:`);
		console.log(`   📥 New games: ${syncedCount}`);
		console.log(`   🔄 Updated games: ${updatedCount}`);
		console.log(`   ❌ Errors: ${errorCount}`);
		console.log(`   📊 Total processed: ${allGames.length}`);
		console.log('\n🎉 Sync completed successfully!');

		return {
			success: true,
			syncedCount,
			updatedCount,
			errorCount,
			totalProcessed: allGames.length
		};
	} catch (error: any) {
		console.error('❌ Sync failed:', error);
		throw error;
	}
}

