import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
	const DATABASE_URL = process.env.DATABASE_URL;
	
	if (!DATABASE_URL) {
		console.error('❌ DATABASE_URL environment variable is required');
		console.log('Please set DATABASE_URL in your .env file');
		process.exit(1);
	}

	console.log('🔗 Connecting to database...');
	
	try {
		const db = neon(DATABASE_URL);
		
		// Test connection
		await db`SELECT 1 as test`;
		console.log('✅ Database connection successful');
		
		// Read schema file
		const schemaPath = join(__dirname, '../src/lib/database/schema.sql');
		const schema = readFileSync(schemaPath, 'utf8');
		
		console.log('📋 Setting up database schema...');
		
		// Execute the entire schema as one transaction
		console.log('📝 Executing database schema...');
		
		// Remove comments and clean up the schema
		const cleanSchema = schema
			.split('\n')
			.filter(line => !line.trim().startsWith('--'))
			.join('\n')
			.replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
			.trim();
		
		// Execute the schema
		await db.unsafe(cleanSchema);
		console.log('✅ Database schema executed successfully');
		
		console.log('✅ Database schema setup completed successfully');
		console.log('🎉 THERiGHTBET database is ready!');
		
	} catch (error) {
		console.error('❌ Database setup failed:', error.message);
		process.exit(1);
	}
}

setupDatabase();
