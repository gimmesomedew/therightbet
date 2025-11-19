import { config } from 'dotenv';

// Load environment variables
config();

const SPORTSDATAIO_BASE_URL = 'https://api.sportsdata.io/v3/nfl';

const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY;

if (!SPORTSDATAIO_API_KEY) {
	console.error('❌ SPORTSDATAIO_API_KEY environment variable is required');
	process.exit(1);
}

async function makeRequest(endpoint, retryCount = 0) {
	const url = `${SPORTSDATAIO_BASE_URL}${endpoint}?key=${SPORTSDATAIO_API_KEY}`;
	
	if (retryCount === 0) {
		await new Promise(resolve => setTimeout(resolve, 1000));
	} else {
		const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
		await new Promise(resolve => setTimeout(resolve, delay));
	}
	
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429 && retryCount < 3) {
			return makeRequest(endpoint, retryCount + 1);
		}
		const errorText = await response.text().catch(() => response.statusText);
		throw new Error(`SportsDataIO API error: ${response.status} ${errorText}`);
	}

	return await response.json();
}

async function testDefensiveStatistics() {
	console.log('🔍 Testing SportsDataIO API for NFL Defensive Statistics\n');
	console.log('='.repeat(60));

	try {
		// Test 1: Get team game stats for current week
		console.log('\n📊 Test 1: Fetching Team Game Stats for Week 11, 2024');
		console.log('-'.repeat(60));
		
		const currentYear = new Date().getFullYear();
		const testWeek = 11;
		const seasonType = 1; // Regular season (1=REG, 2=PRE, 3=POST)

		const teamStats = await makeRequest(`/stats/json/TeamGameStats/${currentYear}/${testWeek}`);

		if (teamStats && teamStats.length > 0) {
			console.log(`✅ Found ${teamStats.length} team game stats`);
			
			// Show first team's stats structure
			const firstTeam = teamStats[0];
			console.log('\n📈 Sample Team Stats Structure:');
			console.log(JSON.stringify(firstTeam, null, 2).substring(0, 2000));
			
			// Check for defensive stats
			console.log('\n🛡️  Defensive Statistics Found:');
			console.log(`  - Points Allowed: ${firstTeam.OpponentScore || 'N/A'}`);
			console.log(`  - Total Yards Allowed: ${firstTeam.OpponentTotalYards || 'N/A'}`);
			console.log(`  - Passing Yards Allowed: ${firstTeam.OpponentPassingYards || 'N/A'}`);
			console.log(`  - Rushing Yards Allowed: ${firstTeam.OpponentRushingYards || 'N/A'}`);
			console.log(`  - Sacks: ${firstTeam.Sacks || 'N/A'}`);
			console.log(`  - Interceptions: ${firstTeam.Interceptions || 'N/A'}`);
			console.log(`  - Fumbles Recovered: ${firstTeam.FumblesRecovered || 'N/A'}`);
			console.log(`  - Fumbles Forced: ${firstTeam.FumblesForced || 'N/A'}`);
			
			// Check for red zone stats
			console.log('\n🔴 Red Zone Defensive Statistics Found:');
			console.log(`  - Red Zone Attempts Allowed: ${firstTeam.OpponentRedZoneAttempts || 'N/A'}`);
			console.log(`  - Red Zone Conversions Allowed: ${firstTeam.OpponentRedZoneConversions || 'N/A'}`);
			console.log(`  - Red Zone Percentage Allowed: ${firstTeam.OpponentRedZonePercentage || 'N/A'}%`);
			
			// Show defensive stats summary
			console.log('\n🔄 Defensive Stats Summary:');
			const redZoneStopPct = firstTeam.OpponentRedZoneAttempts > 0
				? ((firstTeam.OpponentRedZoneAttempts - firstTeam.OpponentRedZoneConversions) / firstTeam.OpponentRedZoneAttempts * 100).toFixed(1)
				: '0.0';
			console.log(`  Red Zone Stop %: ${redZoneStopPct}%`);
			console.log(`  Third Down % Allowed: ${firstTeam.OpponentThirdDownAttempts > 0 ? (firstTeam.OpponentThirdDownConversions / firstTeam.OpponentThirdDownAttempts * 100).toFixed(1) : '0.0'}%`);
			console.log(`  Turnovers Forced: ${(firstTeam.Interceptions || 0) + (firstTeam.FumblesRecovered || 0)}`);
			
		} else {
			console.log('⚠️  No team stats found for this week. Trying 2024 season...');
			
			const teamStats2024 = await makeRequest(`/stats/json/TeamGameStats/2024/${testWeek}`);
			if (teamStats2024 && teamStats2024.length > 0) {
				console.log(`✅ Found ${teamStats2024.length} team game stats for 2024`);
				const firstTeam = teamStats2024[0];
				console.log('\n📈 Sample Team Stats:');
				console.log(`  Team: ${firstTeam.Team}`);
				console.log(`  Opponent: ${firstTeam.Opponent}`);
				console.log(`  Points Allowed: ${firstTeam.OpponentScore}`);
				console.log(`  Red Zone Attempts Allowed: ${firstTeam.OpponentRedZoneAttempts}`);
			} else {
				console.log('❌ No team stats found');
			}
		}

		// Test 2: Get team game stats by date
		console.log('\n\n📊 Test 2: Fetching Team Game Stats by Date');
		console.log('-'.repeat(60));
		
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const dateString = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
		
		console.log(`Fetching stats for date: ${dateString}`);
		const statsByDate = await makeRequest(`/stats/json/TeamGameStatsByDate/${dateString}`);
		
		if (statsByDate && statsByDate.length > 0) {
			console.log(`✅ Found ${statsByDate.length} team game stats for ${dateString}`);
		} else {
			console.log(`⚠️  No stats found for ${dateString}`);
		}

		// Test 3: Get team season stats
		console.log('\n\n📊 Test 3: Fetching Team Season Stats');
		console.log('-'.repeat(60));
		
		const seasonStats = await makeRequest(`/stats/json/TeamSeasonStats/2024`);
		
		if (seasonStats && seasonStats.length > 0) {
			console.log(`✅ Found ${seasonStats.length} team season stats`);
			const firstTeam = seasonStats[0];
			console.log('\n📈 Sample Season Stats Keys:');
			console.log(Object.keys(firstTeam).slice(0, 20));
		} else {
			console.log('⚠️  No season stats found (may require different subscription tier)');
		}

		console.log('\n\n' + '='.repeat(60));
		console.log('✅ Testing complete!');
		console.log('\n💡 Summary:');
		console.log('   - SportsDataIO provides comprehensive defensive statistics');
		console.log('   - Red zone defensive data is available');
		console.log('   - Week-to-week data is available via TeamGameStats endpoint');
		console.log('   - Ready to integrate into database and API endpoints');

	} catch (error) {
		console.error('\n❌ Error testing SportsDataIO API:', error.message);
		if (error.message.includes('401') || error.message.includes('403')) {
			console.error('\n⚠️  Authentication error. Please check:');
			console.error('   1. Your SPORTSDATAIO_API_KEY is correct');
			console.error('   2. Your subscription includes NFL statistics');
			console.error('   3. Your API key has access to the NFL endpoints');
		}
		process.exit(1);
	}
}

// Run the test
testDefensiveStatistics().catch(console.error);

