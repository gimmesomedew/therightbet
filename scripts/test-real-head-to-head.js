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

async function testRealHeadToHead() {
	const baseUrl = 'https://api.sportradar.com/wnba/trial/v8/en';
	
	try {
		console.log('🔍 Testing Real Head-to-Head Data...\n');
		
		// Get schedule data
		const currentYear = new Date().getFullYear();
		const scheduleUrl = `${baseUrl}/games/${currentYear}/REG/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
		const response = await fetch(scheduleUrl);
		
		if (response.ok) {
			const data = await response.json();
			const games = data.games || [];
			
			console.log(`Found ${games.length} games for ${currentYear}\n`);
			
			// Find teams that have played multiple times
			const teamMatchups = new Map();
			
			games.forEach(game => {
				const team1Id = game.home.id;
				const team2Id = game.away.id;
				const key = [team1Id, team2Id].sort().join(' vs ');
				
				if (!teamMatchups.has(key)) {
					teamMatchups.set(key, {
						team1: game.home,
						team2: game.away,
						games: []
					});
				}
				
				teamMatchups.get(key).games.push(game);
			});
			
			// Find matchups with multiple games
			const multiGameMatchups = Array.from(teamMatchups.entries())
				.filter(([key, data]) => data.games.length > 1)
				.sort((a, b) => b[1].games.length - a[1].games.length);
			
			console.log(`Found ${multiGameMatchups.length} team matchups with multiple games:\n`);
			
			// Show top 5 matchups
			multiGameMatchups.slice(0, 5).forEach(([key, data], index) => {
				const team1Name = `${data.team1.market} ${data.team1.name}`;
				const team2Name = `${data.team2.market} ${data.team2.name}`;
				
				console.log(`${index + 1}. ${team1Name} vs ${team2Name}`);
				console.log(`   Games: ${data.games.length}`);
				console.log(`   Team 1 ID: ${data.team1.id}`);
				console.log(`   Team 2 ID: ${data.team2.id}`);
				
				// Show recent games
				console.log('   Recent games:');
				data.games.slice(0, 3).forEach(game => {
					const date = new Date(game.scheduled).toLocaleDateString();
					const homeTeam = `${game.home.market} ${game.home.name}`;
					const awayTeam = `${game.away.market} ${game.away.name}`;
					
					console.log(`     - ${date}: ${homeTeam} vs ${awayTeam}`);
					if (game.home_points && game.away_points) {
						console.log(`       Score: ${game.home_points} - ${game.away_points}`);
					} else {
						console.log(`       Status: ${game.status}`);
					}
				});
				console.log('');
			});
			
			// Test with the first matchup
			if (multiGameMatchups.length > 0) {
				const firstMatchup = multiGameMatchups[0];
				const team1Id = firstMatchup[1].team1.id;
				const team2Id = firstMatchup[1].team2.id;
				
				console.log(`🧪 Testing head-to-head API with:`);
				console.log(`   Team 1: ${firstMatchup[1].team1.id} (${firstMatchup[1].team1.market} ${firstMatchup[1].team1.name})`);
				console.log(`   Team 2: ${firstMatchup[1].team2.id} (${firstMatchup[1].team2.market} ${firstMatchup[1].team2.name})`);
				console.log(`   Expected games: ${firstMatchup[1].games.length}`);
			}
			
		} else {
			console.log(`❌ Failed to get schedule: ${response.status} ${response.statusText}`);
		}
		
	} catch (error) {
		console.error('❌ Error:', error.message);
	}
}

// Run the test
testRealHeadToHead();
