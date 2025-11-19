import { env } from '$env/dynamic/private';

const SPORTSDATAIO_BASE_URL = 'https://api.sportsdata.io/v3/nfl';

export interface SportsDataIONFLTeamStats {
	// Game Info
	GameKey: string;
	SeasonType: number;
	Season: number;
	Week: number;
	Date: string;
	Team: string;
	Opponent: string;
	HomeOrAway: string;
	Score: number;
	OpponentScore: number;
	TotalYards: number;
	TouchdownsScored: number;
	
	// Offensive Stats
	PassingYards: number;
	RushingYards: number;
	FirstDowns: number;
	ThirdDownConversions: number;
	ThirdDownAttempts: number;
	FourthDownConversions: number;
	FourthDownAttempts: number;
	TimeOfPossession: string;
	
	// Defensive Stats (what we're interested in)
	OpponentTotalYards: number;
	OpponentPassingYards: number;
	OpponentRushingYards: number;
	OpponentFirstDowns: number;
	OpponentThirdDownConversions: number;
	OpponentThirdDownAttempts: number;
	OpponentFourthDownConversions: number;
	OpponentFourthDownAttempts: number;
	OpponentTimeOfPossession: string;
	Sacks: number;
	Interceptions: number;
	FumblesRecovered: number;
	FumblesForced: number;
	DefensiveTouchdowns: number;
	Safeties: number;
	Punts: number;
	PuntYards: number;
	PuntAverage: number;
	
	// Red Zone Stats
	RedZoneAttempts: number;
	RedZoneConversions: number;
	RedZonePercentage: number;
	OpponentRedZoneAttempts: number;
	OpponentRedZoneConversions: number;
	OpponentRedZonePercentage: number;
	
	// Scoring
	FieldGoalsMade: number;
	FieldGoalsAttempted: number;
	ExtraPointKickingConversions: number;
	ExtraPointKickingAttempts: number;
	TwoPointConversionPasses: number;
	TwoPointConversionRuns: number;
	TwoPointConversionReceptions: number;
	OpponentFieldGoalsMade: number;
	OpponentFieldGoalsAttempted: number;
	OpponentExtraPointKickingConversions: number;
	OpponentExtraPointKickingAttempts: number;
	OpponentTwoPointConversionPasses: number;
	OpponentTwoPointConversionRuns: number;
	OpponentTwoPointConversionReceptions: number;
	
	// Penalties
	Penalties: number;
	PenaltyYards: number;
	OpponentPenalties: number;
	OpponentPenaltyYards: number;
	
	// Turnovers
	Turnovers: number;
	OpponentTurnovers: number;
	
	// Points Allowed (defensive stat)
	PointsAllowed: number;
	PointsScored: number;
}

export interface NFLDefensiveStats {
	teamId: string;
	teamName: string;
	teamAbbreviation: string;
	season: number;
	week: number;
	seasonType: number;
	gameDate: string;
	opponent: string;
	homeOrAway: string;
	
	// General Defensive Stats
	pointsAllowed: number;
	totalYardsAllowed: number;
	passingYardsAllowed: number;
	rushingYardsAllowed: number;
	firstDownsAllowed: number;
	thirdDownConversionsAllowed: number;
	thirdDownAttemptsAllowed: number;
	thirdDownPercentageAllowed: number;
	timeOfPossessionAllowed: string;
	
	// Defensive Plays
	sacks: number;
	interceptions: number;
	fumblesForced: number;
	fumblesRecovered: number;
	turnoversForced: number;
	defensiveTouchdowns: number;
	safeties: number;
	
	// Red Zone Defense
	redZoneAttemptsAllowed: number;
	redZoneConversionsAllowed: number;
	redZoneTouchdownsAllowed: number;
	redZoneFieldGoalsAllowed: number;
	redZoneStopPercentage: number;
	redZoneScoringPercentageAllowed: number;
	
	// Penalties Against Opponent
	opponentPenalties: number;
	opponentPenaltyYards: number;
}

class SportsDataIONFLService {
	private apiKey: string;

	constructor() {
		const key = env.SPORTSDATAIO_API_KEY;
		if (!key) {
			throw new Error('SPORTSDATAIO_API_KEY environment variable is required');
		}
		this.apiKey = key;
	}

	private async makeRequest<T>(endpoint: string, retryCount = 0): Promise<T> {
		const url = `${SPORTSDATAIO_BASE_URL}${endpoint}?key=${this.apiKey}`;
		
		// Rate limiting: wait 1 second between requests
		if (retryCount === 0) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		} else {
			const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
		
		const response = await fetch(url);

		if (!response.ok) {
			if (response.status === 429 && retryCount < 3) {
				return this.makeRequest<T>(endpoint, retryCount + 1);
			}
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(`SportsDataIO API error: ${response.status} ${errorText}`);
		}

		return await response.json();
	}

