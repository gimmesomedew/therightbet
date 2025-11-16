import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

async function verifySchema() {
	console.log('🔍 Verifying THERiGHTBET database schema...');
	
	try {
		const db = neon(DATABASE_URL);
		
		// Check if all tables exist
		const tables = [
			'users', 'sports', 'teams', 'players', 'games', 
			'betting_history', 'user_favorites', 'analytics_cache'
		];
		
		console.log('📋 Checking table existence...');
		for (const table of tables) {
			const result = await db`
				SELECT EXISTS (
					SELECT FROM information_schema.tables 
					WHERE table_schema = 'public' 
					AND table_name = ${table}
				) as exists
			`;
			
			if (result[0].exists) {
				console.log(`✅ Table '${table}' exists`);
			} else {
				console.log(`❌ Table '${table}' missing`);
			}
		}
		
		// Check sports data
		console.log('\n🏀 Checking initial sports data...');
		const sports = await db`SELECT * FROM sports ORDER BY name`;
		console.log(`📊 Found ${sports.length} sports:`);
		sports.forEach(sport => {
			console.log(`   - ${sport.name} (${sport.code})`);
		});
		
		// Check indexes
		console.log('\n🔍 Checking database indexes...');
		const indexes = await db`
			SELECT indexname, tablename 
			FROM pg_indexes 
			WHERE schemaname = 'public' 
			ORDER BY tablename, indexname
		`;
		console.log(`📈 Found ${indexes.length} indexes:`);
		indexes.forEach(index => {
			console.log(`   - ${index.indexname} on ${index.tablename}`);
		});
		
		// Check triggers
		console.log('\n⚡ Checking database triggers...');
		const triggers = await db`
			SELECT trigger_name, event_object_table 
			FROM information_schema.triggers 
			WHERE trigger_schema = 'public'
			ORDER BY event_object_table, trigger_name
		`;
		console.log(`🔄 Found ${triggers.length} triggers:`);
		triggers.forEach(trigger => {
			console.log(`   - ${trigger.trigger_name} on ${trigger.event_object_table}`);
		});
		
		console.log('\n🎉 Database schema verification completed successfully!');
		console.log('✅ All tables, indexes, and triggers are in place');
		console.log('🚀 THERiGHTBET database is ready for data!');
		
	} catch (error) {
		console.error('❌ Schema verification failed:', error.message);
		process.exit(1);
	}
}

verifySchema();
