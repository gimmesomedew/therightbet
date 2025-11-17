/**
 * The Odds API Service
 * Documentation: https://the-odds-api.com/liveapi/guides/v4/#overview
 */

export interface OddsAPISport {
	key: string;
	group: string;
	title: string;
	description: string;
	active: boolean;
	has_outrights: boolean;
}

export interface OddsAPIBookmaker {
	key: string;
	title: string;
	last_update: string;
	markets: OddsAPIMarket[];
}

export interface OddsAPIMarket {
	key: string;
	last_update: string;
	outcomes: OddsAPIOutcome[];
}

export interface OddsAPIOutcome {
	name: string;
	price: number;
	point?: number;
	description?: string;
}

export interface OddsAPIEvent {
	id: string;
	sport_key: string;
	sport_title: string;
	commence_time: string;
	home_team: string;
	away_team: string;
	bookmakers: OddsAPIBookmaker[];
}

export interface OddsAPIConfig {
	apiKey: string;
	baseUrl?: string;
	regions?: string[];
	markets?: string[];
	oddsFormat?: 'american' | 'decimal';
}

export class OddsAPIService {
	private apiKey: string;
	private baseUrl: string;
	private defaultRegions: string[];
	private defaultMarkets: string[];
	private defaultOddsFormat: 'american' | 'decimal';

	constructor(config: OddsAPIConfig) {
		this.apiKey = config.apiKey;
		this.baseUrl = config.baseUrl || 'https://api.the-odds-api.com';
		this.defaultRegions = config.regions || ['us'];
		this.defaultMarkets = config.markets || ['h2h', 'spreads', 'totals'];
		this.defaultOddsFormat = config.oddsFormat || 'american';
	}

	/**
	 * Get list of available sports
	 * This endpoint does not count against usage quota
	 */
	async getSports(all: boolean = false): Promise<OddsAPISport[]> {
		const url = `${this.baseUrl}/v4/sports/?apiKey=${this.apiKey}${all ? '&all=true' : ''}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Get odds for a specific sport
	 * @param sportKey - Sport key (e.g., 'americanfootball_nfl', 'americanfootball_ncaaf')
	 * @param regions - Regions to fetch odds from (default: ['us'])
	 * @param markets - Markets to fetch (default: ['h2h', 'spreads', 'totals'])
	 * @param oddsFormat - Format for odds (default: 'american')
	 */
	async getOdds(
		sportKey: string,
		regions: string[] = this.defaultRegions,
		markets: string[] = this.defaultMarkets,
		oddsFormat: 'american' | 'decimal' = this.defaultOddsFormat
	): Promise<OddsAPIEvent[]> {
		const regionsParam = regions.join(',');
		const marketsParam = markets.join(',');
		const url = `${this.baseUrl}/v4/sports/${sportKey}/odds?regions=${regionsParam}&markets=${marketsParam}&oddsFormat=${oddsFormat}&apiKey=${this.apiKey}`;

		const response = await fetch(url);

		if (!response.ok) {
			if (response.status === 429) {
				throw new Error('Rate limit exceeded. Please wait before retrying.');
			}
			throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
		}

		// Check rate limit headers
		const requestsRemaining = response.headers.get('x-requests-remaining');
		const requestsUsed = response.headers.get('x-requests-used');
		
		if (requestsRemaining) {
			console.log(`Odds API: ${requestsRemaining} requests remaining`);
		}

		return await response.json();
	}

	/**
	 * Get odds for a specific event
	 * @param sportKey - Sport key
	 * @param eventId - Event ID
	 * @param regions - Regions to fetch odds from
	 * @param markets - Markets to fetch
	 * @param oddsFormat - Format for odds
	 */
	async getEventOdds(
		sportKey: string,
		eventId: string,
		regions: string[] = this.defaultRegions,
		markets: string[] = this.defaultMarkets,
		oddsFormat: 'american' | 'decimal' = this.defaultOddsFormat
	): Promise<OddsAPIEvent> {
		const regionsParam = regions.join(',');
		const marketsParam = markets.join(',');
		const url = `${this.baseUrl}/v4/sports/${sportKey}/events/${eventId}/odds?regions=${regionsParam}&markets=${marketsParam}&oddsFormat=${oddsFormat}&apiKey=${this.apiKey}`;

		const response = await fetch(url);

		if (!response.ok) {
			if (response.status === 429) {
				throw new Error('Rate limit exceeded. Please wait before retrying.');
			}
			throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Extract best odds from multiple bookmakers
	 * Returns the best spread, total, and moneyline odds
	 */
	extractBestOdds(event: OddsAPIEvent): {
		spread: { line: number | null; homeOdds: number | null; awayOdds: number | null };
		total: { line: number | null; overOdds: number | null; underOdds: number | null };
		moneyline: { home: number | null; away: number | null };
	} {
		const result = {
			spread: { line: null as number | null, homeOdds: null as number | null, awayOdds: null as number | null },
			total: { line: null as number | null, overOdds: null as number | null, underOdds: null as number | null },
			moneyline: { home: null as number | null, away: null as number | null }
		};

		// Find best odds across all bookmakers
		for (const bookmaker of event.bookmakers) {
			for (const market of bookmaker.markets) {
				if (market.key === 'spreads') {
					for (const outcome of market.outcomes) {
						if (outcome.point !== undefined) {
							if (result.spread.line === null || Math.abs(outcome.point) < Math.abs(result.spread.line)) {
								result.spread.line = outcome.point;
							}
							// Get odds for home/away teams
							if (outcome.name === event.home_team) {
								if (result.spread.homeOdds === null || outcome.price > result.spread.homeOdds) {
									result.spread.homeOdds = outcome.price;
								}
							} else if (outcome.name === event.away_team) {
								if (result.spread.awayOdds === null || outcome.price > result.spread.awayOdds) {
									result.spread.awayOdds = outcome.price;
								}
							}
						}
					}
				} else if (market.key === 'totals') {
					for (const outcome of market.outcomes) {
						if (outcome.point !== undefined) {
							if (result.total.line === null) {
								result.total.line = outcome.point;
							}
							if (outcome.name === 'Over') {
								if (result.total.overOdds === null || outcome.price > result.total.overOdds) {
									result.total.overOdds = outcome.price;
								}
							} else if (outcome.name === 'Under') {
								if (result.total.underOdds === null || outcome.price > result.total.underOdds) {
									result.total.underOdds = outcome.price;
								}
							}
						}
					}
				} else if (market.key === 'h2h') {
					for (const outcome of market.outcomes) {
						if (outcome.name === event.home_team) {
							if (result.moneyline.home === null || outcome.price > result.moneyline.home) {
								result.moneyline.home = outcome.price;
							}
						} else if (outcome.name === event.away_team) {
							if (result.moneyline.away === null || outcome.price > result.moneyline.away) {
								result.moneyline.away = outcome.price;
							}
						}
					}
				}
			}
		}

		return result;
	}
}

