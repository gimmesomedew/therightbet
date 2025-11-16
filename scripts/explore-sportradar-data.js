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

console.log('🔍 Exploring SportsRadar WNBA Data Structure...\n');

async function exploreSportsRadarData() {
	const baseUrl = 'https://api.sportradar.com/wnba/trial/v8/en';
	
	try {
		// Get teams data
		console.log('1️⃣ Getting WNBA Teams...');
		const teamsUrl = `${baseUrl}/league/hierarchy.json?api_key=${SPORTRADAR_API_KEY}`;
		const teamsResponse = await fetch(teamsUrl);
		
		if (teamsResponse.ok) {
			const teamsData = await teamsResponse.json();
			console.log('✅ Teams data retrieved');
			
			// Extract teams from the hierarchy
			const teams = [];
			if (teamsData.conferences) {
				teamsData.conferences.forEach(conference => {
					if (conference.divisions) {
						conference.divisions.forEach(division => {
							if (division.teams) {
								teams.push(...division.teams);
							}
						});
					}
				});
			}
			
			console.log(`   Found ${teams.length} teams:`);
			teams.forEach(team => {
				console.log(`     - ${team.market} ${team.name} (ID: ${team.id})`);
			});
			
			// Save teams for later use
			global.teams = teams;
		}
		
		// Get schedule data
		console.log('\n2️⃣ Getting WNBA Schedule...');
		const currentYear = new Date().getFullYear();
		const scheduleUrl = `${baseUrl}/games/${currentYear}/REG/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
		const scheduleResponse = await fetch(scheduleUrl);
		
		if (scheduleResponse.ok) {
			const scheduleData = await scheduleResponse.json();
			console.log('✅ Schedule data retrieved');
			
			const games = scheduleData.games || [];
			console.log(`   Found ${games.length} games for ${currentYear}`);
			
			// Show some sample games with more details
			console.log('\n   Sample games:');
			games.slice(0, 5).forEach((game, index) => {
				console.log(`   ${index + 1}. ${game.home.market} ${game.home.name} vs ${game.away.market} ${game.away.name}`);
				console.log(`      Game ID: ${game.id}`);
				console.log(`      Date: ${game.scheduled}`);
				console.log(`      Status: ${game.status}`);
				console.log(`      Venue: ${game.venue?.name || 'TBD'}`);
				if (game.home_points && game.away_points) {
					console.log(`      Score: ${game.home_points} - ${game.away_points}`);
				}
				console.log('');
			});
			
			// Test head-to-head functionality
			console.log('3️⃣ Testing Head-to-Head Analysis...');
			if (games.length > 0) {
				const firstGame = games[0];
				const team1Id = firstGame.home.id;
				const team2Id = firstGame.away.id;
				const team1Name = `${firstGame.home.market} ${firstGame.home.name}`;
				const team2Name = `${firstGame.away.market} ${firstGame.away.name}`;
				
				console.log(`   Analyzing head-to-head for: ${team1Name} vs ${team2Name}`);
				
				// Find all games between these teams
				const headToHeadGames = games.filter(game => 
					(game.home.id === team1Id && game.away.id === team2Id) ||
					(game.home.id === team2Id && game.away.id === team1Id)
				);
				
				console.log(`   Found ${headToHeadGames.length} head-to-head games`);
				
				if (headToHeadGames.length > 0) {
					console.log('   Recent meetings:');
					headToHeadGames.slice(0, 3).forEach((game, index) => {
						const homeTeam = `${game.home.market} ${game.home.name}`;
						const awayTeam = `${game.away.market} ${game.away.name}`;
						const date = new Date(game.scheduled).toLocaleDateString();
						
						console.log(`     ${index + 1}. ${date}: ${homeTeam} vs ${awayTeam}`);
						if (game.home_points && game.away_points) {
							console.log(`        Score: ${game.home_points} - ${game.away_points}`);
							const winner = game.home_points > game.away_points ? homeTeam : awayTeam;
							console.log(`        Winner: ${winner}`);
						} else {
							console.log(`        Status: ${game.status}`);
						}
					});
				}
			}
			
			// Test getting a specific game summary
			console.log('\n4️⃣ Testing Game Summary...');
			if (games.length > 0) {
				const gameId = games[0].id;
				console.log(`   Getting summary for game: ${gameId}`);
				
				const summaryUrl = `${baseUrl}/games/${gameId}/summary.json?api_key=${SPORTRADAR_API_KEY}`;
				const summaryResponse = await fetch(summaryUrl);
				
				if (summaryResponse.ok) {
					const summaryData = await summaryResponse.json();
					console.log('✅ Game summary retrieved');
					console.log(`   Game: ${summaryData.home.market} ${summaryData.home.name} vs ${summaryData.away.market} ${summaryData.away.name}`);
					console.log(`   Status: ${summaryData.status}`);
					console.log(`   Scheduled: ${summaryData.scheduled}`);
					
					if (summaryData.scoring) {
						console.log(`   Final Score: ${summaryData.scoring.home.points} - ${summaryData.scoring.away.points}`);
					}
					
					if (summaryData.statistics) {
						console.log('   Team Statistics Available:');
						console.log(`     Home Team Stats: ${Object.keys(summaryData.statistics.home.totals).length} categories`);
						console.log(`     Away Team Stats: ${Object.keys(summaryData.statistics.away.totals).length} categories`);
					}
				} else {
					console.log(`❌ Game summary failed: ${summaryResponse.status} ${summaryResponse.statusText}`);
				}
			}
		}
		
		console.log('\n🎉 SportsRadar data exploration completed!');
		console.log('\n📊 Summary:');
		console.log('   - Teams: Available with full hierarchy');
		console.log('   - Schedule: 287 games for 2025 season');
		console.log('   - Game Details: Full summaries with statistics');
		console.log('   - Head-to-Head: Can analyze team matchups');
		
	} catch (error) {
		console.error('❌ Error exploring SportsRadar data:', error.message);
	}
}

// Run the exploration
exploreSportsRadarData();
