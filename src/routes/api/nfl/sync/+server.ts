import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { syncNFLMatchups } from '$lib/services/nfl-sync';

/**
 * API endpoint to trigger NFL sync
 * This imports and calls the sync function directly, which works in serverless environments
 */
export const POST: RequestHandler = async () => {
	try {
		const result = await syncNFLMatchups();

		return json({
			success: result.success,
			message: result.success 
				? `NFL sync completed successfully for Week ${result.week}` 
				: result.message || 'NFL sync completed with warnings',
			syncedCount: result.syncedCount,
			updatedCount: result.updatedCount,
			errorCount: result.errorCount,
			totalProcessed: result.totalProcessed,
			week: result.week,
			timestamp: new Date().toISOString()
		});
	} catch (error: any) {
		console.error('Error running NFL sync:', error);
		
		// Extract error message
		let errorMessage = 'Failed to sync NFL data';
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

