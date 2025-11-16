import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);

async function createFirstTouchdownTable() {
	console.log('🏈 Creating first touchdown scorers table...\n');

	try {
		// Create nfl_first_touchdown_scorers table
		await db`
			CREATE TABLE IF NOT EXISTS nfl_first_touchdown_scorers (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				week_id UUID REFERENCES nfl_weeks(id) ON DELETE CASCADE,
				season INTEGER NOT NULL,
				season_type VARCHAR(10) NOT NULL,
				week INTEGER NOT NULL,
				game_id VARCHAR(100) NOT NULL,
				team_abbreviation VARCHAR(10) NOT NULL,
				player_id VARCHAR(100) NOT NULL,
				player_name VARCHAR(200) NOT NULL,
				position VARCHAR(10),
				touchdown_type VARCHAR(20) NOT NULL, -- rushing, receiving, passing, return, defensive
				quarter INTEGER NOT NULL,
				clock VARCHAR(10) NOT NULL, -- e.g., "3:06"
				score_at_td VARCHAR(20), -- e.g., "DEN 0 - LV 6"
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				UNIQUE(season, season_type, week, game_id, team_abbreviation)
			)
		`;
		console.log('✅ Created nfl_first_touchdown_scorers table');

		// Create indexes
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_first_td_week ON nfl_first_touchdown_scorers(week_id)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_first_td_season_week ON nfl_first_touchdown_scorers(season, season_type, week)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_first_td_team ON nfl_first_touchdown_scorers(team_abbreviation)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_first_td_player ON nfl_first_touchdown_scorers(player_id)`;
		console.log('✅ Created indexes');

		// Create trigger function if it doesn't exist
		await db`
			CREATE OR REPLACE FUNCTION update_updated_at_column()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = NOW();
				RETURN NEW;
			END;
			$$ language 'plpgsql'
		`;

		// Create trigger
		await db`DROP TRIGGER IF EXISTS update_nfl_first_td_updated_at ON nfl_first_touchdown_scorers`;
		await db`CREATE TRIGGER update_nfl_first_td_updated_at BEFORE UPDATE ON nfl_first_touchdown_scorers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
		console.log('✅ Created trigger');

		console.log('\n🎉 First touchdown scorers table created successfully!');
	} catch (error) {
		console.error('❌ Failed to create table:', error);
		process.exit(1);
	}
}

createFirstTouchdownTable();


