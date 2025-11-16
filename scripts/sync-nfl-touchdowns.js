import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
const SPORTRADAR_API_KEY = process.env.SPORTRADAR_API_KEY;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

if (!SPORTRADAR_API_KEY) {
	console.error('❌ SPORTRADAR_API_KEY environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);
const NFL_BASE_URL = 'https://api.sportradar.com/nfl/official/trial/v7/en';

async function makeRequest(endpoint) {
	const url = `${NFL_BASE_URL}${endpoint}?api_key=${SPORTRADAR_API_KEY}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Sportradar API error: ${response.status} ${response.statusText}`);
	}

	return await response.json();
}

function mapSeasonType(seasonType) {
	return seasonType === 'PRE' ? 'PRE' : seasonType === 'POST' ? 'PST' : 'REG';
}

function extractTouchdownCount(player, fields = ['touchdowns']) {
	for (const field of fields) {
		const value = player?.[field];
		if (typeof value === 'number' && value > 0) {
			return value;
		}
	}
	return 0;
}

function processTeamStatistics(accumulators, statsTeam, scheduleTeam) {
	if (!statsTeam && !scheduleTeam) return;

	const alias = (statsTeam?.alias || scheduleTeam?.alias || '').toUpperCase();
	if (!alias) return;

	// Build team metadata
	const teamMeta = {
		abbreviation: alias,
		displayName: statsTeam?.name || scheduleTeam?.name || alias,
		location: statsTeam?.market || scheduleTeam?.market || alias,
		mascot: statsTeam?.name || scheduleTeam?.name || ''
	};

	// Get or create accumulator
	let accumulator = accumulators.get(alias);
	if (!accumulator) {
		accumulator = {
			team: teamMeta,
			players: new Map(),
			totalTouchdowns: 0
		};
		accumulators.set(alias, accumulator);
	}

	// Track all players who appeared (even with 0 touchdowns)
	// We need to track ALL players who appear in ANY stat category to know they played
	const playersAppeared = new Map(); // Map<playerId, {playerId, playerName, position}>

	// Helper to normalize player ID
	function getPlayerId(player, category) {
		return String(
			player?.id || player?.sr_id || player?.player_id || `${alias}-${player?.name || 'unknown'}-${category}`
		);
	}

	// First pass: collect ALL players who appeared in ANY stat category
	const collectAllPlayers = (players, category) => {
		if (!Array.isArray(players)) return;
		for (const player of players) {
			const playerId = getPlayerId(player, category);
			if (!playersAppeared.has(playerId)) {
				playersAppeared.set(playerId, {
					playerId,
					playerName: player?.name || player?.full_name || 'Unknown Player',
					position: player?.position || null
				});
			}
		}
	};

	// Collect all players from all stat categories
	collectAllPlayers(statsTeam?.rushing?.players, 'rushing');
	collectAllPlayers(statsTeam?.receiving?.players, 'receiving');
	collectAllPlayers(statsTeam?.passing?.players, 'passing');
	collectAllPlayers(statsTeam?.kick_returns?.players, 'return');
	collectAllPlayers(statsTeam?.punt_returns?.players, 'return');
	collectAllPlayers(statsTeam?.misc_returns?.players, 'return');
	collectAllPlayers(statsTeam?.int_returns?.players, 'defensive');
	collectAllPlayers(statsTeam?.fumbles?.players, 'defensive');

	// Second pass: process touchdowns for players who scored
	const processPlayers = (players, category, extraFields = ['touchdowns']) => {
		if (!Array.isArray(players)) return;

		for (const player of players) {
			const touchdowns = extractTouchdownCount(player, extraFields);
			if (touchdowns <= 0) continue; // Skip if no touchdowns

			const playerId = getPlayerId(player, category);
			const playerInfo = playersAppeared.get(playerId);

			const existing = accumulator.players.get(playerId);
			const summary = existing || {
				playerId,
				playerName: playerInfo?.playerName || player?.name || player?.full_name || 'Unknown Player',
				position: playerInfo?.position || player?.position || null,
				team: alias,
				rushing: 0,
				receiving: 0,
				passing: 0,
				return: 0,
				defensive: 0,
				total: 0
			};

			summary[category] += touchdowns;
			summary.total =
				summary.rushing + summary.receiving + summary.passing + summary.return + summary.defensive;

			accumulator.players.set(playerId, summary);
		}
	};

	// Process all touchdown categories
	processPlayers(statsTeam?.rushing?.players, 'rushing');
	processPlayers(statsTeam?.receiving?.players, 'receiving');
	processPlayers(statsTeam?.passing?.players, 'passing');
	processPlayers(statsTeam?.kick_returns?.players, 'return');
	processPlayers(statsTeam?.punt_returns?.players, 'return');
	processPlayers(statsTeam?.misc_returns?.players, 'return');
	processPlayers(statsTeam?.int_returns?.players, 'defensive');
	processPlayers(statsTeam?.fumbles?.players, 'defensive', [
		'return_touchdowns',
		'own_rec_tds',
		'opp_rec_tds',
		'ez_rec_tds'
	]);

	// Now ensure ALL players who appeared are in the accumulator (even with 0 touchdowns)
	// This is important for tracking games played
	for (const [playerId, playerInfo] of playersAppeared.entries()) {
		if (!accumulator.players.has(playerId)) {
			// Player appeared but didn't score - still track them
			accumulator.players.set(playerId, {
				playerId,
				playerName: playerInfo.playerName,
				position: playerInfo.position,
				team: alias,
				rushing: 0,
				receiving: 0,
				passing: 0,
				return: 0,
				defensive: 0,
				total: 0
			});
		}
	}

	// Calculate total touchdowns for team
	accumulator.totalTouchdowns = Array.from(accumulator.players.values()).reduce(
		(sum, p) => sum + p.total,
		0
	);
}

