import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { syncNCAAMatchups } from '$lib/services/ncaa-sync';

/**
 * API endpoint to trigger NCAA sync
 * This imports and calls the sync function directly, which works in serverless environments
 */
export const POST: RequestHandler = async () => {
	try {
		const result = await syncNCAAMatchups();

		return json({
			success: result.success,
			message: 'NCAA sync completed successfully',
			syncedCount: result.syncedCount,
			updatedCount: result.updatedCount,
			errorCount: result.errorCount,
			totalProcessed: result.totalProcessed,
			timestamp: new Date().toISOString()
		});
	} catch (error: any) {
		console.error('Error running NCAA sync:', error);
		
		// Extract error message
		let errorMessage = 'Failed to sync NCAA data';
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

