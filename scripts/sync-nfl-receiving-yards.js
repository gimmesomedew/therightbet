import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;
const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

if (!SPORTSDATAIO_API_KEY) {
	console.error('❌ SPORTSDATAIO_API_KEY environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);
const SPORTSDATAIO_BASE_URL = 'https://api.sportsdata.io/v3/nfl';

async function makeRequest(endpoint, retryCount = 0) {
	const url = `${SPORTSDATAIO_BASE_URL}${endpoint}?key=${SPORTSDATAIO_API_KEY}`;
	
	// Rate limiting: wait 1 second between requests
	if (retryCount === 0) {
		await new Promise(resolve => setTimeout(resolve, 1000));
	} else {
		const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
		console.log(`   ⏳ Waiting ${delay / 1000}s before retry ${retryCount}...`);
		await new Promise(resolve => setTimeout(resolve, delay));
	}
	
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429 && retryCount < 3) {
			return makeRequest(endpoint, retryCount + 1);
		}
		const errorText = await response.text().catch(() => response.statusText);
		throw new Error(`SportsDataIO API error: ${response.status} ${errorText}`);
	}

	return await response.json();
}

function mapSeasonType(seasonType) {
	// SportsDataIO uses: 1=REG, 2=PRE, 3=POST
	return seasonType === 'PRE' ? 2 : seasonType === 'POST' ? 3 : 1;
}

function getPlayerId(player) {
	return String(player?.PlayerID || player?.player_id || 'unknown');
}

async function syncReceivingYards(season, seasonType, week) {
	console.log(`📊 Syncing NFL Receiving Yards for ${season} ${seasonType} Week ${week}\n`);

	try {
		const seasonTypeNum = mapSeasonType(seasonType);

		// Get player game stats from SportsDataIO
		console.log(`📊 Fetching player game stats from SportsDataIO...`);
		const playerStats = await makeRequest(`/stats/json/PlayerGameStatsByWeek/${season}/${week}`);

		if (!Array.isArray(playerStats) || playerStats.length === 0) {
			console.log(`⚠️  No player stats found for ${season} Week ${week}`);
			return;
		}

		console.log(`✅ Found ${playerStats.length} total player game stats`);

		// Filter by season type (SportsDataIO returns all season types)
		const filteredBySeasonType = playerStats.filter(p => {
			const playerSeasonType = p.SeasonType || p.season_type;
			return playerSeasonType === seasonTypeNum;
		});

		console.log(`📊 Filtered to ${filteredBySeasonType.length} players for ${seasonType} season type`);

		if (filteredBySeasonType.length === 0) {
			console.log(`⚠️  No player stats found for ${season} ${seasonType} Week ${week}`);
			return;
		}

		// Get or create week record
		const [weekRecord] = await db`
			INSERT INTO nfl_weeks (season, season_type, week, has_data, synced_at, updated_at)
			VALUES (${season}, ${seasonType}, ${week}, true, NOW(), NOW())
			ON CONFLICT (season, season_type, week)
			DO UPDATE SET
				has_data = true,
				synced_at = NOW(),
				updated_at = NOW()
			RETURNING id
		`;

		const weekId = weekRecord.id;

		// Filter to only RB, WR, TE positions and process
		const eligiblePositions = ['RB', 'WR', 'TE', 'FB'];
		const receivingPlayers = filteredBySeasonType.filter(p => {
			const position = p.Position || p.position || '';
			return eligiblePositions.includes(position.toUpperCase());
		});

		console.log(`📊 Processing ${receivingPlayers.length} eligible players (RB, WR, TE, FB)`);

		let processed = 0;
		let skipped = 0;

		for (const player of receivingPlayers) {
			try {
				await processReceivingPlayer(weekId, season, seasonType, week, player);
				processed++;
			} catch (error) {
				console.error(`❌ Error processing player ${player.Name || player.PlayerID}:`, error.message);
				skipped++;
			}
		}

		// Get summary
		const [summary] = await db`
			SELECT 
				COUNT(*) as total_players,
				SUM(receiving_yards) as total_yards,
				SUM(receptions) as total_receptions
			FROM nfl_player_receiving_yards
			WHERE season = ${season}
				AND season_type = ${seasonType}
				AND week = ${week}
		`;

		console.log(`\n✅ Sync complete!`);
		console.log(`   Processed: ${processed}`);
		console.log(`   Skipped: ${skipped}`);
		console.log(`   Total Players in DB: ${summary.total_players || 0}`);
		console.log(`   Total Receiving Yards: ${summary.total_yards || 0}`);
		console.log(`   Total Receptions: ${summary.total_receptions || 0}`);
	} catch (error) {
		console.error('❌ Error syncing receiving yards:', error);
		process.exit(1);
	} finally {
		process.exit(0);
	}
}

async function processReceivingPlayer(weekId, season, seasonType, week, player) {
	const playerId = getPlayerId(player);
	const playerName = player?.Name || player?.name || 'Unknown Player';
	const position = player?.Position || player?.position || null;
	const teamAbbr = (player?.Team || player?.team || '').toUpperCase();

	if (!teamAbbr) {
		console.warn(`⚠️  Skipping player ${playerName} - no team abbreviation`);
		return;
	}

	// Extract receiving statistics from SportsDataIO format
	// Note: SportsDataIO sometimes returns decimal values, so we round them
	const receptions = Math.round(parseFloat(player?.Receptions || player?.receptions || 0) || 0);
	const receivingYards = Math.round(parseFloat(player?.ReceivingYards || player?.receiving_yards || 0) || 0);
	const receivingTouchdowns = Math.round(parseFloat(player?.ReceivingTouchdowns || player?.receiving_touchdowns || 0) || 0);
	const targets = Math.round(parseFloat(player?.ReceivingTargets || player?.receiving_targets || player?.targets || 0) || 0);
	const longestReception = Math.round(parseFloat(player?.ReceivingLong || player?.receiving_long || player?.longest_reception || 0) || 0);

	// Only insert if player has receiving stats (receptions > 0 or yards > 0)
	if (receptions > 0 || receivingYards > 0) {
		await db`
			INSERT INTO nfl_player_receiving_yards (
				week_id, season, season_type, week,
				team_abbreviation, player_id, player_name, position,
				receptions, receiving_yards, receiving_touchdowns,
				targets, longest_reception
			)
			VALUES (
				${weekId}, ${season}, ${seasonType}, ${week},
				${teamAbbr}, ${playerId}, ${playerName}, ${position},
				${receptions}, ${receivingYards}, ${receivingTouchdowns},
				${targets}, ${longestReception}
			)
			ON CONFLICT (season, season_type, week, team_abbreviation, player_id)
			DO UPDATE SET
				player_name = EXCLUDED.player_name,
				position = EXCLUDED.position,
				receptions = EXCLUDED.receptions,
				receiving_yards = EXCLUDED.receiving_yards,
				receiving_touchdowns = EXCLUDED.receiving_touchdowns,
				targets = EXCLUDED.targets,
				longest_reception = EXCLUDED.longest_reception,
				updated_at = NOW()
		`;
	}
}

// Parse command line arguments
const args = process.argv.slice(2);
const season = parseInt(args[0]) || 2025;
const seasonType = (args[1] || 'REG').toUpperCase();
const week = parseInt(args[2]) || 11;

if (isNaN(season) || isNaN(week)) {
	console.error('Usage: node sync-nfl-receiving-yards.js <season> <seasonType> <week>');
	console.error('Example: node sync-nfl-receiving-yards.js 2025 REG 11');
	process.exit(1);
}

syncReceivingYards(season, seasonType, week);

