-- THERiGHTBET Database Schema
-- PostgreSQL database schema for sports betting analytics platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true
);

-- Sports table
CREATE TABLE sports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport_id UUID REFERENCES sports(id),
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    abbreviation VARCHAR(10),
    logo_url VARCHAR(500),
    external_id VARCHAR(100), -- SportsRadar team ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(20),
    jersey_number INTEGER,
    height VARCHAR(10),
    weight INTEGER,
    external_id VARCHAR(100), -- SportsRadar player ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport_id UUID REFERENCES sports(id),
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    game_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, live, final, postponed, cancelled
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    quarter INTEGER,
    time_remaining VARCHAR(10),
    external_id VARCHAR(100), -- SportsRadar game ID
    odds JSONB DEFAULT '{}', -- Store betting odds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Betting history table
CREATE TABLE betting_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    game_id UUID REFERENCES games(id),
    bet_type VARCHAR(100) NOT NULL, -- spread, total, moneyline, prop
    bet_selection VARCHAR(200) NOT NULL, -- what they bet on
    amount DECIMAL(10,2) NOT NULL,
    odds DECIMAL(8,2) NOT NULL,
    potential_payout DECIMAL(10,2),
    result VARCHAR(20), -- win, loss, push, pending
    profit_loss DECIMAL(10,2),
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- User favorites table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- team, player, game
    target_id UUID NOT NULL, -- ID of the favorited item
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invites table
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id),
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics cache table
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(500) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_sport ON games(sport_id);
CREATE INDEX idx_betting_history_user ON betting_history(user_id);
CREATE INDEX idx_betting_history_game ON betting_history(game_id);
CREATE INDEX idx_betting_history_placed_at ON betting_history(placed_at);
CREATE INDEX idx_teams_sport ON teams(sport_id);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX idx_invites_code ON invites(invite_code);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_expires ON invites(expires_at);

-- Insert initial sports data
INSERT INTO sports (name, code) VALUES 
('Women''s National Basketball Association', 'WNBA'),
('National Football League', 'NFL'),
('Major League Baseball', 'MLB'),
('National Basketball Association', 'NBA');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- NFL Touchdown Data Tables

-- NFL weeks table - tracks which weeks have been synced
CREATE TABLE nfl_weeks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season INTEGER NOT NULL,
    season_type VARCHAR(10) NOT NULL, -- PRE, REG, POST
    week INTEGER NOT NULL,
    has_data BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season, season_type, week)
);

-- NFL team touchdowns - stores team-level touchdown data per week
CREATE TABLE nfl_team_touchdowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_id UUID REFERENCES nfl_weeks(id) ON DELETE CASCADE,
    season INTEGER NOT NULL,
    season_type VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    team_abbreviation VARCHAR(10) NOT NULL,
    team_display_name VARCHAR(100) NOT NULL,
    team_location VARCHAR(100),
    team_mascot VARCHAR(100),
    total_touchdowns INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season, season_type, week, team_abbreviation)
);

-- NFL player touchdowns - stores player-level touchdown breakdown per week
CREATE TABLE nfl_player_touchdowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_touchdown_id UUID REFERENCES nfl_team_touchdowns(id) ON DELETE CASCADE,
    week_id UUID REFERENCES nfl_weeks(id) ON DELETE CASCADE,
    season INTEGER NOT NULL,
    season_type VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    team_abbreviation VARCHAR(10) NOT NULL,
    player_id VARCHAR(100) NOT NULL,
    player_name VARCHAR(200) NOT NULL,
    position VARCHAR(10),
    rushing_touchdowns INTEGER DEFAULT 0,
    receiving_touchdowns INTEGER DEFAULT 0,
    passing_touchdowns INTEGER DEFAULT 0,
    return_touchdowns INTEGER DEFAULT 0,
    defensive_touchdowns INTEGER DEFAULT 0,
    total_touchdowns INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season, season_type, week, team_abbreviation, player_id)
);

-- Indexes for NFL touchdown tables
CREATE INDEX idx_nfl_weeks_season_type_week ON nfl_weeks(season, season_type, week);
CREATE INDEX idx_nfl_team_touchdowns_week ON nfl_team_touchdowns(week_id);
CREATE INDEX idx_nfl_team_touchdowns_season_week ON nfl_team_touchdowns(season, season_type, week);
CREATE INDEX idx_nfl_player_touchdowns_team ON nfl_player_touchdowns(team_touchdown_id);
CREATE INDEX idx_nfl_player_touchdowns_week ON nfl_player_touchdowns(week_id);
CREATE INDEX idx_nfl_player_touchdowns_season_week ON nfl_player_touchdowns(season, season_type, week);

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nfl_weeks_updated_at BEFORE UPDATE ON nfl_weeks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nfl_team_touchdowns_updated_at BEFORE UPDATE ON nfl_team_touchdowns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nfl_player_touchdowns_updated_at BEFORE UPDATE ON nfl_player_touchdowns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