function extractFirstTouchdownScorers(gameId, pbpData, homeTeam, awayTeam) {
	const firstTds = new Map(); // Map<teamAbbreviation, firstTDInfo>
	const homeAbbr = (homeTeam?.alias || '').toUpperCase();
	const awayAbbr = (awayTeam?.alias || '').toUpperCase();

	try {
		// Sort periods and events chronologically
		const allEvents = [];
		for (const period of pbpData?.periods || []) {
			const quarter = period.number || 0;
			for (const drive of period.pbp || []) {
				for (const event of drive.events || []) {
					const desc = (event.description || '').toLowerCase();
					if (desc.includes('touchdown') || desc.includes(' td ') || desc.includes('td.')) {
						allEvents.push({ ...event, quarter });
					}
				}
			}
		}

		// Process events in chronological order
		for (const event of allEvents) {
			const quarter = event.quarter || 0;

			// Extract scoring player and team from statistics
			let scoringPlayer = null;
			let playerId = null;
			let position = null;
			let teamAbbr = null;
			let tdType = null;

			// Check statistics first
			for (const stat of event.statistics || []) {
				const statType = stat.stat_type;
				if (statType === 'rush' || statType === 'receive' || statType === 'pass') {
					const player = stat.player || {};
					scoringPlayer = player.name || null;
					playerId = player.id || player.sr_id || null;
					position = player.position || null;
					const team = stat.team || {};
					teamAbbr = (team.alias || '').toUpperCase();

					if (statType === 'rush') {
						tdType = 'rushing';
					} else if (statType === 'receive') {
						tdType = 'receiving';
					} else if (statType === 'pass') {
						tdType = 'passing';
					}
					break;
				}
			}

			// If not found in statistics, try details
			if (!scoringPlayer) {
				for (const detail of event.details || []) {
					if (detail.category === 'rush' || detail.category === 'pass_reception') {
						const players = detail.players || [];
						if (players.length > 0) {
							const player = players[0];
							scoringPlayer = player.name || null;
							playerId = player.id || player.sr_id || null;
							position = player.position || null;
							if (detail.category === 'rush') {
								tdType = 'rushing';
							} else {
								tdType = 'receiving';
							}
							// Try to get team from start_location or end_location
							const location = detail.start_location || detail.end_location || {};
							teamAbbr = (location.alias || '').toUpperCase();
							break;
						}
					}
				}
			}

			// If still no team, try to infer from possession or score change
			if (!teamAbbr) {
				const startSituation = event.start_situation || {};
				const possession = startSituation.possession || {};
				teamAbbr = (possession.alias || '').toUpperCase();
			}

			// Only record if we have all required info and haven't seen this team's first TD yet
			if (scoringPlayer && teamAbbr && (teamAbbr === homeAbbr || teamAbbr === awayAbbr) && !firstTds.has(teamAbbr)) {
				const clock = event.clock || '';
				const homePoints = event.home_points || 0;
				const awayPoints = event.away_points || 0;
				const scoreAtTd = `${homeAbbr} ${homePoints} - ${awayAbbr} ${awayPoints}`;

				firstTds.set(teamAbbr, {
					playerId: playerId || `${teamAbbr}-${scoringPlayer}`,
					playerName: scoringPlayer,
					position: position,
					team: teamAbbr,
					touchdownType: tdType || 'unknown',
					quarter: quarter,
					clock: clock,
					scoreAtTd: scoreAtTd
				});
			}
		}
	} catch (error) {
		console.error(`Error extracting first TD scorers for game ${gameId}:`, error.message);
	}

	return Array.from(firstTds.values());
}

