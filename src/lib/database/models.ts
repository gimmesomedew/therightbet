import { db, handleDatabaseError } from './connection.js';
import type { UUID } from 'crypto';

// Type definitions
export interface User {
	id: UUID;
	email: string;
	password_hash: string;
	first_name?: string;
	last_name?: string;
	created_at: Date;
	updated_at: Date;
	preferences: Record<string, any>;
	subscription_tier: string;
	is_active: boolean;
}

export interface Sport {
	id: UUID;
	name: string;
	code: string;
	is_active: boolean;
	created_at: Date;
}

export interface Team {
	id: UUID;
	sport_id: UUID;
	name: string;
	city?: string;
	abbreviation?: string;
	logo_url?: string;
	external_id?: string;
	created_at: Date;
	updated_at: Date;
}

export interface Player {
	id: UUID;
	team_id: UUID;
	first_name: string;
	last_name: string;
	position?: string;
	jersey_number?: number;
	height?: string;
	weight?: number;
	external_id?: string;
	created_at: Date;
	updated_at: Date;
}

export interface Game {
	id: UUID;
	sport_id: UUID;
	home_team_id: UUID;
	away_team_id: UUID;
	game_date: Date;
	status: string;
	home_score: number;
	away_score: number;
	quarter?: number;
	time_remaining?: string;
	external_id?: string;
	odds: Record<string, any>;
	created_at: Date;
	updated_at: Date;
}

export interface BettingHistory {
	id: UUID;
	user_id: UUID;
	game_id: UUID;
	bet_type: string;
	bet_selection: string;
	amount: number;
	odds: number;
	potential_payout?: number;
	result?: string;
	profit_loss?: number;
	placed_at: Date;
	settled_at?: Date;
	notes?: string;
}

