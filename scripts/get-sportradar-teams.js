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

async function getSportsRadarTeams() {
	const baseUrl = 'https://api.sportradar.com/wnba/trial/v8/en';
	
	try {
		console.log('🔍 Getting WNBA Teams from SportsRadar...\n');
		
		const teamsUrl = `${baseUrl}/league/hierarchy.json?api_key=${SPORTRADAR_API_KEY}`;
		const response = await fetch(teamsUrl);
		
		if (response.ok) {
			const data = await response.json();
			console.log('✅ Teams data retrieved successfully\n');
			
			// Extract teams from the hierarchy
			const teams = [];
			if (data.conferences) {
				data.conferences.forEach(conference => {
					if (conference.teams) {
						teams.push(...conference.teams);
					}
				});
			}
			
			console.log(`Found ${teams.length} WNBA teams:\n`);
			
			// Display teams in a nice format
			teams.forEach((team, index) => {
				console.log(`${index + 1}. ${team.market || 'Unknown'} ${team.name}`);
				console.log(`   ID: ${team.id}`);
				console.log(`   Alias: ${team.alias}`);
				console.log(`   Conference: ${team.conference || 'Unknown'}`);
				console.log(`   Division: ${team.division || 'Unknown'}`);
				if (team.venue) {
					console.log(`   Venue: ${team.venue.name} (${team.venue.city}, ${team.venue.state})`);
				}
				console.log('');
			});
			
			// Create a mapping object for easy reference
			console.log('📋 Team ID Mapping for your database:');
			console.log('const teamMappings = {');
			teams.forEach(team => {
				const teamName = team.market ? `${team.market} ${team.name}` : team.name;
				console.log(`  '${team.id}': '${teamName}',`);
			});
			console.log('};');
			
			// Also create reverse mapping
			console.log('\n📋 Reverse Mapping (Name to ID):');
			console.log('const nameToIdMappings = {');
			teams.forEach(team => {
				const teamName = team.market ? `${team.market} ${team.name}` : team.name;
				console.log(`  '${teamName}': '${team.id}',`);
			});
			console.log('};');
			
		} else {
			console.log(`❌ Failed to get teams: ${response.status} ${response.statusText}`);
		}
		
	} catch (error) {
		console.error('❌ Error getting teams:', error.message);
	}
}

// Run the function
getSportsRadarTeams();