async function fetchNflTouchdowns(season, seasonType, week) {
	try {
		// Get schedule for the week
		const schedule = await makeRequest(
			`/games/${season}/${mapSeasonType(seasonType)}/${week}/schedule.json`
		);

		const games =
			Array.isArray(schedule?.week?.games) ? schedule.week.games : Array.isArray(schedule?.games) ? schedule.games : [];

		if (games.length === 0) {
			return { source: 'sportradar', teams: [], firstTouchdownScorers: [] };
		}

		const teamAccumulators = new Map();
		const firstTouchdownScorers = [];

		// Fetch statistics and play-by-play for each game
		// Add delays to avoid rate limiting
		const statsResults = await Promise.allSettled(
			games.map((game, index) => {
				if (index > 0) {
					// Add 500ms delay between requests
					return new Promise((resolve) => setTimeout(() => resolve(makeRequest(`/games/${game.id}/statistics.json`)), index * 500));
				}
				return makeRequest(`/games/${game.id}/statistics.json`);
			})
		);

		// Wait a bit before fetching play-by-play data
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const pbpResults = await Promise.allSettled(
			games.map((game, index) => {
				if (index > 0) {
					// Add 500ms delay between requests
					return new Promise((resolve) => setTimeout(() => resolve(makeRequest(`/games/${game.id}/pbp.json`)), index * 500));
				}
				return makeRequest(`/games/${game.id}/pbp.json`);
			})
		);

		statsResults.forEach((result, index) => {
			if (result.status !== 'fulfilled') return;
			const statistics = result.value?.statistics;
			const game = games[index];
			if (!statistics) return;

			processTeamStatistics(teamAccumulators, statistics.home, game?.home);
			processTeamStatistics(teamAccumulators, statistics.away, game?.away);
		});

		// Extract first touchdown scorers from play-by-play
		pbpResults.forEach((result, index) => {
			if (result.status !== 'fulfilled') return;
			const pbpData = result.value;
			const game = games[index];
			if (!pbpData || !game) return;

			const firstTds = extractFirstTouchdownScorers(
				game.id,
				pbpData,
				game.home,
				game.away
			);
			firstTds.forEach((td) => {
				firstTouchdownScorers.push({
					gameId: game.id,
					...td
				});
			});
		});

		// Convert to array format
		const teams = Array.from(teamAccumulators.values()).map((acc) => ({
			team: acc.team,
			totalTouchdowns: acc.totalTouchdowns,
			players: Array.from(acc.players.values())
		}));

		return {
			season,
			seasonType,
			week,
			source: 'sportradar',
			teams,
			firstTouchdownScorers
		};
	} catch (error) {
		console.error(`Failed to fetch week ${week}:`, error.message);
		return { source: 'mock', teams: [], firstTouchdownScorers: [] };
	}
}