// User model
export const UserModel = {
	async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
		try {
			const result = await db`
				INSERT INTO users (email, password_hash, first_name, last_name, preferences, subscription_tier, is_active)
				VALUES (${userData.email}, ${userData.password_hash}, ${userData.first_name || null}, ${userData.last_name || null}, ${JSON.stringify(userData.preferences)}, ${userData.subscription_tier}, ${userData.is_active})
				RETURNING *
			`;
			return result[0] as User;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async findByEmail(email: string): Promise<User | null> {
		try {
			const result = await db`
				SELECT * FROM users WHERE email = ${email} AND is_active = true
			`;
			return result[0] as User || null;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async findById(id: UUID): Promise<User | null> {
		try {
			const result = await db`
				SELECT * FROM users WHERE id = ${id} AND is_active = true
			`;
			return result[0] as User || null;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async update(id: UUID, updates: Partial<User>): Promise<User> {
		try {
			const result = await db`
				UPDATE users 
				SET email = COALESCE(${updates.email}, email),
				    first_name = COALESCE(${updates.first_name}, first_name),
				    last_name = COALESCE(${updates.last_name}, last_name),
				    preferences = COALESCE(${updates.preferences ? JSON.stringify(updates.preferences) : null}, preferences),
				    subscription_tier = COALESCE(${updates.subscription_tier}, subscription_tier),
				    is_active = COALESCE(${updates.is_active}, is_active)
				WHERE id = ${id}
				RETURNING *
			`;
			return result[0] as User;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	}
};

// Sport model
export const SportModel = {
	async findAll(): Promise<Sport[]> {
		try {
			const result = await db`
				SELECT * FROM sports WHERE is_active = true ORDER BY name
			`;
			return result as Sport[];
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async findByCode(code: string): Promise<Sport | null> {
		try {
			const result = await db`
				SELECT * FROM sports WHERE code = ${code} AND is_active = true
			`;
			return result[0] as Sport || null;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	}
};

// Team model
export const TeamModel = {
	async findBySport(sportId: UUID): Promise<Team[]> {
		try {
			const result = await db`
				SELECT * FROM teams WHERE sport_id = ${sportId} ORDER BY name
			`;
			return result as Team[];
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async findById(id: UUID): Promise<Team | null> {
		try {
			const result = await db`
				SELECT * FROM teams WHERE id = ${id}
			`;
			return result[0] as Team || null;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async findByExternalId(externalId: string): Promise<Team | null> {
		try {
			const result = await db`
				SELECT * FROM teams WHERE external_id = ${externalId}
			`;
			return result[0] as Team || null;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async create(teamData: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<Team> {
		try {
			const result = await db`
				INSERT INTO teams (sport_id, name, city, abbreviation, logo_url, external_id)
				VALUES (${teamData.sport_id}, ${teamData.name}, ${teamData.city || null}, ${teamData.abbreviation || null}, ${teamData.logo_url || null}, ${teamData.external_id || null})
				RETURNING *
			`;
			return result[0] as Team;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	}
};

// Game model
export const GameModel = {
	async findTodaysGames(sportId: UUID): Promise<Game[]> {
		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const result = await db`
				SELECT * FROM games 
				WHERE sport_id = ${sportId} 
				AND game_date >= ${today.toISOString()} 
				AND game_date < ${tomorrow.toISOString()}
				ORDER BY game_date
			`;
			return result as Game[];
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async findById(id: UUID): Promise<Game | null> {
		try {
			const result = await db`
				SELECT * FROM games WHERE id = ${id}
			`;
			return result[0] as Game || null;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async findByExternalId(externalId: string): Promise<Game | null> {
		try {
			const result = await db`
				SELECT * FROM games WHERE external_id = ${externalId}
			`;
			return result[0] as Game || null;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async create(gameData: Omit<Game, 'id' | 'created_at' | 'updated_at'>): Promise<Game> {
		try {
			const result = await db`
				INSERT INTO games (sport_id, home_team_id, away_team_id, game_date, status, home_score, away_score, quarter, time_remaining, external_id, odds)
				VALUES (${gameData.sport_id}, ${gameData.home_team_id}, ${gameData.away_team_id}, ${gameData.game_date.toISOString()}, ${gameData.status}, ${gameData.home_score}, ${gameData.away_score}, ${gameData.quarter || null}, ${gameData.time_remaining || null}, ${gameData.external_id || null}, ${JSON.stringify(gameData.odds)})
				RETURNING *
			`;
			return result[0] as Game;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async update(id: UUID, updates: Partial<Game>): Promise<Game> {
		try {
			const result = await db`
				UPDATE games 
				SET status = COALESCE(${updates.status}, status),
				    home_score = COALESCE(${updates.home_score}, home_score),
				    away_score = COALESCE(${updates.away_score}, away_score),
				    quarter = COALESCE(${updates.quarter}, quarter),
				    time_remaining = COALESCE(${updates.time_remaining}, time_remaining),
				    odds = COALESCE(${updates.odds ? JSON.stringify(updates.odds) : null}, odds)
				WHERE id = ${id}
				RETURNING *
			`;
			return result[0] as Game;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	}
};

// BettingHistory model
export const BettingHistoryModel = {
	async create(betData: Omit<BettingHistory, 'id' | 'placed_at'>): Promise<BettingHistory> {
		try {
			const result = await db`
				INSERT INTO betting_history (user_id, game_id, bet_type, bet_selection, amount, odds, potential_payout, result, profit_loss, settled_at, notes)
				VALUES (${betData.user_id}, ${betData.game_id}, ${betData.bet_type}, ${betData.bet_selection}, ${betData.amount}, ${betData.odds}, ${betData.potential_payout || null}, ${betData.result || null}, ${betData.profit_loss || null}, ${betData.settled_at ? betData.settled_at.toISOString() : null}, ${betData.notes || null})
				RETURNING *
			`;
			return result[0] as BettingHistory;
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async findByUser(userId: UUID, limit: number = 50): Promise<BettingHistory[]> {
		try {
			const result = await db`
				SELECT * FROM betting_history 
				WHERE user_id = ${userId} 
				ORDER BY placed_at DESC 
				LIMIT ${limit}
			`;
			return result as BettingHistory[];
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	},

	async getStats(userId: UUID): Promise<{
		totalBets: number;
		totalWins: number;
		totalLosses: number;
		winRate: number;
		totalProfitLoss: number;
	}> {
		try {
			const result = await db`
				SELECT 
					COUNT(*) as total_bets,
					COUNT(CASE WHEN result = 'win' THEN 1 END) as total_wins,
					COUNT(CASE WHEN result = 'loss' THEN 1 END) as total_losses,
					COALESCE(SUM(profit_loss), 0) as total_profit_loss
				FROM betting_history 
				WHERE user_id = ${userId} AND result IS NOT NULL
			`;
			
			const stats = result[0] as any;
			const winRate = stats.total_bets > 0 ? (stats.total_wins / stats.total_bets) * 100 : 0;
			
			return {
				totalBets: parseInt(stats.total_bets),
				totalWins: parseInt(stats.total_wins),
				totalLosses: parseInt(stats.total_losses),
				winRate: Math.round(winRate * 100) / 100,
				totalProfitLoss: parseFloat(stats.total_profit_loss)
			};
		} catch (error) {
			throw new Error(handleDatabaseError(error));
		}
	}
};
