import { SPORTRADAR_API_KEY } from '$env/static/private';

if (!SPORTRADAR_API_KEY) {
	throw new Error('SPORTRADAR_API_KEY environment variable is required');
}

const BASE_URL = 'https://api.sportradar.com/wnba/trial/v8/en';

export interface SportsRadarConfig {
	apiKey: string;
	baseUrl: string;
}

export interface SportsRadarTeam {
	id: string;
	name: string;
	market: string;
	alias: string;
	conference: string;
	division: string;
	venue: {
		id: string;
		name: string;
		city: string;
		state: string;
		country: string;
		zip: string;
		address: string;
		capacity: number;
		surface: string;
		roof_type: string;
	};
}

export interface SportsRadarGame {
	id: string;
	status: string;
	coverage: string;
	scheduled: string;
	home_points?: number;
	away_points?: number;
	home: {
		id: string;
		name: string;
		market: string;
		alias: string;
		points?: number;
	};
	away: {
		id: string;
		name: string;
		market: string;
		alias: string;
		points?: number;
	};
	venue: {
		id: string;
		name: string;
		city: string;
		state: string;
		country: string;
	};
	overtime?: number;
	clock?: string;
	quarter?: number;
	attendance?: number;
	lead_changes?: number;
	times_tied?: number;
}

export interface SportsRadarGameSummary extends SportsRadarGame {
	scoring: {
		home: {
			points: number;
			quarters: number[];
		};
		away: {
			points: number;
			quarters: number[];
		};
	};
	statistics: {
		home: {
			players: SportsRadarPlayerStats[];
			totals: SportsRadarTeamStats;
		};
		away: {
			players: SportsRadarPlayerStats[];
			totals: SportsRadarTeamStats;
		};
	};
}

export interface SportsRadarPlayerStats {
	id: string;
	name: string;
	position: string;
	minutes: string;
	field_goals_made: number;
	field_goals_att: number;
	field_goals_pct: number;
	three_points_made: number;
	three_points_att: number;
	three_points_pct: number;
	free_throws_made: number;
	free_throws_att: number;
	free_throws_pct: number;
	rebounds: number;
	assists: number;
	steals: number;
	blocks: number;
	turnovers: number;
	personal_fouls: number;
	points: number;
	plus_minus: number;
}

export interface SportsRadarTeamStats {
	field_goals_made: number;
	field_goals_att: number;
	field_goals_pct: number;
	three_points_made: number;
	three_points_att: number;
	three_points_pct: number;
	free_throws_made: number;
	free_throws_att: number;
	free_throws_pct: number;
	rebounds: number;
	assists: number;
	steals: number;
	blocks: number;
	turnovers: number;
	personal_fouls: number;
	points: number;
}

class SportsRadarService {
	private apiKey: string;
	private baseUrl: string;

	constructor() {
		this.apiKey = SPORTRADAR_API_KEY;
		this.baseUrl = BASE_URL;
	}

	private async makeRequest<T>(endpoint: string): Promise<T> {
		const url = `${this.baseUrl}${endpoint}?api_key=${this.apiKey}`;
		
		try {
			const response = await fetch(url);
			
			if (!response.ok) {
				throw new Error(`SportsRadar API error: ${response.status} ${response.statusText}`);
			}
			
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('SportsRadar API request failed:', error);
			throw error;
		}
	}

	// Teams
	async getWNBATeams(): Promise<SportsRadarTeam[]> {
		const data = await this.makeRequest<any>('/league/hierarchy.json');
		
		// Extract teams from the hierarchy
		const teams: SportsRadarTeam[] = [];
		if (data.conferences) {
			data.conferences.forEach((conference: any) => {
				if (conference.teams) {
					teams.push(...conference.teams);
				}
			});
		}
		
		return teams;
	}

	async getWNBATeam(teamId: string): Promise<SportsRadarTeam> {
		return this.makeRequest<SportsRadarTeam>(`/teams/${teamId}/profile.json`);
	}

	// Games and Schedule
	async getWNBASchedule(season: number = new Date().getFullYear()): Promise<SportsRadarGame[]> {
		const data = await this.makeRequest<any>(`/games/${season}/REG/schedule.json`);
		return data.games || [];
	}

