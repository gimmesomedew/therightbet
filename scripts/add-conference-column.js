import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

async function addConferenceColumn() {
	console.log('🔧 Adding conference column to teams table...\n');
	
	try {
		const db = neon(DATABASE_URL);
		
		// Check if column already exists
		const [columnExists] = await db`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_name = 'teams' 
			AND column_name = 'conference'
		`;
		
		if (columnExists) {
			console.log('✅ Conference column already exists');
			return;
		}
		
		// Add conference column
		await db`
			ALTER TABLE teams 
			ADD COLUMN conference VARCHAR(50)
		`;
		
		console.log('✅ Conference column added successfully');
		
		// Create index for faster filtering
		await db`
			CREATE INDEX IF NOT EXISTS idx_teams_conference 
			ON teams(conference) 
			WHERE conference IS NOT NULL
		`;
		
		console.log('✅ Conference index created');
		
	} catch (error) {
		console.error('❌ Failed to add conference column:', error.message);
		process.exit(1);
	}
}

addConferenceColumn();

