import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);

async function createNflTables() {
	console.log('🏈 Creating NFL touchdown tables...\n');

	try {
		// Create nfl_weeks table
		await db`
			CREATE TABLE IF NOT EXISTS nfl_weeks (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				season INTEGER NOT NULL,
				season_type VARCHAR(10) NOT NULL,
				week INTEGER NOT NULL,
				has_data BOOLEAN DEFAULT false,
				synced_at TIMESTAMP WITH TIME ZONE,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				UNIQUE(season, season_type, week)
			)
		`;
		console.log('✅ Created nfl_weeks table');

		// Create nfl_team_touchdowns table
		await db`
			CREATE TABLE IF NOT EXISTS nfl_team_touchdowns (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				week_id UUID REFERENCES nfl_weeks(id) ON DELETE CASCADE,
				season INTEGER NOT NULL,
				season_type VARCHAR(10) NOT NULL,
				week INTEGER NOT NULL,
				team_abbreviation VARCHAR(10) NOT NULL,
				team_display_name VARCHAR(100) NOT NULL,
				team_location VARCHAR(100),
				team_mascot VARCHAR(100),
				total_touchdowns INTEGER DEFAULT 0,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				UNIQUE(season, season_type, week, team_abbreviation)
			)
		`;
		console.log('✅ Created nfl_team_touchdowns table');

		// Create nfl_player_touchdowns table
		await db`
			CREATE TABLE IF NOT EXISTS nfl_player_touchdowns (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				team_touchdown_id UUID REFERENCES nfl_team_touchdowns(id) ON DELETE CASCADE,
				week_id UUID REFERENCES nfl_weeks(id) ON DELETE CASCADE,
				season INTEGER NOT NULL,
				season_type VARCHAR(10) NOT NULL,
				week INTEGER NOT NULL,
				team_abbreviation VARCHAR(10) NOT NULL,
				player_id VARCHAR(100) NOT NULL,
				player_name VARCHAR(200) NOT NULL,
				position VARCHAR(10),
				rushing_touchdowns INTEGER DEFAULT 0,
				receiving_touchdowns INTEGER DEFAULT 0,
				passing_touchdowns INTEGER DEFAULT 0,
				return_touchdowns INTEGER DEFAULT 0,
				defensive_touchdowns INTEGER DEFAULT 0,
				total_touchdowns INTEGER DEFAULT 0,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				UNIQUE(season, season_type, week, team_abbreviation, player_id)
			)
		`;
		console.log('✅ Created nfl_player_touchdowns table');

		// Create indexes
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_weeks_season_type_week ON nfl_weeks(season, season_type, week)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_team_touchdowns_week ON nfl_team_touchdowns(week_id)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_team_touchdowns_season_week ON nfl_team_touchdowns(season, season_type, week)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_player_touchdowns_team ON nfl_player_touchdowns(team_touchdown_id)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_player_touchdowns_week ON nfl_player_touchdowns(week_id)`;
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_player_touchdowns_season_week ON nfl_player_touchdowns(season, season_type, week)`;
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

		// Create triggers
		await db`DROP TRIGGER IF EXISTS update_nfl_weeks_updated_at ON nfl_weeks`;
		await db`CREATE TRIGGER update_nfl_weeks_updated_at BEFORE UPDATE ON nfl_weeks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
		
		await db`DROP TRIGGER IF EXISTS update_nfl_team_touchdowns_updated_at ON nfl_team_touchdowns`;
		await db`CREATE TRIGGER update_nfl_team_touchdowns_updated_at BEFORE UPDATE ON nfl_team_touchdowns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
		
		await db`DROP TRIGGER IF EXISTS update_nfl_player_touchdowns_updated_at ON nfl_player_touchdowns`;
		await db`CREATE TRIGGER update_nfl_player_touchdowns_updated_at BEFORE UPDATE ON nfl_player_touchdowns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
		console.log('✅ Created triggers');

		console.log('\n🎉 NFL tables created successfully!');
	} catch (error) {
		console.error('❌ Failed to create tables:', error);
		process.exit(1);
	}
}

createNflTables();