	async getWNBAGamesByDate(date: string): Promise<SportsRadarGame[]> {
		// Date format: YYYY-MM-DD
		return this.makeRequest<SportsRadarGame[]>(`/games/${date}/schedule.json`);
	}

	async getWNBAGame(gameId: string): Promise<SportsRadarGame> {
		return this.makeRequest<SportsRadarGame>(`/games/${gameId}/summary.json`);
	}

	async getWNBAGameSummary(gameId: string): Promise<SportsRadarGameSummary> {
		return this.makeRequest<SportsRadarGameSummary>(`/games/${gameId}/summary.json`);
	}

	// Head to Head data
	async getHeadToHeadGames(team1Id: string, team2Id: string, season?: number): Promise<SportsRadarGame[]> {
		const targetSeason = season || new Date().getFullYear();
		const schedule = await this.getWNBASchedule(targetSeason);
		
		// Filter games where both teams played each other
		const headToHeadGames = schedule.filter(game => 
			(game.home.id === team1Id && game.away.id === team2Id) ||
			(game.home.id === team2Id && game.away.id === team1Id)
		);
		
		return headToHeadGames;
	}

	async getHeadToHeadGamesForMultipleSeasons(team1Id: string, team2Id: string, seasons: number[] = []): Promise<SportsRadarGame[]> {
		const currentSeason = new Date().getFullYear();
		const targetSeasons = seasons.length > 0 ? seasons : [currentSeason, currentSeason - 1, currentSeason - 2];
		
		const allGames: SportsRadarGame[] = [];
		
		for (const season of targetSeasons) {
			try {
				const seasonGames = await this.getHeadToHeadGames(team1Id, team2Id, season);
				allGames.push(...seasonGames);
			} catch (error) {
				console.error(`Failed to get games for season ${season}:`, error);
			}
		}
		
		// Sort by date (most recent first)
		return allGames.sort((a, b) => new Date(b.scheduled).getTime() - new Date(a.scheduled).getTime());
	}

	// Utility methods
	formatDate(date: Date): string {
		return date.toISOString().split('T')[0]; // YYYY-MM-DD format
	}

	getTodayDate(): string {
		return this.formatDate(new Date());
	}

	getTomorrowDate(): string {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return this.formatDate(tomorrow);
	}

	// Convert SportsRadar data to our internal format
	convertGameToInternal(sportradarGame: SportsRadarGame): any {
		return {
			id: sportradarGame.id,
			homeTeam: {
				id: sportradarGame.home.id,
				name: sportradarGame.home.market ? `${sportradarGame.home.market} ${sportradarGame.home.name}` : sportradarGame.home.name,
				abbreviation: sportradarGame.home.alias,
				points: sportradarGame.home.points || 0
			},
			awayTeam: {
				id: sportradarGame.away.id,
				name: sportradarGame.away.market ? `${sportradarGame.away.market} ${sportradarGame.away.name}` : sportradarGame.away.name,
				abbreviation: sportradarGame.away.alias,
				points: sportradarGame.away.points || 0
			},
			gameTime: sportradarGame.scheduled,
			status: sportradarGame.status,
			venue: sportradarGame.venue?.name || 'TBD',
			location: sportradarGame.venue ? `${sportradarGame.venue.city}, ${sportradarGame.venue.state}` : 'TBD',
			homeScore: sportradarGame.home_points || 0,
			awayScore: sportradarGame.away_points || 0
		};
	}

	// Get team name with proper formatting
	getTeamName(team: any): string {
		return team.market ? `${team.market} ${team.name}` : team.name;
	}

	// Get WNBA standings for current season
	async getWNBAStandings(season: number = new Date().getFullYear()): Promise<any> {
		const endpoint = `/seasons/${season}/standings.json`;
		return await this.makeRequest<any>(endpoint);
	}
}

// Export singleton instance
export const sportsRadar = new SportsRadarService();

// Export types for use in other files
export type {
	SportsRadarTeam,
	SportsRadarGame,
	SportsRadarGameSummary,
	SportsRadarPlayerStats,
	SportsRadarTeamStats
};
