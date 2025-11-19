import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);

async function createDefensiveStatsTable() {
	console.log('🛡️  Creating NFL defensive statistics table...\n');

	try {
		// Create nfl_defensive_stats table
		await db`
			CREATE TABLE IF NOT EXISTS nfl_defensive_stats (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				season INTEGER NOT NULL,
				season_type INTEGER NOT NULL, -- 1=REG, 2=PRE, 3=POST
				week INTEGER NOT NULL,
				game_key VARCHAR(50),
				game_date TIMESTAMP WITH TIME ZONE,
				team_abbreviation VARCHAR(10) NOT NULL,
				team_name VARCHAR(100),
				opponent_abbreviation VARCHAR(10) NOT NULL,
				opponent_name VARCHAR(100),
				home_or_away VARCHAR(10), -- HOME, AWAY
				
				-- General Defensive Stats
				points_allowed INTEGER DEFAULT 0,
				total_yards_allowed INTEGER DEFAULT 0,
				passing_yards_allowed INTEGER DEFAULT 0,
				rushing_yards_allowed INTEGER DEFAULT 0,
				first_downs_allowed INTEGER DEFAULT 0,
				third_down_conversions_allowed INTEGER DEFAULT 0,
				third_down_attempts_allowed INTEGER DEFAULT 0,
				third_down_percentage_allowed DECIMAL(5,2),
				fourth_down_conversions_allowed INTEGER DEFAULT 0,
				fourth_down_attempts_allowed INTEGER DEFAULT 0,
				time_of_possession_allowed VARCHAR(10), -- MM:SS format
				
				-- Defensive Plays
				sacks INTEGER DEFAULT 0,
				interceptions INTEGER DEFAULT 0,
				fumbles_forced INTEGER DEFAULT 0,
				fumbles_recovered INTEGER DEFAULT 0,
				turnovers_forced INTEGER DEFAULT 0,
				defensive_touchdowns INTEGER DEFAULT 0,
				safeties INTEGER DEFAULT 0,
				quarterback_hits INTEGER DEFAULT 0,
				tackles_for_loss INTEGER DEFAULT 0,
				
				-- Red Zone Defense
				red_zone_attempts_allowed INTEGER DEFAULT 0,
				red_zone_conversions_allowed INTEGER DEFAULT 0,
				red_zone_touchdowns_allowed INTEGER DEFAULT 0,
				red_zone_field_goals_allowed INTEGER DEFAULT 0,
				red_zone_stop_percentage DECIMAL(5,2),
				red_zone_scoring_percentage_allowed DECIMAL(5,2),
				goal_to_go_attempts_allowed INTEGER DEFAULT 0,
				goal_to_go_conversions_allowed INTEGER DEFAULT 0,
				
				-- Penalties Against Opponent
				opponent_penalties INTEGER DEFAULT 0,
				opponent_penalty_yards INTEGER DEFAULT 0,
				
				-- Scoring Breakdown
				opponent_score_q1 INTEGER DEFAULT 0,
				opponent_score_q2 INTEGER DEFAULT 0,
				opponent_score_q3 INTEGER DEFAULT 0,
				opponent_score_q4 INTEGER DEFAULT 0,
				
				-- Metadata
				source VARCHAR(50) DEFAULT 'sportsdataio',
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				
				UNIQUE(season, season_type, week, team_abbreviation, game_key)
			)
		`;
		console.log('✅ Created nfl_defensive_stats table');

		// Create indexes
		await db`
			CREATE INDEX IF NOT EXISTS idx_nfl_defensive_stats_season_week 
			ON nfl_defensive_stats(season, season_type, week)
		`;
		console.log('✅ Created index on season, season_type, week');

		await db`
			CREATE INDEX IF NOT EXISTS idx_nfl_defensive_stats_team 
			ON nfl_defensive_stats(team_abbreviation)
		`;
		console.log('✅ Created index on team_abbreviation');

		await db`
			CREATE INDEX IF NOT EXISTS idx_nfl_defensive_stats_game_date 
			ON nfl_defensive_stats(game_date)
		`;
		console.log('✅ Created index on game_date');

		await db`
			CREATE INDEX IF NOT EXISTS idx_nfl_defensive_stats_game_key 
			ON nfl_defensive_stats(game_key)
		`;
		console.log('✅ Created index on game_key');

		console.log('\n✅ NFL defensive statistics table created successfully!');

	} catch (error) {
		console.error('❌ Error creating defensive stats table:', error);
		process.exit(1);
	}
}

createDefensiveStatsTable();

