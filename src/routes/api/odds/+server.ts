import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OddsAPIService } from '$lib/services/odds-api.js';
import { ODDS_API_KEY } from '$env/static/private';

/**
 * Get odds from The Odds API
 * Supports both NFL and NCAA Football
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		if (!ODDS_API_KEY) {
			return json({
				success: false,
				message: 'ODDS_API_KEY not configured'
			}, { status: 500 });
		}

		const sportKey = url.searchParams.get('sport') || 'americanfootball_nfl';
		const regions = url.searchParams.get('regions')?.split(',') || ['us'];
		const markets = url.searchParams.get('markets')?.split(',') || ['h2h', 'spreads', 'totals'];
		const oddsFormat = (url.searchParams.get('oddsFormat') || 'american') as 'american' | 'decimal';

		const oddsService = new OddsAPIService({
			apiKey: ODDS_API_KEY,
			regions,
			markets,
			oddsFormat
		});

		const events = await oddsService.getOdds(sportKey, regions, markets, oddsFormat);

		// Extract best odds for each event
		const eventsWithBestOdds = events.map(event => {
			const bestOdds = oddsService.extractBestOdds(event);
			return {
				...event,
				bestOdds
			};
		});

		return json({
			success: true,
			data: eventsWithBestOdds,
			count: eventsWithBestOdds.length
		});
	} catch (error: any) {
		console.error('Error fetching odds:', error);
		return json({
			success: false,
			message: error.message || 'Failed to fetch odds'
		}, { status: 500 });
	}
};

