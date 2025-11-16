import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

// Create the database connection
export const db = neon(DATABASE_URL);

// Database connection test
export async function testConnection(): Promise<boolean> {
	try {
		const result = await db`SELECT 1 as test`;
		return result.length > 0;
	} catch (error) {
		console.error('Database connection failed:', error);
		return false;
	}
}

// Execute database schema setup
export async function setupDatabase(): Promise<void> {
	try {
		// Read and execute the schema file
		const schema = await import('./schema.sql?raw');
		await db`${schema.default}`;
		console.log('Database schema setup completed successfully');
	} catch (error) {
		console.error('Database schema setup failed:', error);
		throw error;
	}
}

// Utility function to handle database errors
export function handleDatabaseError(error: unknown): string {
	if (error instanceof Error) {
		// Log the full error for debugging
		console.error('Database error:', error);
		
		// Return user-friendly error messages
		if (error.message.includes('duplicate key')) {
			return 'This record already exists';
		}
		if (error.message.includes('foreign key')) {
			return 'Referenced record not found';
		}
		if (error.message.includes('not null')) {
			return 'Required field is missing';
		}
		if (error.message.includes('unique constraint')) {
			return 'This value is already taken';
		}
		
		return 'A database error occurred';
	}
	return 'An unknown error occurred';
}

// Transaction helper
export async function withTransaction<T>(
	callback: (db: typeof db) => Promise<T>
): Promise<T> {
	// Note: Neon serverless doesn't support traditional transactions
	// This is a placeholder for future implementation with connection pooling
	return await callback(db);
}

// Query builder helpers
export const queryHelpers = {
	// Pagination helper
	paginate: (page: number = 1, limit: number = 20) => ({
		offset: (page - 1) * limit,
		limit
	}),
	
	// Date range helper
	dateRange: (startDate: Date, endDate: Date) => ({
		start: startDate.toISOString(),
		end: endDate.toISOString()
	}),
	
	// Search helper
	search: (term: string, fields: string[]) => {
		const searchPattern = `%${term}%`;
		return fields.map(field => `${field} ILIKE ${searchPattern}`).join(' OR ');
	}
};
