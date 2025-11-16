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

console.log('🔑 SportsRadar API Key found:', SPORTRADAR_API_KEY.substring(0, 8) + '...');

// Test SportsRadar API endpoints
async function testSportsRadarAPI() {
	const baseUrl = 'https://api.sportradar.com/wnba/trial/v8/en';
	
	try {
		console.log('\n🧪 Testing SportsRadar WNBA API...\n');
		
		// Test 1: Get WNBA teams
		console.log('1️⃣ Testing WNBA Teams endpoint...');
		const teamsUrl = `${baseUrl}/league/hierarchy.json?api_key=${SPORTRADAR_API_KEY}`;
		const teamsResponse = await fetch(teamsUrl);
		
		if (teamsResponse.ok) {
			const teamsData = await teamsResponse.json();
			console.log('✅ Teams endpoint successful');
			console.log('   Raw data structure:', JSON.stringify(teamsData, null, 2).substring(0, 200) + '...');
			
			// Handle different possible data structures
			let teams = [];
			if (Array.isArray(teamsData)) {
				teams = teamsData;
			} else if (teamsData.teams && Array.isArray(teamsData.teams)) {
				teams = teamsData.teams;
			} else if (teamsData.conferences && Array.isArray(teamsData.conferences)) {
				// Flatten teams from conferences
				teams = teamsData.conferences.flatMap(conf => conf.divisions?.flatMap(div => div.teams || []) || []);
			}
			
			console.log(`   Found ${teams.length} teams`);
			if (teams.length > 0) {
				console.log(`   First team: ${teams[0].name || 'Unknown'}`);
				console.log(`   Team ID: ${teams[0].id || 'Unknown'}`);
				console.log(`   Market: ${teams[0].market || 'Unknown'}`);
			}
			// Show first few teams
			console.log('   Sample teams:');
			teams.slice(0, 3).forEach(team => {
				console.log(`     - ${team.market || 'Unknown'} ${team.name || 'Unknown'} (ID: ${team.id || 'Unknown'})`);
			});
		} else {
			console.log(`❌ Teams endpoint failed: ${teamsResponse.status} ${teamsResponse.statusText}`);
		}
		
		// Test 2: Get current season schedule
		console.log('\n2️⃣ Testing WNBA Schedule endpoint...');
		const currentYear = new Date().getFullYear();
		const scheduleUrl = `${baseUrl}/games/${currentYear}/REG/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
		const scheduleResponse = await fetch(scheduleUrl);
		
		if (scheduleResponse.ok) {
			const scheduleData = await scheduleResponse.json();
			console.log('✅ Schedule endpoint successful');
			console.log('   Raw schedule structure:', JSON.stringify(scheduleData, null, 2).substring(0, 200) + '...');
			
			// Handle different possible data structures
			let games = [];
			if (Array.isArray(scheduleData)) {
				games = scheduleData;
			} else if (scheduleData.games && Array.isArray(scheduleData.games)) {
				games = scheduleData.games;
			} else if (scheduleData.schedule && Array.isArray(scheduleData.schedule)) {
				games = scheduleData.schedule;
			}
			
			console.log(`   Found ${games.length} games for ${currentYear}`);
			if (games.length > 0) {
				const firstGame = games[0];
				console.log(`   First game: ${firstGame.home?.name || 'Unknown'} vs ${firstGame.away?.name || 'Unknown'}`);
				console.log(`   Game ID: ${firstGame.id || 'Unknown'}`);
				console.log(`   Scheduled: ${firstGame.scheduled || 'Unknown'}`);
				console.log(`   Status: ${firstGame.status || 'Unknown'}`);
			}
			// Show sample games
			console.log('   Sample games:');
			games.slice(0, 3).forEach(game => {
				console.log(`     - ${game.home?.market || 'Unknown'} ${game.home?.name || 'Unknown'} vs ${game.away?.market || 'Unknown'} ${game.away?.name || 'Unknown'} (${game.scheduled || 'Unknown'})`);
			});
		} else {
			console.log(`❌ Schedule endpoint failed: ${scheduleResponse.status} ${scheduleResponse.statusText}`);
		}
		
		// Test 3: Get today's games
		console.log('\n3️⃣ Testing Today\'s Games endpoint...');
		const today = new Date().toISOString().split('T')[0];
		const todayUrl = `${baseUrl}/games/${today}/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
		const todayResponse = await fetch(todayUrl);
		
		if (todayResponse.ok) {
			const todayData = await todayResponse.json();
			console.log('✅ Today\'s games endpoint successful');
			console.log(`   Found ${todayData.length || 'unknown'} games today`);
		} else {
			console.log(`❌ Today's games endpoint failed: ${todayResponse.status} ${todayResponse.statusText}`);
		}
		
		// Test 4: Test head-to-head functionality
		console.log('\n4️⃣ Testing Head-to-Head functionality...');
		try {
			// Get a fresh copy of schedule data for head-to-head testing
			const scheduleUrl2 = `${baseUrl}/games/${currentYear}/REG/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
			const scheduleResponse2 = await fetch(scheduleUrl2);
			
			if (scheduleResponse2.ok) {
				const scheduleData = await scheduleResponse2.json();
				if (scheduleData.length > 0) {
					const game = scheduleData[0];
					const team1Id = game.home.id;
					const team2Id = game.away.id;
					
					console.log(`   Testing head-to-head for: ${game.home.market} ${game.home.name} vs ${game.away.market} ${game.away.name}`);
					
					// Filter games between these two teams
					const headToHeadGames = scheduleData.filter(g => 
						(g.home.id === team1Id && g.away.id === team2Id) ||
						(g.home.id === team2Id && g.away.id === team1Id)
					);
					
					console.log(`   Found ${headToHeadGames.length} head-to-head games`);
					if (headToHeadGames.length > 0) {
						console.log(`   Most recent: ${headToHeadGames[0].scheduled}`);
						console.log(`   Game status: ${headToHeadGames[0].status}`);
						if (headToHeadGames[0].home_points && headToHeadGames[0].away_points) {
							console.log(`   Score: ${headToHeadGames[0].home_points} - ${headToHeadGames[0].away_points}`);
						}
					}
				}
			}
		} catch (error) {
			console.log(`❌ Head-to-head test failed: ${error.message}`);
		}
		
		console.log('\n🎉 SportsRadar API testing completed!');
		
	} catch (error) {
		console.error('❌ Error testing SportsRadar API:', error.message);
	}
}

// Run the test
testSportsRadarAPI();
