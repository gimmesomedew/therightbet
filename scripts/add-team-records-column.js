import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

async function addTeamRecordsColumns() {
	console.log('🔧 Adding wins/losses columns to teams table...\n');
	
	try {
		const db = neon(DATABASE_URL);
		
		// Check if columns already exist
		const [winsExists] = await db`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_name = 'teams' 
			AND column_name = 'wins'
		`;
		
		if (winsExists) {
			console.log('✅ Wins/losses columns already exist');
			return;
		}
		
		// Add wins and losses columns
		await db`
			ALTER TABLE teams 
			ADD COLUMN wins INTEGER DEFAULT 0,
			ADD COLUMN losses INTEGER DEFAULT 0
		`;
		
		console.log('✅ Wins/losses columns added successfully');
		
	} catch (error) {
		console.error('❌ Failed to add columns:', error.message);
		process.exit(1);
	}
}

addTeamRecordsColumns();

