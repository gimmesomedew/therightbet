import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);

async function createNflReceivingYardsTable() {
	console.log('📊 Creating NFL receiving yards table...\n');

	try {
		// Create the receiving yards table
		await db`
			CREATE TABLE IF NOT EXISTS nfl_player_receiving_yards (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				week_id UUID REFERENCES nfl_weeks(id) ON DELETE CASCADE,
				season INTEGER NOT NULL,
				season_type VARCHAR(10) NOT NULL,
				week INTEGER NOT NULL,
				team_abbreviation VARCHAR(10) NOT NULL,
				player_id VARCHAR(100) NOT NULL,
				player_name VARCHAR(200) NOT NULL,
				position VARCHAR(10),
				receptions INTEGER DEFAULT 0,
				receiving_yards INTEGER DEFAULT 0,
				receiving_touchdowns INTEGER DEFAULT 0,
				targets INTEGER DEFAULT 0,
				longest_reception INTEGER DEFAULT 0,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				UNIQUE(season, season_type, week, team_abbreviation, player_id)
			)
		`;
		console.log('✅ Created nfl_player_receiving_yards table');

		// Create indexes
		await db`CREATE INDEX IF NOT EXISTS idx_nfl_receiving_yards_week ON nfl_player_receiving_yards(week_id);`;
		console.log('✅ Created index on week_id');

		await db`CREATE INDEX IF NOT EXISTS idx_nfl_receiving_yards_season_week ON nfl_player_receiving_yards(season, season_type, week);`;
		console.log('✅ Created index on season, season_type, week');

		await db`CREATE INDEX IF NOT EXISTS idx_nfl_receiving_yards_team ON nfl_player_receiving_yards(team_abbreviation);`;
		console.log('✅ Created index on team_abbreviation');

		await db`CREATE INDEX IF NOT EXISTS idx_nfl_receiving_yards_player ON nfl_player_receiving_yards(player_id);`;
		console.log('✅ Created index on player_id');

		await db`CREATE INDEX IF NOT EXISTS idx_nfl_receiving_yards_position ON nfl_player_receiving_yards(position);`;
		console.log('✅ Created index on position');

		// Create trigger for updated_at
		await db`
			CREATE TRIGGER update_nfl_receiving_yards_updated_at 
			BEFORE UPDATE ON nfl_player_receiving_yards 
			FOR EACH ROW 
			EXECUTE FUNCTION update_updated_at_column()
		`;
		console.log('✅ Created updated_at trigger');

		console.log('\n✅ NFL receiving yards table created successfully!');
	} catch (error) {
		console.error('❌ Error creating NFL receiving yards table:', error);
		process.exit(1);
	} finally {
		process.exit(0);
	}
}

createNflReceivingYardsTable();

