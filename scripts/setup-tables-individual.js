import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

async function setupTablesIndividually() {
	console.log('🔗 Connecting to database...');
	
	try {
		const db = neon(DATABASE_URL);
		
		// Test connection
		await db`SELECT 1 as test`;
		console.log('✅ Database connection successful');
		
		console.log('📋 Setting up database tables individually...');
		
		// Enable UUID extension
		console.log('🔧 Enabling UUID extension...');
		await db`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
		console.log('✅ UUID extension enabled');
		
		// Create users table
		console.log('👥 Creating users table...');
		await db`
			CREATE TABLE IF NOT EXISTS users (
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
			)
		`;
		console.log('✅ Users table created');
		
		// Create sports table
		console.log('🏀 Creating sports table...');
		await db`
			CREATE TABLE IF NOT EXISTS sports (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				name VARCHAR(100) NOT NULL,
				code VARCHAR(10) UNIQUE NOT NULL,
				is_active BOOLEAN DEFAULT true,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)
		`;
		console.log('✅ Sports table created');
		
		// Create teams table
		console.log('🏈 Creating teams table...');
		await db`
			CREATE TABLE IF NOT EXISTS teams (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				sport_id UUID REFERENCES sports(id),
				name VARCHAR(100) NOT NULL,
				city VARCHAR(100),
				abbreviation VARCHAR(10),
				logo_url VARCHAR(500),
				external_id VARCHAR(100),
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)
		`;
		console.log('✅ Teams table created');
		
		// Create players table
		console.log('👤 Creating players table...');
		await db`
			CREATE TABLE IF NOT EXISTS players (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				team_id UUID REFERENCES teams(id),
				first_name VARCHAR(100) NOT NULL,
				last_name VARCHAR(100) NOT NULL,
				position VARCHAR(20),
				jersey_number INTEGER,
				height VARCHAR(10),
				weight INTEGER,
				external_id VARCHAR(100),
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)
		`;
		console.log('✅ Players table created');
		
		// Create games table
		console.log('🎮 Creating games table...');
		await db`
			CREATE TABLE IF NOT EXISTS games (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				sport_id UUID REFERENCES sports(id),
				home_team_id UUID REFERENCES teams(id),
				away_team_id UUID REFERENCES teams(id),
				game_date TIMESTAMP WITH TIME ZONE NOT NULL,
				status VARCHAR(50) DEFAULT 'scheduled',
				home_score INTEGER DEFAULT 0,
				away_score INTEGER DEFAULT 0,
				quarter INTEGER,
				time_remaining VARCHAR(10),
				external_id VARCHAR(100),
				odds JSONB DEFAULT '{}',
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)
		`;
		console.log('✅ Games table created');
		
		// Create betting_history table
		console.log('💰 Creating betting_history table...');
		await db`
			CREATE TABLE IF NOT EXISTS betting_history (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				user_id UUID REFERENCES users(id),
				game_id UUID REFERENCES games(id),
				bet_type VARCHAR(100) NOT NULL,
				bet_selection VARCHAR(200) NOT NULL,
				amount DECIMAL(10,2) NOT NULL,
				odds DECIMAL(8,2) NOT NULL,
				potential_payout DECIMAL(10,2),
				result VARCHAR(20),
				profit_loss DECIMAL(10,2),
				placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				settled_at TIMESTAMP WITH TIME ZONE,
				notes TEXT
			)
		`;
		console.log('✅ Betting_history table created');
		
		// Create user_favorites table
		console.log('⭐ Creating user_favorites table...');
		await db`
			CREATE TABLE IF NOT EXISTS user_favorites (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				user_id UUID REFERENCES users(id),
				type VARCHAR(50) NOT NULL,
				target_id UUID NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)
		`;
		console.log('✅ User_favorites table created');
		
		// Create analytics_cache table
		console.log('📊 Creating analytics_cache table...');
		await db`
			CREATE TABLE IF NOT EXISTS analytics_cache (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				cache_key VARCHAR(500) UNIQUE NOT NULL,
				data JSONB NOT NULL,
				expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)
		`;
		console.log('✅ Analytics_cache table created');
		
		// Insert initial sports data
		console.log('🏀 Inserting initial sports data...');
		await db`
			INSERT INTO sports (name, code) VALUES 
			('Women''s National Basketball Association', 'WNBA'),
			('National Football League', 'NFL'),
			('Major League Baseball', 'MLB'),
			('National Basketball Association', 'NBA')
			ON CONFLICT (code) DO NOTHING
		`;
		console.log('✅ Initial sports data inserted');
		
		console.log('\n🎉 All tables created successfully!');
		console.log('✅ THERiGHTBET database is ready!');
		
	} catch (error) {
		console.error('❌ Database setup failed:', error.message);
		console.error('Full error:', error);
		process.exit(1);
	}
}

setupTablesIndividually();