async function syncNflTouchdowns(season = 2025, seasonType = 'REG', weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
	console.log(`🏈 Starting NFL Touchdown Sync for ${season} ${seasonType}`);
	console.log(`📅 Weeks to sync: ${weeks.join(', ')}\n`);

	for (const week of weeks) {
		console.log(`\n📊 Processing Week ${week}...`);

		// Add delay between weeks to avoid rate limiting (except for first week)
		if (week > weeks[0]) {
			console.log('   ⏳ Waiting 3 seconds to avoid rate limiting...');
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}

		try {
			// Fetch touchdown data from Sportradar API
			const touchdownData = await fetchNflTouchdowns(season, seasonType, week);

			// Skip if no data or mock data
			if (touchdownData.source === 'mock' || touchdownData.teams.length === 0) {
				console.log(`   ⚠️  Week ${week}: No real data available (source: ${touchdownData.source})`);

				// Still record that we checked this week
				await db`
					INSERT INTO nfl_weeks (season, season_type, week, has_data, synced_at)
					VALUES (${season}, ${seasonType}, ${week}, false, NOW())
					ON CONFLICT (season, season_type, week)
					DO UPDATE SET
						has_data = false,
						synced_at = NOW(),
						updated_at = NOW()
				`;
				continue;
			}

			console.log(`   ✅ Week ${week}: Found ${touchdownData.teams.length} teams with data`);

			// Insert/update week record
			const [weekRecord] = await db`
				INSERT INTO nfl_weeks (season, season_type, week, has_data, synced_at)
				VALUES (${season}, ${seasonType}, ${week}, true, NOW())
				ON CONFLICT (season, season_type, week)
				DO UPDATE SET
					has_data = true,
					synced_at = NOW(),
					updated_at = NOW()
				RETURNING id
			`;

			const weekId = weekRecord.id;

			// Process each team
			for (const teamData of touchdownData.teams) {
				// Insert/update team touchdown record
				const [teamRecord] = await db`
					INSERT INTO nfl_team_touchdowns (
						week_id, season, season_type, week,
						team_abbreviation, team_display_name, team_location, team_mascot,
						total_touchdowns
					)
					VALUES (
						${weekId}, ${season}, ${seasonType}, ${week},
						${teamData.team.abbreviation}, ${teamData.team.displayName},
						${teamData.team.location || null}, ${teamData.team.mascot || null},
						${teamData.totalTouchdowns}
					)
					ON CONFLICT (season, season_type, week, team_abbreviation)
					DO UPDATE SET
						team_display_name = EXCLUDED.team_display_name,
						team_location = EXCLUDED.team_location,
						team_mascot = EXCLUDED.team_mascot,
						total_touchdowns = EXCLUDED.total_touchdowns,
						updated_at = NOW()
					RETURNING id
				`;

				const teamTouchdownId = teamRecord.id;

				// Process each player (including those with 0 touchdowns)
				for (const player of teamData.players) {
					await db`
						INSERT INTO nfl_player_touchdowns (
							team_touchdown_id, week_id, season, season_type, week,
							team_abbreviation, player_id, player_name, position,
							rushing_touchdowns, receiving_touchdowns, passing_touchdowns,
							return_touchdowns, defensive_touchdowns, total_touchdowns,
							games_appeared
						)
						VALUES (
							${teamTouchdownId}, ${weekId}, ${season}, ${seasonType}, ${week},
							${teamData.team.abbreviation}, ${String(player.playerId)}, ${player.playerName},
							${player.position || null},
							${player.rushing}, ${player.receiving}, ${player.passing},
							${player.return}, ${player.defensive}, ${player.total},
							1
						)
						ON CONFLICT (season, season_type, week, team_abbreviation, player_id)
						DO UPDATE SET
							player_name = EXCLUDED.player_name,
							position = EXCLUDED.position,
							rushing_touchdowns = EXCLUDED.rushing_touchdowns,
							receiving_touchdowns = EXCLUDED.receiving_touchdowns,
							passing_touchdowns = EXCLUDED.passing_touchdowns,
							return_touchdowns = EXCLUDED.return_touchdowns,
							defensive_touchdowns = EXCLUDED.defensive_touchdowns,
							total_touchdowns = EXCLUDED.total_touchdowns,
							games_appeared = 1,
							updated_at = NOW()
					`;
				}

				console.log(
					`   📝 ${teamData.team.abbreviation}: ${teamData.totalTouchdowns} TDs, ${teamData.players.length} players`
				);
			}

			// Store first touchdown scorers
			if (touchdownData.firstTouchdownScorers && touchdownData.firstTouchdownScorers.length > 0) {
				console.log(`   🏆 Found ${touchdownData.firstTouchdownScorers.length} first touchdown scorers`);
				for (const firstTd of touchdownData.firstTouchdownScorers) {
					await db`
						INSERT INTO nfl_first_touchdown_scorers (
							week_id, season, season_type, week,
							game_id, team_abbreviation, player_id, player_name, position,
							touchdown_type, quarter, clock, score_at_td
						)
						VALUES (
							${weekId}, ${season}, ${seasonType}, ${week},
							${firstTd.gameId}, ${firstTd.team}, ${String(firstTd.playerId)}, ${firstTd.playerName},
							${firstTd.position || null}, ${firstTd.touchdownType}, ${firstTd.quarter},
							${firstTd.clock}, ${firstTd.scoreAtTd}
						)
						ON CONFLICT (season, season_type, week, game_id, team_abbreviation)
						DO UPDATE SET
							player_id = EXCLUDED.player_id,
							player_name = EXCLUDED.player_name,
							position = EXCLUDED.position,
							touchdown_type = EXCLUDED.touchdown_type,
							quarter = EXCLUDED.quarter,
							clock = EXCLUDED.clock,
							score_at_td = EXCLUDED.score_at_td,
							updated_at = NOW()
					`;
				}
			}

			console.log(`   ✅ Week ${week} synced successfully`);
		} catch (error) {
			console.error(`   ❌ Week ${week} failed:`, error.message);
			console.error(error);
		}
	}

	console.log(`\n🎉 NFL Touchdown Sync completed for ${season} ${seasonType}`);
}

