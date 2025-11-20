import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { syncNBAMatchups } from '$lib/services/nba-sync';

/**
 * API endpoint to trigger NBA sync
 * This imports and calls the sync function directly, which works in serverless environments
 */
export const POST: RequestHandler = async () => {
	try {
		const result = await syncNBAMatchups();

		return json({
			success: result.success,
			message: 'NBA sync completed successfully',
			syncedCount: result.syncedCount,
			updatedCount: result.updatedCount,
			errorCount: result.errorCount,
			totalProcessed: result.totalProcessed,
			timestamp: new Date().toISOString()
		});
	} catch (error: any) {
		console.error('Error running NBA sync:', error);
		
		// Extract error message
		let errorMessage = 'Failed to sync NBA data';
		if (error.message) {
			errorMessage = error.message;
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

