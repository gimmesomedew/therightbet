import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

async function calculateNCAAARecords() {
	console.log('📊 Calculating NCAA Football team records...\n');
	
	try {
		const db = neon(DATABASE_URL);
		
		// Get NCAAFB sport
		const [sport] = await db`
			SELECT id FROM sports WHERE code = 'NCAAFB' LIMIT 1
		`;
		
		if (!sport) {
			console.log('❌ NCAAFB sport not found');
			return;
		}
		
		// Get all teams for NCAAFB
		const teams = await db`
			SELECT id FROM teams WHERE sport_id = ${sport.id}
		`;
		
		console.log(`Found ${teams.length} teams`);
		
		// Calculate records for each team
		for (const team of teams) {
			// Count wins (as home team) - include games with scores even if not marked final
			const [homeWins] = await db`
				SELECT COUNT(*) as count FROM games
				WHERE sport_id = ${sport.id}
					AND home_team_id = ${team.id}
					AND home_score > 0
					AND away_score >= 0
					AND home_score > away_score
					AND (status = 'final' OR status = 'closed' OR (home_score > 0 AND away_score >= 0))
			`;
			
			// Count wins (as away team)
			const [awayWins] = await db`
				SELECT COUNT(*) as count FROM games
				WHERE sport_id = ${sport.id}
					AND away_team_id = ${team.id}
					AND away_score > 0
					AND home_score >= 0
					AND away_score > home_score
					AND (status = 'final' OR status = 'closed' OR (away_score > 0 AND home_score >= 0))
			`;
			
			// Count losses (as home team)
			const [homeLosses] = await db`
				SELECT COUNT(*) as count FROM games
				WHERE sport_id = ${sport.id}
					AND home_team_id = ${team.id}
					AND home_score >= 0
					AND away_score > 0
					AND home_score < away_score
					AND (status = 'final' OR status = 'closed' OR (home_score >= 0 AND away_score > 0))
			`;
			
			// Count losses (as away team)
			const [awayLosses] = await db`
				SELECT COUNT(*) as count FROM games
				WHERE sport_id = ${sport.id}
					AND away_team_id = ${team.id}
					AND away_score >= 0
					AND home_score > 0
					AND away_score < home_score
					AND (status = 'final' OR status = 'closed' OR (away_score >= 0 AND home_score > 0))
			`;
			
			const wins = (homeWins?.count || 0) + (awayWins?.count || 0);
			const losses = (homeLosses?.count || 0) + (awayLosses?.count || 0);
			
			// Update team record
			await db`
				UPDATE teams
				SET wins = ${wins}, losses = ${losses}, updated_at = NOW()
				WHERE id = ${team.id}
			`;
			
			if (wins > 0 || losses > 0) {
				console.log(`  Team ${team.id}: ${wins}-${losses}`);
			}
		}
		
		console.log('\n✅ Records calculated successfully');
		
	} catch (error) {
		console.error('❌ Failed to calculate records:', error.message);
		process.exit(1);
	}
}

calculateNCAAARecords();

