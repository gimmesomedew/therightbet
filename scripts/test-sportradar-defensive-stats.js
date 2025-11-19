import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config();

const SPORTRADAR_API_KEY = process.env.SPORTRADAR_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SPORTRADAR_API_KEY) {
	console.error('❌ SPORTRADAR_API_KEY environment variable is required');
	process.exit(1);
}

const NFL_BASE_URL = 'https://api.sportradar.com/nfl/official/trial/v7/en';

async function makeRequest(endpoint) {
	const url = `${NFL_BASE_URL}${endpoint}?api_key=${SPORTRADAR_API_KEY}`;
	console.log(`\n📡 Fetching: ${endpoint}`);
	
	try {
		const response = await fetch(url);
		
		if (!response.ok) {
			console.error(`❌ Error ${response.status}: ${response.statusText}`);
			const text = await response.text();
			console.error(`Response: ${text.substring(0, 200)}`);
			return null;
		}
		
		return await response.json();
	} catch (error) {
		console.error(`❌ Request failed:`, error.message);
		return null;
	}
}

async function testDefensiveStatistics() {
	console.log('🔍 Testing Sportradar API for Defensive Statistics\n');
	console.log('=' .repeat(60));
	
	// Test 1: Get a recent game to analyze its statistics structure
	console.log('\n📊 Test 1: Fetching recent game statistics');
	console.log('-'.repeat(60));
	
	// Get Week 11 schedule for 2024 season
	const schedule = await makeRequest('/games/2024/REG/11/schedule.json');
	
	if (!schedule || !schedule.week || !schedule.week.games || schedule.week.games.length === 0) {
		console.log('⚠️  No games found in schedule. Trying 2025 season...');
		const schedule2025 = await makeRequest('/games/2025/REG/11/schedule.json');
		if (schedule2025 && schedule2025.week && schedule2025.week.games && schedule2025.week.games.length > 0) {
			const game = schedule2025.week.games[0];
			console.log(`\n✅ Found game: ${game.away.name} @ ${game.home.name}`);
			
			// Fetch game statistics
			const gameStats = await makeRequest(`/games/${game.id}/statistics.json`);
			
			if (gameStats && gameStats.statistics) {
				console.log('\n📈 Game Statistics Structure:');
				console.log(JSON.stringify(gameStats.statistics, null, 2).substring(0, 2000));
				
				// Check for defensive statistics
				if (gameStats.statistics.home) {
					console.log('\n🏠 Home Team Statistics Keys:');
					console.log(Object.keys(gameStats.statistics.home));
					
					// Look for defensive categories
					const defensiveKeys = Object.keys(gameStats.statistics.home).filter(key => 
						key.toLowerCase().includes('defense') || 
						key.toLowerCase().includes('defensive') ||
						key.toLowerCase().includes('allowed') ||
						key.toLowerCase().includes('against')
					);
					
					if (defensiveKeys.length > 0) {
						console.log('\n🛡️  Defensive-related keys found:', defensiveKeys);
					} else {
						console.log('\n⚠️  No obvious defensive keys found in game statistics');
					}
					
					// Check for red zone data
					const redZoneKeys = Object.keys(gameStats.statistics.home).filter(key => 
						key.toLowerCase().includes('red') || 
						key.toLowerCase().includes('zone') ||
						key.toLowerCase().includes('rz')
					);
					
					if (redZoneKeys.length > 0) {
						console.log('\n🔴 Red Zone-related keys found:', redZoneKeys);
					} else {
						console.log('\n⚠️  No red zone keys found in game statistics');
					}
				}
			}
		} else {
			console.log('❌ Could not find any games to test');
		}
	} else {
		const game = schedule.week.games[0];
		console.log(`\n✅ Found game: ${game.away.name} @ ${game.home.name}`);
		
		// Fetch game statistics
		const gameStats = await makeRequest(`/games/${game.id}/statistics.json`);
		
		if (gameStats && gameStats.statistics) {
			console.log('\n📈 Game Statistics Structure:');
			console.log(JSON.stringify(gameStats.statistics, null, 2).substring(0, 2000));
			
			// Check for defensive statistics
			if (gameStats.statistics.home) {
				console.log('\n🏠 Home Team Statistics Keys:');
				console.log(Object.keys(gameStats.statistics.home));
				
				// Look for defensive categories
				const defensiveKeys = Object.keys(gameStats.statistics.home).filter(key => 
					key.toLowerCase().includes('defense') || 
					key.toLowerCase().includes('defensive') ||
					key.toLowerCase().includes('allowed') ||
					key.toLowerCase().includes('against')
				);
				
				if (defensiveKeys.length > 0) {
					console.log('\n🛡️  Defensive-related keys found:', defensiveKeys);
				} else {
					console.log('\n⚠️  No obvious defensive keys found in game statistics');
				}
				
				// Check for red zone data
				const redZoneKeys = Object.keys(gameStats.statistics.home).filter(key => 
					key.toLowerCase().includes('red') || 
					key.toLowerCase().includes('zone') ||
					key.toLowerCase().includes('rz')
				);
				
				if (redZoneKeys.length > 0) {
					console.log('\n🔴 Red Zone-related keys found:', redZoneKeys);
				} else {
					console.log('\n⚠️  No red zone keys found in game statistics');
				}
			}
		}
	}
	
	// Test 2: Try to get team season statistics
	console.log('\n\n📊 Test 2: Fetching team season statistics');
	console.log('-'.repeat(60));
	
	// Get a team ID first (using Chiefs as example)
	const teams = await makeRequest('/league/hierarchy.json');
	
	if (teams && teams.conferences) {
		const team = teams.conferences[0]?.divisions[0]?.teams?.[0];
		if (team) {
			console.log(`\n✅ Found team: ${team.name} (ID: ${team.id})`);
			
			// Try to get team season statistics
			const teamStats = await makeRequest(`/seasons/2024/REG/teams/${team.id}/statistics.json`);
			
			if (teamStats) {
				console.log('\n📈 Team Statistics Structure:');
				console.log(JSON.stringify(teamStats, null, 2).substring(0, 2000));
				
				// Check for defensive statistics
				if (teamStats.statistics) {
					console.log('\n📊 Statistics Keys:');
					console.log(Object.keys(teamStats.statistics));
					
					const defensiveKeys = Object.keys(teamStats.statistics).filter(key => 
						key.toLowerCase().includes('defense') || 
						key.toLowerCase().includes('defensive') ||
						key.toLowerCase().includes('allowed') ||
						key.toLowerCase().includes('against')
					);
					
					if (defensiveKeys.length > 0) {
						console.log('\n🛡️  Defensive-related keys found:', defensiveKeys);
					}
				}
			} else {
				console.log('⚠️  Team statistics endpoint may not be available in trial tier');
			}
		}
	}
	
	// Test 3: Check standings for defensive rankings
	console.log('\n\n📊 Test 3: Fetching standings (may include defensive rankings)');
	console.log('-'.repeat(60));
	
	const standings = await makeRequest('/seasons/2024/REG/standings.json');
	
	if (standings) {
		console.log('\n📈 Standings Structure:');
		console.log(JSON.stringify(standings, null, 2).substring(0, 1500));
		
		if (standings.conferences) {
			const team = standings.conferences[0]?.divisions[0]?.teams?.[0];
			if (team) {
				console.log('\n📊 Team Standings Keys:');
				console.log(Object.keys(team));
			}
		}
	}
	
	console.log('\n\n' + '='.repeat(60));
	console.log('✅ Testing complete!');
	console.log('\n💡 Next Steps:');
	console.log('   1. Review the output above to see what defensive data is available');
	console.log('   2. Check if red zone statistics are included');
	console.log('   3. Verify if trial tier includes all needed endpoints');
	console.log('   4. Consider upgrading to paid tier if needed');
}

// Run the test
testDefensiveStatistics().catch(console.error);

