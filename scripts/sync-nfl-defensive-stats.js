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

function calculateDefensiveStats(teamStats) {
	// Calculate total yards allowed (sum of passing and rushing)
	const totalYardsAllowed = (teamStats.OpponentPassingYards || 0) + (teamStats.OpponentRushingYards || 0);
	
	// Calculate turnovers forced
	const turnoversForced = (teamStats.Interceptions || 0) + (teamStats.FumblesRecovered || 0);
	
	// Calculate red zone stats
	const redZoneTouchdownsAllowed = teamStats.OpponentRedZoneConversions || 0;
	const redZoneFieldGoalsAllowed = (teamStats.OpponentRedZoneAttempts || 0) - (teamStats.OpponentRedZoneConversions || 0);
	const redZoneStopPercentage = teamStats.OpponentRedZoneAttempts > 0
		? ((teamStats.OpponentRedZoneAttempts - teamStats.OpponentRedZoneConversions) / teamStats.OpponentRedZoneAttempts) * 100
		: null;
	const redZoneScoringPercentageAllowed = teamStats.OpponentRedZonePercentage || null;
	
	// Calculate third down percentage
	const thirdDownPercentageAllowed = teamStats.OpponentThirdDownAttempts > 0
		? (teamStats.OpponentThirdDownConversions / teamStats.OpponentThirdDownAttempts) * 100
		: null;

	return {
		gameKey: teamStats.GameKey,
		gameDate: teamStats.Date ? new Date(teamStats.Date) : null,
		teamAbbreviation: teamStats.Team,
		teamName: teamStats.Team, // Will be enhanced with team lookup if needed
		opponentAbbreviation: teamStats.Opponent,
		opponentName: teamStats.Opponent,
		homeOrAway: teamStats.HomeOrAway,
		
		// General Defensive Stats
		pointsAllowed: teamStats.OpponentScore || 0,
		totalYardsAllowed,
		passingYardsAllowed: teamStats.OpponentPassingYards || 0,
		rushingYardsAllowed: teamStats.OpponentRushingYards || 0,
		firstDownsAllowed: teamStats.OpponentFirstDowns || 0,
		thirdDownConversionsAllowed: teamStats.OpponentThirdDownConversions || 0,
		thirdDownAttemptsAllowed: teamStats.OpponentThirdDownAttempts || 0,
		thirdDownPercentageAllowed,
		fourthDownConversionsAllowed: teamStats.OpponentFourthDownConversions || 0,
		fourthDownAttemptsAllowed: teamStats.OpponentFourthDownAttempts || 0,
		timeOfPossessionAllowed: teamStats.OpponentTimeOfPossession || null,
		
		// Defensive Plays
		sacks: teamStats.Sacks || 0,
		interceptions: teamStats.Interceptions || 0,
		fumblesForced: teamStats.FumblesForced || 0,
		fumblesRecovered: teamStats.FumblesRecovered || 0,
		turnoversForced,
		defensiveTouchdowns: teamStats.DefensiveTouchdowns || 0,
		safeties: teamStats.Safeties || 0,
		quarterbackHits: teamStats.QuarterbackHits || 0,
		tacklesForLoss: teamStats.TacklesForLoss || 0,
		
		// Red Zone Defense
		redZoneAttemptsAllowed: teamStats.OpponentRedZoneAttempts || 0,
		redZoneConversionsAllowed: teamStats.OpponentRedZoneConversions || 0,
		redZoneTouchdownsAllowed,
		redZoneFieldGoalsAllowed,
		redZoneStopPercentage,
		redZoneScoringPercentageAllowed,
		goalToGoAttemptsAllowed: teamStats.OpponentGoalToGoAttempts || 0,
		goalToGoConversionsAllowed: teamStats.OpponentGoalToGoConversions || 0,
		
		// Penalties Against Opponent
		opponentPenalties: teamStats.OpponentPenalties || 0,
		opponentPenaltyYards: teamStats.OpponentPenaltyYards || 0,
		
		// Scoring Breakdown
		opponentScoreQ1: teamStats.OpponentScoreQuarter1 || 0,
		opponentScoreQ2: teamStats.OpponentScoreQuarter2 || 0,
		opponentScoreQ3: teamStats.OpponentScoreQuarter3 || 0,
		opponentScoreQ4: teamStats.OpponentScoreQuarter4 || 0,
	};
}

