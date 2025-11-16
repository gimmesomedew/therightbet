import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	console.log('Please set your DATABASE_URL in the .env file');
	process.exit(1);
}

async function testDatabaseConnection() {
	console.log('🔌 Testing Neon database connection...');
	
	try {
		// Create database connection
		const db = neon(DATABASE_URL);
		
		// Test basic connection
		console.log('📡 Testing basic connection...');
		const result = await db`SELECT 1 as test, NOW() as current_time`;
		
		if (result && result.length > 0) {
			console.log('✅ Database connection successful!');
			console.log(`📅 Current database time: ${result[0].current_time}`);
			console.log(`🔢 Test query result: ${result[0].test}`);
		} else {
			console.log('❌ Database connection failed - no results returned');
			return false;
		}
		
		// Test if we can create a simple table
		console.log('🏗️  Testing table creation...');
		await db`
			CREATE TABLE IF NOT EXISTS connection_test (
				id SERIAL PRIMARY KEY,
				test_message TEXT,
				created_at TIMESTAMP DEFAULT NOW()
			)
		`;
		console.log('✅ Table creation test passed');
		
		// Test insert
		console.log('📝 Testing data insertion...');
		const insertResult = await db`
			INSERT INTO connection_test (test_message) 
			VALUES ('Connection test successful') 
			RETURNING id, test_message, created_at
		`;
		console.log('✅ Data insertion test passed');
		console.log(`📊 Inserted record ID: ${insertResult[0].id}`);
		
		// Test select
		console.log('🔍 Testing data retrieval...');
		const selectResult = await db`
			SELECT * FROM connection_test 
			ORDER BY created_at DESC 
			LIMIT 1
		`;
		console.log('✅ Data retrieval test passed');
		console.log(`📋 Retrieved: ${selectResult[0].test_message}`);
		
		// Clean up test table
		console.log('🧹 Cleaning up test table...');
		await db`DROP TABLE IF EXISTS connection_test`;
		console.log('✅ Cleanup completed');
		
		console.log('\n🎉 All database tests passed! Your Neon connection is working perfectly.');
		return true;
		
	} catch (error) {
		console.error('❌ Database connection failed:');
		console.error(error.message);
		
		if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
			console.log('\n💡 Troubleshooting tips:');
			console.log('1. Check if your DATABASE_URL is correct');
			console.log('2. Verify your Neon project is active');
			console.log('3. Check your internet connection');
		}
		
		return false;
	}
}

// Run the test
testDatabaseConnection()
	.then(success => {
		process.exit(success ? 0 : 1);
	})
	.catch(error => {
		console.error('❌ Unexpected error:', error);
		process.exit(1);
	});
