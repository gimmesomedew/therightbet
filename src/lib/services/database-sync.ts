import { db } from '$lib/database/connection.js';
import { sportsRadar, type SportsRadarTeam, type SportsRadarGame } from './sportradar.js';

export class DatabaseSyncService {
	
	// Sync WNBA teams from SportsRadar to database
	async syncWNBATeams(): Promise<void> {
		console.log('🏀 Syncing WNBA teams from SportsRadar...');
		
		try {
			const teams = await sportsRadar.getWNBATeams();
			console.log(`📊 Found ${teams.length} WNBA teams`);
			
			// Get WNBA sport ID
			const sportResult = await db`SELECT id FROM sports WHERE code = 'WNBA'`;
			if (sportResult.length === 0) {
				throw new Error('WNBA sport not found in database');
			}
			const sportId = sportResult[0].id;
			
			let syncedCount = 0;
			let updatedCount = 0;
			
			for (const team of teams) {
				// Check if team already exists
				const existingTeam = await db`
					SELECT id FROM teams 
					WHERE external_id = ${team.id}
				`;
				
				if (existingTeam.length > 0) {
					// Update existing team
					await db`
						UPDATE teams SET
							name = ${team.name},
							city = ${team.market},
							abbreviation = ${team.alias},
							logo_url = ${team.logo || ''},
							updated_at = NOW()
						WHERE external_id = ${team.id}
					`;
					updatedCount++;
				} else {
					// Insert new team
					await db`
						INSERT INTO teams (
							sport_id, name, city, abbreviation, 
							logo_url, external_id, created_at, updated_at
						) VALUES (
							${sportId}, ${team.name}, ${team.market}, ${team.alias},
							${team.logo || ''}, ${team.id}, NOW(), NOW()
						)
					`;
					syncedCount++;
				}
			}
			
			console.log(`✅ Teams sync completed: ${syncedCount} new, ${updatedCount} updated`);
			
		} catch (error) {
			console.error('❌ Teams sync failed:', error);
			throw error;
		}
	}
	
	// Sync WNBA players from SportsRadar to database
	async syncWNBAPlayers(): Promise<void> {
		console.log('👤 Syncing WNBA players from SportsRadar...');
		
		try {
			// Note: SportsRadar doesn't have a direct players endpoint like SportsDataIO
			// Players are typically available through team profiles or game summaries
			// For now, we'll skip player sync until we implement team-specific player fetching
			console.log('⚠️  Player sync temporarily disabled - SportsRadar requires team-specific player fetching');
			console.log('✅ Players sync skipped - will implement team-specific player fetching later');
			
		} catch (error) {
			console.error('❌ Players sync failed:', error);
			throw error;
		}
	}
	
