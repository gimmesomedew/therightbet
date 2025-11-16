import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);

async function createFirstTdPredictionsTable() {
	console.log('🏈 Creating first touchdown scorer predictions table...\n');

	try {
		// Create nfl_first_touchdown_predictions table
		await db`
			CREATE TABLE IF NOT EXISTS nfl_first_touchdown_predictions (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				season INTEGER NOT NULL,
				season_type VARCHAR(10) NOT NULL,
				week INTEGER NOT NULL,
				team_abbreviation VARCHAR(10) NOT NULL,
				player_id VARCHAR(100) NOT NULL,
				player_name VARCHAR(200) NOT NULL,
				position VARCHAR(10),
				prediction_score DECIMAL(10, 4) NOT NULL,
				probability_percentage DECIMAL(5, 2) NOT NULL,
				first_td_frequency DECIMAL(5, 2),
				td_probability DECIMAL(5, 2),
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				UNIQUE(season, season_type, week, team_abbreviation, player_id)
			)
		`;
		console.log('✅ Created nfl_first_touchdown_predictions table');

		// Create indexes
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_first_td_pred_week ON nfl_first_touchdown_predictions(season, season_type, week)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_first_td_pred_team ON nfl_first_touchdown_predictions(team_abbreviation)`;
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
		await db`DROP TRIGGER IF EXISTS update_nfl_first_td_pred_updated_at ON nfl_first_touchdown_predictions`;
		await db`CREATE TRIGGER update_nfl_first_td_pred_updated_at BEFORE UPDATE ON nfl_first_touchdown_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
		console.log('✅ Created trigger');

		console.log('\n🎉 First touchdown predictions table created successfully!');
	} catch (error) {
		console.error('❌ Failed to create table:', error);
		process.exit(1);
	}
}

createFirstTdPredictionsTable();


