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

async function testSportsRadarHeadToHead() {
	const baseUrl = 'https://api.sportradar.com/wnba/trial/v8/en';
	
	try {
		console.log('🔍 Testing SportsRadar Head-to-Head Functionality...\n');
		
		// Test with Indiana Fever vs Chicago Sky (we know they have 5 games)
		const team1Id = 'f073a15f-0486-4179-b0a3-dfd0294eb595'; // Indiana Fever
		const team2Id = '3c409388-ab73-4c7f-953d-3a71062240f6'; // Chicago Sky
		
		console.log(`Testing: Indiana Fever (${team1Id}) vs Chicago Sky (${team2Id})\n`);
		
		// Get schedule for 2025
		const currentYear = new Date().getFullYear();
		const scheduleUrl = `${baseUrl}/games/${currentYear}/REG/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
		const response = await fetch(scheduleUrl);
		
		if (response.ok) {
			const data = await response.json();
			const games = data.games || [];
			
			console.log(`Found ${games.length} total games for ${currentYear}`);
			
			// Filter games where both teams played each other
			const headToHeadGames = games.filter(game => 
				(game.home.id === team1Id && game.away.id === team2Id) ||
				(game.home.id === team2Id && game.away.id === team1Id)
			);
			
			console.log(`Found ${headToHeadGames.length} head-to-head games between these teams\n`);
			
			if (headToHeadGames.length > 0) {
				console.log('Head-to-head games:');
				headToHeadGames.forEach((game, index) => {
					const homeTeam = `${game.home.market} ${game.home.name}`;
					const awayTeam = `${game.away.market} ${game.away.name}`;
					const date = new Date(game.scheduled).toLocaleDateString();
					
					console.log(`${index + 1}. ${date}: ${homeTeam} vs ${awayTeam}`);
					console.log(`   Game ID: ${game.id}`);
					console.log(`   Status: ${game.status}`);
					if (game.home_points && game.away_points) {
						console.log(`   Score: ${game.home_points} - ${game.away_points}`);
					}
					console.log('');
				});
				
				// Test the SportsRadar service method
				console.log('🧪 Testing SportsRadar service method...');
				
				// Simulate the service method
				const headToHeadGamesForMultipleSeasons = async (team1Id, team2Id, seasons = []) => {
					const currentSeason = new Date().getFullYear();
					const targetSeasons = seasons.length > 0 ? seasons : [currentSeason, currentSeason - 1, currentSeason - 2];
					
					const allGames = [];
					
					for (const season of targetSeasons) {
						try {
							const seasonUrl = `${baseUrl}/games/${season}/REG/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
							const seasonResponse = await fetch(seasonUrl);
							
							if (seasonResponse.ok) {
								const seasonData = await seasonResponse.json();
								const seasonGames = seasonData.games || [];
								
								// Filter games where both teams played each other
								const seasonHeadToHeadGames = seasonGames.filter(game => 
									(game.home.id === team1Id && game.away.id === team2Id) ||
									(game.home.id === team2Id && game.away.id === team1Id)
								);
								
								allGames.push(...seasonHeadToHeadGames);
								console.log(`   Season ${season}: Found ${seasonHeadToHeadGames.length} games`);
							}
						} catch (error) {
							console.log(`   Season ${season}: Error - ${error.message}`);
						}
					}
					
					// Sort by date (most recent first)
					return allGames.sort((a, b) => new Date(b.scheduled).getTime() - new Date(a.scheduled).getTime());
				};
				
				const result = await headToHeadGamesForMultipleSeasons(team1Id, team2Id, [2025, 2024, 2023]);
				console.log(`\n✅ Service method found ${result.length} total games across multiple seasons`);
				
			} else {
				console.log('❌ No head-to-head games found');
			}
			
		} else {
			console.log(`❌ Failed to get schedule: ${response.status} ${response.statusText}`);
		}
		
	} catch (error) {
		console.error('❌ Error:', error.message);
	}
}

// Run the test
testSportsRadarHeadToHead();
