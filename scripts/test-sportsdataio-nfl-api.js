import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY;
const SPORTSDATAIO_BASE_URL = 'https://api.sportsdata.io/v3/nfl';

if (!SPORTSDATAIO_API_KEY) {
	console.error('❌ SPORTSDATAIO_API_KEY environment variable is required');
	process.exit(1);
}

async function makeRequest(endpoint, retryCount = 0) {
	const url = `${SPORTSDATAIO_BASE_URL}${endpoint}?key=${SPORTSDATAIO_API_KEY}`;
	
	if (retryCount > 0) {
		const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
		await new Promise(resolve => setTimeout(resolve, delay));
	} else {
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
	
	console.log(`\n📡 Testing: ${endpoint}`);
	console.log(`   URL: ${url.replace(SPORTSDATAIO_API_KEY, '***')}`);
	
	const response = await fetch(url);

	if (!response.ok) {
		const errorText = await response.text().catch(() => response.statusText);
		return {
			success: false,
			status: response.status,
			error: errorText,
			data: null
		};
	}

	const data = await response.json();
	return {
		success: true,
		status: response.status,
		error: null,
		data: data
	};
}

async function testEndpoints() {
	console.log('🧪 Testing SportsDataIO NFL API Endpoints\n');
	console.log('=' .repeat(60));
	
	const currentYear = new Date().getFullYear();
	const testWeek = 12; // Test with a common week
	
	const tests = [
		{
			name: 'Timeframes - Current',
			endpoint: '/scores/json/Timeframes/current',
			description: 'Get current NFL week from Timeframes'
		},
		{
			name: 'Timeframes - All',
			endpoint: '/scores/json/Timeframes',
			description: 'Get all timeframes'
		},
		{
			name: 'Teams',
			endpoint: '/scores/json/Teams',
			description: 'Get all NFL teams'
		},
		{
			name: 'Schedules - Format 1',
			endpoint: `/scores/json/Schedules/${currentYear}/${testWeek}`,
			description: `Get schedules for ${currentYear} Week ${testWeek}`
		},
		{
			name: 'Schedules - Format 2',
			endpoint: `/scores/json/SchedulesByWeek/${currentYear}/${testWeek}`,
			description: `Get schedules by week for ${currentYear} Week ${testWeek}`
		},
		{
			name: 'Schedules - Format 3',
			endpoint: `/scores/json/Schedules/${currentYear}/1/${testWeek}`,
			description: `Get schedules with season type for ${currentYear} Week ${testWeek}`
		},
		{
			name: 'TeamGameStats',
			endpoint: `/stats/json/TeamGameStats/${currentYear}/${testWeek}`,
			description: `Get team game stats for ${currentYear} Week ${testWeek}`
		},
		{
			name: 'TeamSeasonStats',
			endpoint: `/stats/json/TeamSeasonStats/${currentYear}`,
			description: `Get team season stats for ${currentYear}`
		},
		{
			name: 'Scores - By Week',
			endpoint: `/scores/json/Scores/${currentYear}/${testWeek}`,
			description: `Get scores for ${currentYear} Week ${testWeek}`
		},
		{
			name: 'Scores - By Date',
			endpoint: `/scores/json/ScoresByDate/${new Date().toISOString().split('T')[0]}`,
			description: 'Get scores for today'
		}
	];

	const results = {
		successful: [],
		failed: []
	};

	for (const test of tests) {
		try {
			const result = await makeRequest(test.endpoint);
			
			if (result.success) {
				console.log(`   ✅ SUCCESS (${result.status})`);
				
				// Analyze response
				if (Array.isArray(result.data)) {
					console.log(`   📊 Response: Array with ${result.data.length} items`);
					if (result.data.length > 0) {
						console.log(`   📋 Sample keys: ${Object.keys(result.data[0]).slice(0, 5).join(', ')}`);
					}
				} else if (result.data && typeof result.data === 'object') {
					console.log(`   📊 Response: Object`);
					console.log(`   📋 Keys: ${Object.keys(result.data).slice(0, 10).join(', ')}`);
					
					// Check for nested arrays
					for (const [key, value] of Object.entries(result.data)) {
						if (Array.isArray(value)) {
							console.log(`   📋 ${key}: Array with ${value.length} items`);
						}
					}
				} else {
					console.log(`   📊 Response: ${typeof result.data}`);
				}
				
				results.successful.push({
					name: test.name,
					endpoint: test.endpoint,
					status: result.status,
					dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
					dataLength: Array.isArray(result.data) ? result.data.length : null
				});
			} else {
				console.log(`   ❌ FAILED (${result.status})`);
				console.log(`   ⚠️  Error: ${result.error.substring(0, 200)}`);
				
				results.failed.push({
					name: test.name,
					endpoint: test.endpoint,
					status: result.status,
					error: result.error
				});
			}
		} catch (error) {
			console.log(`   ❌ ERROR: ${error.message}`);
			results.failed.push({
				name: test.name,
				endpoint: test.endpoint,
				status: 'EXCEPTION',
				error: error.message
			});
		}
		
		// Small delay between requests
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	// Summary
	console.log('\n' + '='.repeat(60));
	console.log('\n📊 TEST SUMMARY\n');
	
	console.log(`✅ Successful: ${results.successful.length}`);
	results.successful.forEach(r => {
		console.log(`   • ${r.name} (${r.status}) - ${r.dataType}${r.dataLength ? ` [${r.dataLength} items]` : ''}`);
	});
	
	console.log(`\n❌ Failed: ${results.failed.length}`);
	results.failed.forEach(r => {
		console.log(`   • ${r.name} (${r.status})`);
		if (r.error) {
			console.log(`     ${r.error.substring(0, 100)}`);
		}
	});

	// Recommendations
	console.log('\n💡 RECOMMENDATIONS\n');
	
	if (results.successful.some(r => r.name.includes('Timeframes'))) {
		console.log('✅ Use Timeframes endpoint for current week detection');
	}
	
	if (results.successful.some(r => r.name.includes('Schedules'))) {
		const scheduleEndpoint = results.successful.find(r => r.name.includes('Schedules'));
		console.log(`✅ Use ${scheduleEndpoint.endpoint} for schedules`);
	} else if (results.successful.some(r => r.name.includes('TeamGameStats'))) {
		console.log('⚠️  Schedules endpoint not available, use TeamGameStats as fallback');
	}
	
	if (results.successful.some(r => r.name.includes('Teams'))) {
		console.log('✅ Teams endpoint is working');
	}

	console.log('\n');
}

testEndpoints().catch(error => {
	console.error('\n❌ Test failed:', error);
	process.exit(1);
});

