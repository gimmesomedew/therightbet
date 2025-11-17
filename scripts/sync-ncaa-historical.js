import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

if (!ODDS_API_KEY) {
	console.error('❌ ODDS_API_KEY environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com';

async function fetchOddsAPI(endpoint, retryCount = 0) {
	const url = `${ODDS_API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${ODDS_API_KEY}`;
	
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
			return fetchOddsAPI(endpoint, retryCount + 1);
		}
		const errorText = await response.text().catch(() => response.statusText);
		throw new Error(`The Odds API error: ${response.status} ${errorText}`);
	}

	const requestsRemaining = response.headers.get('x-requests-remaining');
	if (requestsRemaining) {
		console.log(`   📊 API requests remaining: ${requestsRemaining}`);
	}

	return await response.json();
}

async function syncHistoricalGames() {
	console.log('🏈 Fetching historical NCAA Football games...\n');
	
	try {
		const [sport] = await db`SELECT id FROM sports WHERE code = 'NCAAFB' LIMIT 1`;
		if (!sport) {
			console.log('❌ NCAAFB sport not found');
			return;
		}

		// Fetch all available games (not just current week)
		// The Odds API returns upcoming games, but we can check for completed ones
		const oddsEvents = await fetchOddsAPI('/v4/sports/americanfootball_ncaaf/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american');
		
		console.log(`Found ${oddsEvents.length} total events from The Odds API`);
		
		// Note: The Odds API primarily provides upcoming games
		// For historical records, you would need:
		// 1. A sports data API that provides historical results (like Sportradar, but they don't have NCAA in trial)
		// 2. Manual entry of records
		// 3. Or scrape from another source
		
		console.log('\n⚠️  The Odds API does not provide historical game results.');
		console.log('   To get team records, you need to:');
		console.log('   1. Use a sports data API with historical results');
		console.log('   2. Manually update team records in the database');
		console.log('   3. Or sync completed games from another source');
		
	} catch (error) {
		console.error('❌ Failed:', error.message);
		process.exit(1);
	}
}

syncHistoricalGames();