	// Sync WNBA games from SportsRadar to database
	async syncWNBAGames(days: number = 7): Promise<void> {
		console.log(`🎮 Syncing WNBA games from SportsRadar for next ${days} days...`);
		
		try {
			const sportResult = await db`SELECT id FROM sports WHERE code = 'WNBA'`;
			if (sportResult.length === 0) {
				throw new Error('WNBA sport not found in database');
			}
			const sportId = sportResult[0].id;
			
			let syncedCount = 0;
			let updatedCount = 0;
			
			// Get current season schedule from SportsRadar
			const currentYear = new Date().getFullYear();
			const games = await sportsRadar.getWNBASchedule(currentYear);
			
			// Filter games for the next N days
			const targetDate = new Date();
			targetDate.setDate(targetDate.getDate() + days);
			
			const upcomingGames = games.filter(game => {
				const gameDate = new Date(game.scheduled);
				return gameDate >= new Date() && gameDate <= targetDate;
			});
			
			console.log(`📊 Found ${upcomingGames.length} upcoming games in the next ${days} days`);
			
			for (const game of upcomingGames) {
				try {
					// Get team IDs
					const homeTeamResult = await db`
						SELECT id FROM teams 
						WHERE external_id = ${game.home.id}
					`;
					const awayTeamResult = await db`
						SELECT id FROM teams 
						WHERE external_id = ${game.away.id}
					`;
					
					if (homeTeamResult.length === 0 || awayTeamResult.length === 0) {
						console.warn(`⚠️  Teams not found for game ${game.id}`);
						continue;
					}
					
					const homeTeamId = homeTeamResult[0].id;
					const awayTeamId = awayTeamResult[0].id;
					
					// Check if game already exists
					const existingGame = await db`
						SELECT id FROM games 
						WHERE external_id = ${game.id}
					`;
					
					// Prepare odds data (SportsRadar doesn't provide odds in the schedule endpoint)
					const oddsData = {
						spread: null,
						overUnder: null,
						homeMoneyline: null,
						awayMoneyline: null
					};
					
					if (existingGame.length > 0) {
						// Update existing game
						await db`
							UPDATE games SET
								home_team_id = ${homeTeamId},
								away_team_id = ${awayTeamId},
								game_date = ${game.scheduled}::timestamp with time zone,
								status = ${game.status.toLowerCase()},
								home_score = ${game.home_points || 0},
								away_score = ${game.away_points || 0},
								quarter = ${game.quarter || null},
								time_remaining = ${game.clock || null},
								odds = ${JSON.stringify(oddsData)},
								updated_at = NOW()
							WHERE external_id = ${game.id}
						`;
						updatedCount++;
					} else {
						// Insert new game
						await db`
							INSERT INTO games (
								sport_id, home_team_id, away_team_id, game_date,
								status, home_score, away_score, quarter,
								time_remaining, external_id, odds, created_at, updated_at
							) VALUES (
								${sportId}, ${homeTeamId}, ${awayTeamId}, ${game.scheduled}::timestamp with time zone,
								${game.status.toLowerCase()}, ${game.home_points || 0}, ${game.away_points || 0}, ${game.quarter || null},
								${game.clock || null}, ${game.id}, ${JSON.stringify(oddsData)}, NOW(), NOW()
							)
						`;
						syncedCount++;
					}
				} catch (error) {
					console.warn(`⚠️  Failed to sync game ${game.id}:`, error.message);
				}
			}
			
			console.log(`✅ Games sync completed: ${syncedCount} new, ${updatedCount} updated`);
			
		} catch (error) {
			console.error('❌ Games sync failed:', error);
			throw error;
		}
	}
	
	// Full sync - teams, players, and games
	async fullSync(): Promise<void> {
		console.log('🚀 Starting full WNBA data sync...');
		
		try {
			await this.syncWNBATeams();
			await this.syncWNBAPlayers();
			await this.syncWNBAGames(14); // Sync next 14 days of games
			
			console.log('🎉 Full sync completed successfully!');
		} catch (error) {
			console.error('❌ Full sync failed:', error);
			throw error;
		}
	}
	
	// Get sync status
	async getSyncStatus(): Promise<{
		teams: number;
		players: number;
		games: number;
		lastSync: Date | null;
	}> {
		try {
			const [teamsResult, playersResult, gamesResult, lastSyncResult] = await Promise.all([
				db`SELECT COUNT(*) as count FROM teams WHERE sport_id = (SELECT id FROM sports WHERE code = 'WNBA')`,
				db`SELECT COUNT(*) as count FROM players WHERE team_id IN (SELECT id FROM teams WHERE sport_id = (SELECT id FROM sports WHERE code = 'WNBA'))`,
				db`SELECT COUNT(*) as count FROM games WHERE sport_id = (SELECT id FROM sports WHERE code = 'WNBA')`,
				db`SELECT MAX(updated_at) as last_sync FROM games WHERE sport_id = (SELECT id FROM sports WHERE code = 'WNBA')`
			]);
			
			return {
				teams: parseInt(teamsResult[0].count),
				players: parseInt(playersResult[0].count),
				games: parseInt(gamesResult[0].count),
				lastSync: lastSyncResult[0].last_sync
			};
		} catch (error) {
			console.error('❌ Failed to get sync status:', error);
			throw error;
		}
	}
}

// Export singleton instance
export const databaseSync = new DatabaseSyncService();