// Parse command-line arguments
function parseArgs() {
	const args = process.argv.slice(2);
	const options = {
		season: 2025,
		seasonType: 'REG',
		weeks: null, // null means all weeks
		singleWeek: null
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		
		if (arg === '--week' || arg === '-w') {
			const week = parseInt(args[i + 1]);
			if (isNaN(week) || week < 1 || week > 18) {
				console.error('❌ Invalid week number. Must be between 1 and 18.');
				process.exit(1);
			}
			options.singleWeek = week;
			i++;
		} else if (arg === '--weeks') {
			const weekList = args[i + 1].split(',').map(w => parseInt(w.trim()));
			if (weekList.some(w => isNaN(w) || w < 1 || w > 18)) {
				console.error('❌ Invalid week numbers. Must be between 1 and 18.');
				process.exit(1);
			}
			options.weeks = weekList;
			i++;
		} else if (arg === '--season' || arg === '-s') {
			options.season = parseInt(args[i + 1]);
			if (isNaN(options.season)) {
				console.error('❌ Invalid season year.');
				process.exit(1);
			}
			i++;
		} else if (arg === '--type' || arg === '-t') {
			const type = args[i + 1].toUpperCase();
			if (!['PRE', 'REG', 'POST'].includes(type)) {
				console.error('❌ Invalid season type. Must be PRE, REG, or POST.');
				process.exit(1);
			}
			options.seasonType = type;
			i++;
		} else if (arg === '--help' || arg === '-h') {
			console.log(`
Usage: npm run sync:nfl [options]

Options:
  --week, -w <number>     Sync a specific week (1-18)
  --weeks <list>          Sync specific weeks (comma-separated, e.g., "1,2,3")
  --season, -s <year>     Season year (default: 2025)
  --type, -t <type>       Season type: PRE, REG, or POST (default: REG)
  --help, -h              Show this help message

Examples:
  npm run sync:nfl                    # Sync all weeks 1-10 for 2025 REG
  npm run sync:nfl --week 3           # Sync only week 3
  npm run sync:nfl --weeks 5,6,7      # Sync weeks 5, 6, and 7
  npm run sync:nfl --week 10 --type REG --season 2025
			`);
			process.exit(0);
		}
	}

	return options;
}

// Run the sync
async function main() {
	try {
		// Parse command-line arguments
		const options = parseArgs();
		
		// Determine which weeks to sync
		let weeksToSync;
		if (options.singleWeek) {
			weeksToSync = [options.singleWeek];
			console.log(`🎯 Syncing single week: ${options.singleWeek}\n`);
		} else if (options.weeks) {
			weeksToSync = options.weeks;
			console.log(`🎯 Syncing specific weeks: ${weeksToSync.join(', ')}\n`);
		} else {
			// Default: all weeks 1-10 for REG season
			const maxWeek = options.seasonType === 'PRE' ? 3 : options.seasonType === 'POST' ? 5 : 10;
			weeksToSync = Array.from({ length: maxWeek }, (_, i) => i + 1);
			console.log(`🎯 Syncing all weeks: ${weeksToSync.join(', ')}\n`);
		}

		// Test database connection
		await db`SELECT 1`;
		console.log('✅ Database connection successful\n');

		// Sync the specified weeks
		await syncNflTouchdowns(options.season, options.seasonType, weeksToSync);

		// Show summary for synced weeks
		const summary = await db`
			SELECT 
				week,
				has_data,
				synced_at,
				(SELECT COUNT(*) FROM nfl_team_touchdowns WHERE nfl_team_touchdowns.week_id = nfl_weeks.id) as teams_count,
				(SELECT COUNT(*) FROM nfl_player_touchdowns WHERE nfl_player_touchdowns.week_id = nfl_weeks.id) as players_count
			FROM nfl_weeks
			WHERE season = ${options.season} AND season_type = ${options.seasonType}
				AND week = ANY(${weeksToSync})
			ORDER BY week
		`;

		console.log('\n📊 Sync Summary:');
		console.log('Week | Has Data | Teams | Players | Synced At');
		console.log('-----|----------|-------|---------|-------------------');
		for (const row of summary) {
			console.log(
				`  ${row.week}  | ${row.has_data ? '✅ Yes' : '❌ No'}    | ${row.teams_count || 0}     | ${row.players_count || 0}       | ${row.synced_at ? new Date(row.synced_at).toLocaleString() : 'N/A'}`
			);
		}
	} catch (error) {
		console.error('❌ Sync failed:', error);
		process.exit(1);
	}
}

main();
