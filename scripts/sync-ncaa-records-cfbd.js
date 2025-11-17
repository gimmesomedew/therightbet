import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
const CFBD_API_KEY = process.env.CFBD_API_KEY;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

if (!CFBD_API_KEY) {
	console.error('❌ CFBD_API_KEY environment variable is required');
	console.error('   Get a free API key at: https://collegefootballdata.com/');
	console.error('   Add CFBD_API_KEY to your .env file');
	process.exit(1);
}

const db = neon(DATABASE_URL);
const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

async function makeRequest(endpoint, retryCount = 0) {
	const url = `${CFBD_BASE_URL}${endpoint}`;
	
	if (retryCount > 0) {
		const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
		console.log(`   ⏳ Waiting ${delay / 1000}s before retry ${retryCount}...`);
		await new Promise(resolve => setTimeout(resolve, delay));
	} else {
		await new Promise(resolve => setTimeout(resolve, 500));
	}
	
	const response = await fetch(url, {
		headers: {
			'Authorization': `Bearer ${CFBD_API_KEY}`,
			'Accept': 'application/json'
		}
	});

	if (!response.ok) {
		if (response.status === 429 && retryCount < 3) {
			return makeRequest(endpoint, retryCount + 1);
		}
		const errorText = await response.text().catch(() => response.statusText);
		throw new Error(`CFBD API error: ${response.status} ${errorText}`);
	}

	return await response.json();
}

async function syncNCAAARecords() {
	console.log('🏈 Syncing NCAA Football Team Records from College Football Data API...\n');
	
	try {
		const [sport] = await db`SELECT id FROM sports WHERE code = 'NCAAFB' LIMIT 1`;
		if (!sport) {
			console.log('❌ NCAAFB sport not found');
			return;
		}

		const currentYear = new Date().getFullYear();
		const season = currentYear;

		console.log(`📊 Fetching team records for ${season} season...`);
		
		// Fetch team records from CFBD API
		// Endpoint: /records?year={year}
		let recordsData = [];
		
		try {
			console.log(`   Fetching records for ${season}...`);
			recordsData = await makeRequest(`/records?year=${season}`);
			console.log(`   ✅ Found ${recordsData.length} team records`);
		} catch (error) {
			console.log(`   ⚠️  Records endpoint failed: ${error.message}`);
			throw error;
		}

		if (!Array.isArray(recordsData) || recordsData.length === 0) {
			console.log('⚠️  No team records returned from API');
			return;
		}

		console.log(`\n📝 Updating team records...\n`);

		let updated = 0;
		let notFound = 0;
		const teamMapping = new Map();

		// Create a mapping of team names/abbreviations
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

		// Process each team record from CFBD API
		for (const recordData of recordsData) {
			// CFBD API format: { team, conference, division, total.wins, total.losses, etc. }
			const teamName = recordData.team;
			const wins = recordData.total?.wins || recordData.wins || 0;
			const losses = recordData.total?.losses || recordData.losses || 0;

			if (!teamName) {
				continue;
			}

			// Try to find matching team in database
			let matchedTeam = null;
			const searchKeys = [
				teamName.toLowerCase(),
				teamName.split(' ').pop()?.toLowerCase(), // Last word
				teamName.split(' ').slice(-2).join(' ').toLowerCase() // Last two words
			].filter(Boolean);

			for (const key of searchKeys) {
				if (teamMapping.has(key)) {
					matchedTeam = teamMapping.get(key);
					break;
				}
			}

			// Try fuzzy matching
			if (!matchedTeam) {
				for (const [dbKey, dbTeam] of teamMapping.entries()) {
					const teamNameLower = teamName.toLowerCase();
					// Check if team name contains key or vice versa
					if (teamNameLower.includes(dbKey) || dbKey.includes(teamNameLower.split(' ').pop() || '')) {
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
					console.log(`   ⚠️  Could not match: ${teamName}`);
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