	/**
	 * Get team game stats for a specific week
	 * Includes defensive statistics and red zone data
	 */
	async getTeamGameStats(season: number, week: number, seasonType: number = 1): Promise<SportsDataIONFLTeamStats[]> {
		const endpoint = `/stats/json/TeamGameStats/${season}/${week}`;
		return this.makeRequest<SportsDataIONFLTeamStats[]>(endpoint);
	}

	/**
	 * Get team game stats for a specific date
	 */
	async getTeamGameStatsByDate(date: string): Promise<SportsDataIONFLTeamStats[]> {
		const endpoint = `/stats/json/TeamGameStatsByDate/${date}`;
		return this.makeRequest<SportsDataIONFLTeamStats[]>(endpoint);
	}

	/**
	 * Get team season stats
	 */
	async getTeamSeasonStats(season: number, seasonType: number = 1): Promise<any[]> {
		const endpoint = `/stats/json/TeamSeasonStats/${season}`;
		return this.makeRequest<any[]>(endpoint);
	}

	/**
	 * Convert SportsDataIO team stats to our defensive stats format
	 */
	convertToDefensiveStats(teamStats: SportsDataIONFLTeamStats, teamId: string, teamName: string, teamAbbreviation: string): NFLDefensiveStats {
		// Calculate red zone stats
		const redZoneTouchdownsAllowed = teamStats.OpponentRedZoneConversions || 0;
		const redZoneFieldGoalsAllowed = (teamStats.OpponentRedZoneAttempts || 0) - (teamStats.OpponentRedZoneConversions || 0);
		const redZoneStopPercentage = teamStats.OpponentRedZoneAttempts > 0
			? ((teamStats.OpponentRedZoneAttempts - teamStats.OpponentRedZoneConversions) / teamStats.OpponentRedZoneAttempts) * 100
			: 0;
		const redZoneScoringPercentageAllowed = teamStats.OpponentRedZonePercentage || 0;

		// Calculate third down percentage
		const thirdDownPercentageAllowed = teamStats.OpponentThirdDownAttempts > 0
			? (teamStats.OpponentThirdDownConversions / teamStats.OpponentThirdDownAttempts) * 100
			: 0;

		// Calculate turnovers forced
		const turnoversForced = (teamStats.Interceptions || 0) + (teamStats.FumblesRecovered || 0);

		return {
			teamId,
			teamName,
			teamAbbreviation,
			season: teamStats.Season,
			week: teamStats.Week,
			seasonType: teamStats.SeasonType,
			gameDate: teamStats.Date,
			opponent: teamStats.Opponent,
			homeOrAway: teamStats.HomeOrAway,
			
			// General Defensive Stats
			pointsAllowed: teamStats.OpponentScore || 0,
			totalYardsAllowed: teamStats.OpponentTotalYards || 0,
			passingYardsAllowed: teamStats.OpponentPassingYards || 0,
			rushingYardsAllowed: teamStats.OpponentRushingYards || 0,
			firstDownsAllowed: teamStats.OpponentFirstDowns || 0,
			thirdDownConversionsAllowed: teamStats.OpponentThirdDownConversions || 0,
			thirdDownAttemptsAllowed: teamStats.OpponentThirdDownAttempts || 0,
			thirdDownPercentageAllowed,
			timeOfPossessionAllowed: teamStats.OpponentTimeOfPossession || '00:00',
			
			// Defensive Plays
			sacks: teamStats.Sacks || 0,
			interceptions: teamStats.Interceptions || 0,
			fumblesForced: teamStats.FumblesForced || 0,
			fumblesRecovered: teamStats.FumblesRecovered || 0,
			turnoversForced: turnoversForced,
			defensiveTouchdowns: teamStats.DefensiveTouchdowns || 0,
			safeties: teamStats.Safeties || 0,
			
			// Red Zone Defense
			redZoneAttemptsAllowed: teamStats.OpponentRedZoneAttempts || 0,
			redZoneConversionsAllowed: teamStats.OpponentRedZoneConversions || 0,
			redZoneTouchdownsAllowed: redZoneTouchdownsAllowed,
			redZoneFieldGoalsAllowed: redZoneFieldGoalsAllowed,
			redZoneStopPercentage,
			redZoneScoringPercentageAllowed,
			
			// Penalties Against Opponent
			opponentPenalties: teamStats.OpponentPenalties || 0,
			opponentPenaltyYards: teamStats.OpponentPenaltyYards || 0,
		};
	}
}

// Export singleton instance
export const sportsDataIONFL = new SportsDataIONFLService();

