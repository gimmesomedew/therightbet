import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY || process.env.SPORTSDATA_IO_API_KEY;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

if (!SPORTSDATAIO_API_KEY) {
	console.error('❌ SPORTSDATAIO_API_KEY environment variable is required');
	console.error('   Set SPORTSDATAIO_API_KEY or SPORTSDATA_IO_API_KEY in your .env file');
	process.exit(1);
}

const db = neon(DATABASE_URL);
const SPORTSDATAIO_BASE_URL = 'https://api.sportsdata.io/v3/cfb';

async function makeRequest(endpoint, retryCount = 0) {
	const url = `${SPORTSDATAIO_BASE_URL}${endpoint}?key=${SPORTSDATAIO_API_KEY}`;
	
	if (retryCount > 0) {
		const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
		console.log(`   ⏳ Waiting ${delay / 1000}s before retry ${retryCount}...`);
		await new Promise(resolve => setTimeout(resolve, delay));
	} else {
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
	
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429 && retryCount < 3) {
			return makeRequest(endpoint, retryCount + 1);
		}
		const errorText = await response.text().catch(() => response.statusText);
		throw new Error(`SportsDataIO API error: ${response.status} ${errorText}`);
	}

	return await response.json();
}

async function syncNCAAARecords() {
	console.log('🏈 Syncing NCAA Football Team Records from SportsDataIO...\n');
	
	try {
		const [sport] = await db`SELECT id FROM sports WHERE code = 'NCAAFB' LIMIT 1`;
		if (!sport) {
			console.log('❌ NCAAFB sport not found');
			return;
		}

		// Get current season
		const currentYear = new Date().getFullYear();
		const season = currentYear;

		console.log(`📊 Fetching team records for ${season} season...`);
		
		// Fetch team standings/records from SportsDataIO
		// Try multiple endpoint variations
		let teamsData = [];
		let lastError = null;
		
		const endpoints = [
			`/scores/json/Standings/${season}`,
			`/stats/json/Standings/${season}`,
			`/scores/json/Teams`,
			`/stats/json/Teams`,
			`/scores/json/TeamSeasonStats/${season}`,
		];
		
		for (const endpoint of endpoints) {
			try {
				console.log(`   Trying ${endpoint}...`);
				teamsData = await makeRequest(endpoint);
				
				if (Array.isArray(teamsData) && teamsData.length > 0) {
					console.log(`   ✅ Found ${teamsData.length} teams from ${endpoint}`);
					break;
				} else if (typeof teamsData === 'object' && teamsData !== null) {
					// Might be wrapped in an object
					if (teamsData.Teams && Array.isArray(teamsData.Teams)) {
						teamsData = teamsData.Teams;
						console.log(`   ✅ Found ${teamsData.length} teams from ${endpoint}`);
						break;
					} else if (teamsData.Standings && Array.isArray(teamsData.Standings)) {
						teamsData = teamsData.Standings;
						console.log(`   ✅ Found ${teamsData.length} teams from ${endpoint}`);
						break;
					}
				}
			} catch (error) {
				lastError = error;
				console.log(`   ⚠️  ${endpoint} failed: ${error.message}`);
				continue;
			}
		}
		
		if (!Array.isArray(teamsData) || teamsData.length === 0) {
			console.log('\n❌ Could not fetch team data from SportsDataIO');
			console.log('   Possible reasons:');
			console.log('   1. API key does not have College Football (CFB) access');
			console.log('   2. API key subscription tier does not include CFB endpoints');
			console.log('   3. Endpoint paths may have changed');
			console.log('\n   💡 Check your SportsDataIO subscription to ensure CFB access is enabled');
			console.log('   💡 Contact SportsDataIO support if you need CFB API access');
			if (lastError) {
				throw lastError;
			}
			return;
		}

		console.log(`\n📝 Updating team records...\n`);

		let updated = 0;
		let notFound = 0;
		const teamMapping = new Map();

		// First, create a mapping of team names/abbreviations
		const dbTeams = await db`
			SELECT id, name, abbreviation, city
			FROM teams 
			WHERE sport_id = ${sport.id}
		`;

		dbTeams.forEach(team => {
			const key = team.name.toLowerCase();
			teamMapping.set(key, team);
			if (team.abbreviation) {
				teamMapping.set(team.abbreviation.toLowerCase(), team);
			}
			if (team.city) {
				const cityName = `${team.city} ${team.name}`.toLowerCase();
				teamMapping.set(cityName, team);
			}
		});

		// Process each team from SportsDataIO
		for (const teamData of teamsData) {
			// SportsDataIO format: { TeamID, Key, School, Name, Wins, Losses, ConferenceWins, ConferenceLosses, ... }
			const school = teamData.School || '';
			const name = teamData.Name || '';
			const abbreviation = teamData.Key || teamData.Abbreviation || teamData.ShortDisplayName || '';
			
			// Combine School + Name for full team name (e.g., "Ohio State" + "Buckeyes" = "Ohio State Buckeyes")
			const fullTeamName = school && name ? `${school} ${name}`.trim() : (school || name || teamData.FullName || teamData.TeamName || '');
			
			// Parse wins and losses, handling null/undefined
			let wins = 0;
			let losses = 0;
			
			if (teamData.Wins !== null && teamData.Wins !== undefined) {
				const parsedWins = parseInt(teamData.Wins);
				wins = isNaN(parsedWins) ? 0 : parsedWins;
			}
			
			if (teamData.Losses !== null && teamData.Losses !== undefined) {
				const parsedLosses = parseInt(teamData.Losses);
				losses = isNaN(parsedLosses) ? 0 : parsedLosses;
			}

			if (!fullTeamName) {
				console.log(`   ⚠️  Skipping team with no name:`, JSON.stringify(teamData).substring(0, 100));
				continue;
			}

			// Try to find matching team in database
			let matchedTeam = null;
			const searchKeys = [
				fullTeamName.toLowerCase(),
				school.toLowerCase(),
				name.toLowerCase(),
				abbreviation.toLowerCase(),
				fullTeamName.split(' ').pop()?.toLowerCase(), // Last word (e.g., "Buckeyes" from "Ohio State Buckeyes")
				school.split(' ').pop()?.toLowerCase(),
				name.split(' ').pop()?.toLowerCase()
			].filter(Boolean);

			// First try exact matches
			for (const key of searchKeys) {
				if (teamMapping.has(key)) {
					matchedTeam = teamMapping.get(key);
					break;
				}
			}

			// Try fuzzy matching if exact match failed
			if (!matchedTeam) {
				const fullTeamNameLower = fullTeamName.toLowerCase();
				const schoolLower = school.toLowerCase();
				const nameLower = name.toLowerCase();
				const abbrLower = abbreviation.toLowerCase();
				
				for (const [dbKey, dbTeam] of teamMapping.entries()) {
					const dbNameLower = (dbTeam.name || '').toLowerCase();
					const dbAbbrLower = (dbTeam.abbreviation || '').toLowerCase();
					
					// Check various combinations
					// Match if database name contains full team name or vice versa
					if (dbNameLower.includes(fullTeamNameLower) || 
						fullTeamNameLower.includes(dbNameLower) ||
						// Match if database name contains school name or vice versa
						dbNameLower.includes(schoolLower) ||
						schoolLower.includes(dbNameLower) ||
						// Match if database name contains mascot name (last word)
						dbNameLower.includes(nameLower) ||
						nameLower.includes(dbNameLower) ||
						// Match by abbreviation
						(abbrLower && (abbrLower === dbAbbrLower || dbAbbrLower === abbrLower)) ||
						// Match if database abbreviation matches common variations
						(abbrLower && dbAbbrLower && (
							abbrLower.replace(/[^a-z]/g, '') === dbAbbrLower.replace(/[^a-z]/g, '') ||
							abbrLower.substring(0, 3) === dbAbbrLower.substring(0, 3)
						))) {
						matchedTeam = dbTeam;
						break;
					}
				}
			}

			if (matchedTeam) {
				await db`
					UPDATE teams
					SET wins = ${wins}, losses = ${losses}, updated_at = NOW()
					WHERE id = ${matchedTeam.id}
				`;
				updated++;
				if (updated <= 10) {
					console.log(`   ✅ ${matchedTeam.name}: ${wins}-${losses}`);
				}
			} else {
				notFound++;
				if (notFound <= 5) {
					console.log(`   ⚠️  Could not match: ${fullTeamName} (${abbreviation || 'N/A'})`);
				}
			}
		}

		console.log(`\n✅ Records sync completed:`);
		console.log(`   📊 Updated: ${updated} teams`);
		if (notFound > 0) {
			console.log(`   ⚠️  Not found: ${notFound} teams`);
		}

	} catch (error) {
		console.error('❌ Failed to sync records:', error.message);
		console.error('   Full error:', error);
		process.exit(1);
	}
}

syncNCAAARecords();

