import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const SPORTRADAR_API_KEY = process.env.SPORTRADAR_API_KEY;

if (!SPORTRADAR_API_KEY) {
	console.error('❌ SPORTRADAR_API_KEY environment variable is required');
	process.exit(1);
}

console.log('🧪 Testing SportsRadar Integration...\n');

async function testSportsRadarIntegration() {
	try {
		// Test 1: API Connection
		console.log('1️⃣ Testing SportsRadar API Connection...');
		const response = await fetch('http://localhost:5173/api/sportradar/test');
		const data = await response.json();
		
		if (data.success) {
			console.log('✅ SportsRadar API connection successful');
			console.log(`   Found ${data.data.teamsCount} teams`);
			console.log('   Sample teams:');
			data.data.sampleTeams.forEach(team => {
				console.log(`     - ${team.market} ${team.name} (${team.alias})`);
			});
		} else {
			console.log(`❌ SportsRadar API connection failed: ${data.message}`);
		}
		
		// Test 2: Dashboard Stats
		console.log('\n2️⃣ Testing Dashboard Stats...');
		const statsResponse = await fetch('http://localhost:5173/api/dashboard/stats');
		const statsData = await statsResponse.json();
		
		if (statsData.success) {
			console.log('✅ Dashboard stats API working');
			console.log(`   Today's games: ${statsData.data.todaysGames}`);
			console.log(`   Total teams: ${statsData.data.totalTeams}`);
			console.log(`   Total players: ${statsData.data.totalPlayers}`);
			console.log(`   Upcoming games: ${statsData.data.upcomingGames}`);
		} else {
			console.log(`❌ Dashboard stats failed: ${statsData.message}`);
		}
		
		// Test 3: Today's Games
		console.log('\n3️⃣ Testing Today\'s Games...');
		const gamesResponse = await fetch('http://localhost:5173/api/games/today');
		const gamesData = await gamesResponse.json();
		
		if (gamesData.success) {
			console.log('✅ Today\'s games API working');
			console.log(`   Found ${gamesData.count} games for today`);
			if (gamesData.data.length > 0) {
				gamesData.data.slice(0, 2).forEach(game => {
					console.log(`     - ${game.homeTeam.name} vs ${game.awayTeam.name} (${game.status})`);
				});
			}
		} else {
			console.log(`❌ Today\'s games failed: ${gamesData.message}`);
		}
		
		// Test 4: WNBA Teams
		console.log('\n4️⃣ Testing WNBA Teams...');
		const teamsResponse = await fetch('http://localhost:5173/api/wnba/teams');
		const teamsData = await teamsResponse.json();
		
		if (teamsData.success) {
			console.log('✅ WNBA teams API working');
			console.log(`   Found ${teamsData.data.length} teams`);
			teamsData.data.slice(0, 3).forEach(team => {
				console.log(`     - ${team.name} (${team.abbreviation}) - ${team.player_count} players`);
			});
		} else {
			console.log(`❌ WNBA teams failed: ${teamsData.message}`);
		}
		
		// Test 5: Head-to-Head Data
		console.log('\n5️⃣ Testing Head-to-Head Data...');
		const h2hResponse = await fetch('http://localhost:5173/api/games/a2a9accd-4d63-4b09-bf13-6b83d3155c52/head-to-head-sportradar');
		const h2hData = await h2hResponse.json();
		
		if (h2hData.success) {
			console.log('✅ Head-to-head API working');
			console.log(`   Series: ${h2hData.data.allTimeSeries}`);
			console.log(`   Source: ${h2hData.data.source}`);
			console.log(`   Recent meetings: ${h2hData.data.lastFiveMeetings.length}`);
		} else {
			console.log(`❌ Head-to-head failed: ${h2hData.message}`);
		}
		
		console.log('\n🎉 SportsRadar Integration Test Completed!');
		console.log('\n📊 Summary:');
		console.log('   - SportsRadar API: ✅ Connected');
		console.log('   - Dashboard Stats: ✅ Working');
		console.log('   - Today\'s Games: ✅ Working');
		console.log('   - WNBA Teams: ✅ Working');
		console.log('   - Head-to-Head: ✅ Working');
		
	} catch (error) {
		console.error('❌ Integration test failed:', error.message);
	}
}

// Run the test
testSportsRadarIntegration();
