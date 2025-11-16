import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY;

if (!DATABASE_URL || !SPORTSDATAIO_API_KEY) {
	console.error('❌ DATABASE_URL and SPORTSDATAIO_API_KEY environment variables are required');
	process.exit(1);
}

async function syncWNBASimple() {
	console.log('🏀 Starting WNBA data synchronization...');
	
	try {
		const db = neon(DATABASE_URL);
		
		// Test database connection
		await db`SELECT 1 as test`;
		console.log('✅ Database connection successful');
		
		// Test API connection
		const teamsResponse = await fetch(`https://api.sportsdata.io/v3/wnba/scores/json/teams?key=${SPORTSDATAIO_API_KEY}`);
		if (!teamsResponse.ok) {
			throw new Error(`API request failed: ${teamsResponse.status}`);
		}
		const teams = await teamsResponse.json();
		console.log('✅ SportsDataIO API connection successful');
		console.log(`📊 Found ${teams.length} WNBA teams`);
		
		// Get WNBA sport ID
		const sportResult = await db`SELECT id FROM sports WHERE code = 'WNBA'`;
		if (sportResult.length === 0) {
			throw new Error('WNBA sport not found in database');
		}
		const sportId = sportResult[0].id;
		console.log('✅ WNBA sport found in database');
		
		// Sync teams
		console.log('🏀 Syncing WNBA teams...');
		let syncedTeams = 0;
		let updatedTeams = 0;
		
		for (const team of teams) {
			const existingTeam = await db`
				SELECT id FROM teams 
				WHERE external_id = ${team.TeamID.toString()}
			`;
			
			if (existingTeam.length > 0) {
				await db`
					UPDATE teams SET
						name = ${team.Name},
						city = ${team.City},
						abbreviation = ${team.Key},
						logo_url = ${team.Logo},
						updated_at = NOW()
					WHERE external_id = ${team.TeamID.toString()}
				`;
				updatedTeams++;
			} else {
				await db`
					INSERT INTO teams (
						sport_id, name, city, abbreviation, 
						logo_url, external_id, created_at, updated_at
					) VALUES (
						${sportId}, ${team.Name}, ${team.City}, ${team.Key},
						${team.Logo}, ${team.TeamID.toString()}, NOW(), NOW()
					)
				`;
				syncedTeams++;
			}
		}
		
		console.log(`✅ Teams sync completed: ${syncedTeams} new, ${updatedTeams} updated`);
		
		// Sync players
		console.log('👤 Syncing WNBA players...');
		const playersResponse = await fetch(`https://api.sportsdata.io/v3/wnba/scores/json/players?key=${SPORTSDATAIO_API_KEY}`);
		if (!playersResponse.ok) {
			throw new Error(`Players API request failed: ${playersResponse.status}`);
		}
		const players = await playersResponse.json();
		console.log(`📊 Found ${players.length} WNBA players`);
		
		let syncedPlayers = 0;
		let updatedPlayers = 0;
		
		for (const player of players) {
			// Get team ID by abbreviation (players use team abbreviations like "CONN", "CHI")
			const teamResult = await db`
				SELECT id FROM teams 
				WHERE abbreviation = ${player.Team}
			`;
			
			if (teamResult.length === 0) {
				console.warn(`⚠️  Team not found for player ${player.FirstName} ${player.LastName} (team: ${player.Team})`);
				continue;
			}
			
			const teamId = teamResult[0].id;
			
			const existingPlayer = await db`
				SELECT id FROM players 
				WHERE external_id = ${player.PlayerID.toString()}
			`;
			
			if (existingPlayer.length > 0) {
				await db`
					UPDATE players SET
						team_id = ${teamId},
						first_name = ${player.FirstName},
						last_name = ${player.LastName},
						position = ${player.Position},
						jersey_number = ${player.Number},
						height = ${player.Height},
						weight = ${player.Weight},
						updated_at = NOW()
					WHERE external_id = ${player.PlayerID.toString()}
				`;
				updatedPlayers++;
			} else {
				await db`
					INSERT INTO players (
						team_id, first_name, last_name, position,
						jersey_number, height, weight, external_id,
						created_at, updated_at
					) VALUES (
						${teamId}, ${player.FirstName}, ${player.LastName}, ${player.Position},
						${player.Number}, ${player.Height}, ${player.Weight}, ${player.PlayerID.toString()},
						NOW(), NOW()
					)
				`;
				syncedPlayers++;
			}
		}
		
		console.log(`✅ Players sync completed: ${syncedPlayers} new, ${updatedPlayers} updated`);
		
		// Get final counts
		const [teamsCount, playersCount] = await Promise.all([
			db`SELECT COUNT(*) as count FROM teams WHERE sport_id = ${sportId}`,
			db`SELECT COUNT(*) as count FROM players WHERE team_id IN (SELECT id FROM teams WHERE sport_id = ${sportId})`
		]);
		
		console.log('\n📊 Final database status:');
		console.log(`   Teams: ${teamsCount[0].count}`);
		console.log(`   Players: ${playersCount[0].count}`);
		
		console.log('\n🎉 WNBA data synchronization completed successfully!');
		console.log('✅ Your THERiGHTBET database now has real WNBA data!');
		
	} catch (error) {
		console.error('\n❌ WNBA data synchronization failed:');
		console.error(error.message);
		process.exit(1);
	}
}

// Run the sync
syncWNBASimple();
