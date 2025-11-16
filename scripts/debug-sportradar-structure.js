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

async function debugSportsRadarStructure() {
	const baseUrl = 'https://api.sportradar.com/wnba/trial/v8/en';
	
	try {
		console.log('🔍 Debugging SportsRadar Data Structure...\n');
		
		const teamsUrl = `${baseUrl}/league/hierarchy.json?api_key=${SPORTRADAR_API_KEY}`;
		const response = await fetch(teamsUrl);
		
		if (response.ok) {
			const data = await response.json();
			console.log('✅ Raw data structure:');
			console.log(JSON.stringify(data, null, 2));
		} else {
			console.log(`❌ Failed to get data: ${response.status} ${response.statusText}`);
		}
		
	} catch (error) {
		console.error('❌ Error:', error.message);
	}
}

// Run the function
debugSportsRadarStructure();
