import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from '$env/dynamic/private';

const execAsync = promisify(exec);

/**
 * API endpoint to trigger NBA sync script
 * This runs the sync-nba-matchups.js script to fetch and sync NBA games
 * 
 * Note: In serverless environments, this may need to be adjusted to import
 * the sync function directly instead of using exec
 */
export const POST: RequestHandler = async () => {
	try {
		// Check if we're in a serverless environment
		// In serverless, we might need to import the function directly
		// For now, try exec first
		
		// Use node directly to run the script
		const scriptPath = 'scripts/sync-nba-matchups.js';
		const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
			cwd: process.cwd(),
			timeout: 300000, // 5 minute timeout
			maxBuffer: 10 * 1024 * 1024, // 10MB buffer for output
			env: {
				...process.env,
				// Ensure environment variables are available
				DATABASE_URL: env.DATABASE_URL || process.env.DATABASE_URL,
				ODDS_API_KEY: env.ODDS_API_KEY || process.env.ODDS_API_KEY
			}
		});

		// Check if there were any errors in stderr
		if (stderr && !stderr.includes('warning') && !stderr.includes('injecting env')) {
			console.error('Sync script stderr:', stderr);
		}

		return json({
			success: true,
			message: 'NBA sync completed successfully',
			output: stdout.substring(0, 1000), // Limit output size
			timestamp: new Date().toISOString()
		});
	} catch (error: any) {
		console.error('Error running NBA sync:', error);
		
		// Extract error message
		let errorMessage = 'Failed to sync NBA data';
		if (error.message) {
			errorMessage = error.message;
		}
		if (error.stderr) {
			errorMessage += `: ${error.stderr.substring(0, 500)}`;
		}

		return json(
			{
				success: false,
				message: errorMessage,
				error: error.message || 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

