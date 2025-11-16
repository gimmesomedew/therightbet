import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY;

if (!DATABASE_URL || !SPORTSDATAIO_API_KEY) {
	console.error('❌ Missing required environment variables');
	process.exit(1);
}

const db = neon(DATABASE_URL);

async function syncTodaysGames() {
	console.log('🏀 Syncing today\'s WNBA games from SportsDataIO...');
	
	try {
		// Get today's date in YYYY-MM-DD format
		const today = new Date().toISOString().split('T')[0];
		console.log(`📅 Fetching games for: ${today}`);
		
		// Fetch today's games from SportsDataIO
		const url = `https://api.sportsdata.io/v3/wnba/scores/json/gamesbydate/${today}?key=${SPORTSDATAIO_API_KEY}`;
		console.log('📡 Making API request to SportsDataIO...');
		
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`SportsDataIO API error: ${response.status} ${response.statusText}`);
		}
		
		const games = await response.json();
		console.log(`📊 Found ${games.length} games for today`);
		
		if (games.length === 0) {
			console.log('ℹ️  No games scheduled for today');
			return;
		}
		
		// Get team mappings from our database
		const teams = await db`
			SELECT id, external_id, name, abbreviation 
			FROM teams 
			WHERE sport_id = (SELECT id FROM sports WHERE code = 'WNBA')
		`;
		
		const teamMap = new Map();
		teams.forEach(team => {
			teamMap.set(team.external_id, team);
		});
		
		// Team mappings are ready
		
		console.log(`📋 Found ${teams.length} teams in database`);
		
		// Process each game
		let syncedCount = 0;
		let skippedCount = 0;
		
		for (const game of games) {
			try {
				// Find teams in our database (convert numbers to strings for lookup)
				const homeTeam = teamMap.get(game.HomeTeamID.toString());
				const awayTeam = teamMap.get(game.AwayTeamID.toString());
				
				if (!homeTeam || !awayTeam) {
					console.log(`⚠️  Skipping game ${game.GameID}: Team not found in database`);
					skippedCount++;
					continue;
				}
				
				// Check if game already exists
				const existingGame = await db`
					SELECT id FROM games WHERE external_id = ${game.GameID.toString()}
				`;
				
				if (existingGame.length > 0) {
					// Update existing game
					await db`
						UPDATE games SET
							home_team_id = ${homeTeam.id},
							away_team_id = ${awayTeam.id},
							game_date = ${game.DateTime},
							status = ${game.Status},
							home_score = ${game.HomeTeamScore},
							away_score = ${game.AwayTeamScore},
							quarter = ${game.Quarter},
							time_remaining = ${game.TimeRemainingMinutes ? `${game.TimeRemainingMinutes}:${game.TimeRemainingSeconds || '00'}` : null},
							updated_at = NOW()
						WHERE external_id = ${game.GameID.toString()}
					`;
					console.log(`✅ Updated game: ${awayTeam.abbreviation} @ ${homeTeam.abbreviation}`);
				} else {
					// Insert new game
					await db`
						INSERT INTO games (
							external_id, home_team_id, away_team_id, game_date, 
							status, home_score, away_score, quarter, time_remaining
						) VALUES (
							${game.GameID.toString()}, ${homeTeam.id}, ${awayTeam.id}, 
							${game.DateTime}, ${game.Status}, ${game.HomeTeamScore}, 
							${game.AwayTeamScore}, ${game.Quarter}, 
							${game.TimeRemainingMinutes ? `${game.TimeRemainingMinutes}:${game.TimeRemainingSeconds || '00'}` : null}
						)
					`;
					console.log(`✅ Added game: ${awayTeam.abbreviation} @ ${homeTeam.abbreviation}`);
				}
				
				syncedCount++;
				
			} catch (error) {
				console.error(`❌ Error processing game ${game.GameID}:`, error.message);
				skippedCount++;
			}
		}
		
		console.log(`\n📊 Sync Results:`);
		console.log(`   ✅ Synced: ${syncedCount} games`);
		console.log(`   ⚠️  Skipped: ${skippedCount} games`);
		console.log(`   📅 Date: ${today}`);
		
		if (syncedCount > 0) {
			console.log('\n🎉 Today\'s games synced successfully!');
		}
		
	} catch (error) {
		console.error('❌ Error syncing today\'s games:', error);
		throw error;
	}
}

// Run the sync
syncTodaysGames()
	.then(() => {
		console.log('✅ Sync completed');
		process.exit(0);
	})
	.catch(error => {
		console.error('❌ Sync failed:', error);
		process.exit(1);
	});