async function syncDefensiveStats(season, week, seasonType = 1) {
	console.log(`🛡️  Syncing NFL Defensive Statistics for ${season} Week ${week} (Season Type: ${seasonType})\n`);

	try {
		// Fetch team game stats from SportsDataIO
		const teamStats = await makeRequest(`/stats/json/TeamGameStats/${season}/${week}`);

		if (!teamStats || teamStats.length === 0) {
			console.log(`⚠️  No team stats found for ${season} Week ${week}`);
			return;
		}

		console.log(`📊 Found ${teamStats.length} team game stats`);

		let inserted = 0;
		let updated = 0;
		let errors = 0;

		for (const teamStat of teamStats) {
			try {
				const defensiveStats = calculateDefensiveStats(teamStat);

				// Insert or update defensive stats
				await db`
					INSERT INTO nfl_defensive_stats (
						season, season_type, week, game_key, game_date,
						team_abbreviation, team_name, opponent_abbreviation, opponent_name, home_or_away,
						points_allowed, total_yards_allowed, passing_yards_allowed, rushing_yards_allowed,
						first_downs_allowed, third_down_conversions_allowed, third_down_attempts_allowed,
						third_down_percentage_allowed, fourth_down_conversions_allowed, fourth_down_attempts_allowed,
						time_of_possession_allowed,
						sacks, interceptions, fumbles_forced, fumbles_recovered, turnovers_forced,
						defensive_touchdowns, safeties, quarterback_hits, tackles_for_loss,
						red_zone_attempts_allowed, red_zone_conversions_allowed, red_zone_touchdowns_allowed,
						red_zone_field_goals_allowed, red_zone_stop_percentage, red_zone_scoring_percentage_allowed,
						goal_to_go_attempts_allowed, goal_to_go_conversions_allowed,
						opponent_penalties, opponent_penalty_yards,
						opponent_score_q1, opponent_score_q2, opponent_score_q3, opponent_score_q4,
						source, updated_at
					)
					VALUES (
						${season}, ${seasonType}, ${week}, ${defensiveStats.gameKey}, ${defensiveStats.gameDate},
						${defensiveStats.teamAbbreviation}, ${defensiveStats.teamName}, 
						${defensiveStats.opponentAbbreviation}, ${defensiveStats.opponentName}, ${defensiveStats.homeOrAway},
						${defensiveStats.pointsAllowed}, ${defensiveStats.totalYardsAllowed}, 
						${defensiveStats.passingYardsAllowed}, ${defensiveStats.rushingYardsAllowed},
						${defensiveStats.firstDownsAllowed}, ${defensiveStats.thirdDownConversionsAllowed},
						${defensiveStats.thirdDownAttemptsAllowed}, ${defensiveStats.thirdDownPercentageAllowed},
						${defensiveStats.fourthDownConversionsAllowed}, ${defensiveStats.fourthDownAttemptsAllowed},
						${defensiveStats.timeOfPossessionAllowed},
						${defensiveStats.sacks}, ${defensiveStats.interceptions}, ${defensiveStats.fumblesForced},
						${defensiveStats.fumblesRecovered}, ${defensiveStats.turnoversForced},
						${defensiveStats.defensiveTouchdowns}, ${defensiveStats.safeties},
						${defensiveStats.quarterbackHits}, ${defensiveStats.tacklesForLoss},
						${defensiveStats.redZoneAttemptsAllowed}, ${defensiveStats.redZoneConversionsAllowed},
						${defensiveStats.redZoneTouchdownsAllowed}, ${defensiveStats.redZoneFieldGoalsAllowed},
						${defensiveStats.redZoneStopPercentage}, ${defensiveStats.redZoneScoringPercentageAllowed},
						${defensiveStats.goalToGoAttemptsAllowed}, ${defensiveStats.goalToGoConversionsAllowed},
						${defensiveStats.opponentPenalties}, ${defensiveStats.opponentPenaltyYards},
						${defensiveStats.opponentScoreQ1}, ${defensiveStats.opponentScoreQ2},
						${defensiveStats.opponentScoreQ3}, ${defensiveStats.opponentScoreQ4},
						'sportsdataio', NOW()
					)
					ON CONFLICT (season, season_type, week, team_abbreviation, game_key)
					DO UPDATE SET
						points_allowed = EXCLUDED.points_allowed,
						total_yards_allowed = EXCLUDED.total_yards_allowed,
						passing_yards_allowed = EXCLUDED.passing_yards_allowed,
						rushing_yards_allowed = EXCLUDED.rushing_yards_allowed,
						first_downs_allowed = EXCLUDED.first_downs_allowed,
						third_down_conversions_allowed = EXCLUDED.third_down_conversions_allowed,
						third_down_attempts_allowed = EXCLUDED.third_down_attempts_allowed,
						third_down_percentage_allowed = EXCLUDED.third_down_percentage_allowed,
						fourth_down_conversions_allowed = EXCLUDED.fourth_down_conversions_allowed,
						fourth_down_attempts_allowed = EXCLUDED.fourth_down_attempts_allowed,
						time_of_possession_allowed = EXCLUDED.time_of_possession_allowed,
						sacks = EXCLUDED.sacks,
						interceptions = EXCLUDED.interceptions,
						fumbles_forced = EXCLUDED.fumbles_forced,
						fumbles_recovered = EXCLUDED.fumbles_recovered,
						turnovers_forced = EXCLUDED.turnovers_forced,
						defensive_touchdowns = EXCLUDED.defensive_touchdowns,
						safeties = EXCLUDED.safeties,
						quarterback_hits = EXCLUDED.quarterback_hits,
						tackles_for_loss = EXCLUDED.tackles_for_loss,
						red_zone_attempts_allowed = EXCLUDED.red_zone_attempts_allowed,
						red_zone_conversions_allowed = EXCLUDED.red_zone_conversions_allowed,
						red_zone_touchdowns_allowed = EXCLUDED.red_zone_touchdowns_allowed,
						red_zone_field_goals_allowed = EXCLUDED.red_zone_field_goals_allowed,
						red_zone_stop_percentage = EXCLUDED.red_zone_stop_percentage,
						red_zone_scoring_percentage_allowed = EXCLUDED.red_zone_scoring_percentage_allowed,
						goal_to_go_attempts_allowed = EXCLUDED.goal_to_go_attempts_allowed,
						goal_to_go_conversions_allowed = EXCLUDED.goal_to_go_conversions_allowed,
						opponent_penalties = EXCLUDED.opponent_penalties,
						opponent_penalty_yards = EXCLUDED.opponent_penalty_yards,
						opponent_score_q1 = EXCLUDED.opponent_score_q1,
						opponent_score_q2 = EXCLUDED.opponent_score_q2,
						opponent_score_q3 = EXCLUDED.opponent_score_q3,
						opponent_score_q4 = EXCLUDED.opponent_score_q4,
						updated_at = NOW()
				`;

				// Check if it was an insert or update
				const existing = await db`
					SELECT id FROM nfl_defensive_stats 
					WHERE season = ${season} AND season_type = ${seasonType} 
					AND week = ${week} AND team_abbreviation = ${defensiveStats.teamAbbreviation}
					AND game_key = ${defensiveStats.gameKey}
				`;

				if (existing.length > 0) {
					updated++;
				} else {
					inserted++;
				}

			} catch (error) {
				console.error(`❌ Error processing ${teamStat.Team} vs ${teamStat.Opponent}:`, error.message);
				errors++;
			}
		}

		console.log(`\n✅ Sync complete!`);
		console.log(`   📥 Inserted: ${inserted}`);
		console.log(`   🔄 Updated: ${updated}`);
		if (errors > 0) {
			console.log(`   ⚠️  Errors: ${errors}`);
		}

	} catch (error) {
		console.error('❌ Error syncing defensive stats:', error);
		process.exit(1);
	}
}

// Get command line arguments
const args = process.argv.slice(2);
const season = args[0] ? parseInt(args[0]) : new Date().getFullYear();
const week = args[1] ? parseInt(args[1]) : null;
const seasonType = args[2] ? parseInt(args[2]) : 1; // 1=REG, 2=PRE, 3=POST

if (!week) {
	console.error('Usage: node sync-nfl-defensive-stats.js <season> <week> [seasonType]');
	console.error('Example: node sync-nfl-defensive-stats.js 2024 11 1');
	process.exit(1);
}

syncDefensiveStats(season, week, seasonType);

