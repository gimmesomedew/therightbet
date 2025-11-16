import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);

async function addGamesAppearedColumn() {
	console.log('🏈 Adding games_appeared column to nfl_player_touchdowns...\n');

	try {
		// Add games_appeared column if it doesn't exist
		await db`
			ALTER TABLE nfl_player_touchdowns
			ADD COLUMN IF NOT EXISTS games_appeared INTEGER DEFAULT 1
		`;
		console.log('✅ Added games_appeared column');

		// Set default value to 1 for existing records (they appeared in at least 1 game)
		await db`
			UPDATE nfl_player_touchdowns
			SET games_appeared = 1
			WHERE games_appeared IS NULL
		`;
		console.log('✅ Set default values for existing records');

		console.log('\n🎉 Column added successfully!');
	} catch (error) {
		console.error('❌ Failed to add column:', error);
		process.exit(1);
	}
}

addGamesAppearedColumn();


