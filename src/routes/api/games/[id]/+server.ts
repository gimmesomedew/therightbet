import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const gameId = params.id;

		// For now, return mock data based on game ID
		// TODO: Replace with real database query when games table is populated
		const mockGames = {
			'a2a9accd-4d63-4b09-bf13-6b83d3155c52': {
				id: 'a2a9accd-4d63-4b09-bf13-6b83d3155c52',
				homeTeam: {
					id: 'b966861c-d2e7-4700-8b32-6948a8c32f5e',
					name: 'Atlanta Dream',
					abbreviation: 'ATL',
					logo: '/logos/atl.png',
					record: '26-14',
					lastFive: '3-2',
					color: '#e67e22'
				},
				awayTeam: {
					id: 'abdb4937-82d3-4934-b59f-8b82b7246487',
					name: 'Los Angeles Sparks',
					abbreviation: 'LA',
					logo: '/logos/la.png',
					record: '19-20',
					lastFive: '2-3',
					color: '#3498db'
				},
				gameTime: '2024-12-15T19:30:00Z',
				status: 'upcoming',
				venue: 'Gateway Center Arena',
				location: 'Atlanta, GA',
				bettingLines: {
					spread: {
						home: '+8.5 -110',
						away: '-8.5 -110'
					},
					total: {
						over: 'Over 162.5 -110',
						under: 'Under 162.5 -110'
					},
					moneyline: {
						home: '+280',
						away: '-340'
					}
				},
				teamStats: {
					home: {
						pointsPerGame: 78.2,
						fieldGoalPct: 43.2,
						reboundsPerGame: 32.1,
						assistsPerGame: 19.8
					},
					away: {
						pointsPerGame: 84.7,
						fieldGoalPct: 46.8,
						reboundsPerGame: 35.4,
						assistsPerGame: 22.1
					}
				},
				headToHead: {
					allTimeSeries: '12-8',
					seriesLeader: 'Phoenix leads series',
					lastFiveMeetings: [
						{ date: 'Aug 15, 2025', score: 'CONN 89 - 82 PHX', result: 'Connecticut Win' },
						{ date: 'Jul 22, 2025', score: 'PHX 76 - 84 CONN', result: 'Connecticut Win' },
						{ date: 'Jun 8, 2025', score: 'CONN 78 - 91 PHX', result: 'Connecticut Loss' },
						{ date: 'May 18, 2025', score: 'PHX 85 - 88 CONN', result: 'Connecticut Win' },
						{ date: 'Apr 25, 2025', score: 'CONN 92 - 87 PHX', result: 'Connecticut Win' }
					],
					bettingTrends: {
						ats: '3-2 Connecticut ATS',
						overUnder: '4-1 Over Total',
						avgTotal: '168.2 Avg Total Points'
					}
				},
				aiInsights: {
					keyMatchup: {
						title: 'Connecticut\'s strong offensive rebounding (12.3 per game) vs Atlanta\'s weak defensive rebounding (28.1 per game) creates a significant advantage for the Sun.',
						confidence: 87
					},
					valueBet: {
						title: 'Atlanta has covered the spread in 4 of their last 6 games as heavy underdogs (+7 or more). The +8.5 line offers value.',
						expectedValue: 12
					}
				},
				injuries: {
					home: [
						{ player: 'Kia Vaughn', position: 'Center', status: 'OUT' },
						{ player: 'Sophie Cunningham', position: 'Guard', status: 'QUESTIONABLE' }
					],
					away: [
						{ player: 'All Players', position: '', status: 'HEALTHY' }
					]
				},
				playerProps: {
					home: [
						{
							name: 'Diana Taurasi',
							position: 'Guard',
							number: '#3',
							props: [
								{ type: 'Points', line: 16.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Assists', line: 5.5, overOdds: '-110', underOdds: '-110' },
								{ type: '3-Pointers Made', line: 2.5, overOdds: '-110', underOdds: '-110' }
							]
						},
						{
							name: 'Kahleah Copper',
							position: 'Forward',
							number: '#12',
							props: [
								{ type: 'Points', line: 18.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 6.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Steals', line: 1.5, overOdds: '-110', underOdds: '-110' }
							]
						}
					],
					away: [
						{
							name: 'Alyssa Thomas',
							position: 'Forward',
							number: '#25',
							props: [
								{ type: 'Points', line: 14.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 9.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Assists', line: 7.5, overOdds: '-110', underOdds: '-110' }
							]
						},
						{
							name: 'DeWanna Bonner',
							position: 'Forward',
							number: '#24',
							props: [
								{ type: 'Points', line: 15.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 7.5, overOdds: '-110', underOdds: '-110' },
								{ type: '3-Pointers Made', line: 2.5, overOdds: '-110', underOdds: '-110' }
							]
						}
					]
				}
			},
			'a09064ea-3cfb-450c-b74c-deff8357aca0': {
				id: 'a09064ea-3cfb-450c-b74c-deff8357aca0',
				homeTeam: {
					id: '5ec4d00c-1825-491d-ae84-33911d2c5669',
					name: 'Chicago Sky',
					abbreviation: 'CHI',
					logo: '/logos/chicago-sky.png',
					record: '15-15',
					lastFive: '3-2',
					color: '#1e40af'
				},
				awayTeam: {
					id: 'fa6cf974-906a-47fb-9832-a6c01cf53ead',
					name: 'Connecticut Sun',
					abbreviation: 'CONN',
					logo: '/logos/connecticut-sun.png',
					record: '22-8',
					lastFive: '4-1',
					color: '#3498db'
				},
				gameTime: '2024-12-15T20:00:00Z',
				status: 'upcoming',
				venue: 'Wintrust Arena',
				location: 'Chicago, IL',
				bettingLines: {
					spread: {
						home: '+6.5 -110',
						away: '-6.5 -110'
					},
					total: {
						over: 'Over 165.5 -110',
						under: 'Under 165.5 -110'
					},
					moneyline: {
						home: '+220',
						away: '-270'
					}
				},
				teamStats: {
					home: {
						pointsPerGame: 79.8,
						fieldGoalPct: 44.1,
						reboundsPerGame: 33.2,
						assistsPerGame: 20.3
					},
					away: {
						pointsPerGame: 84.7,
						fieldGoalPct: 46.8,
						reboundsPerGame: 35.4,
						assistsPerGame: 22.1
					}
				},
				headToHead: {
					allTimeSeries: '8-12',
					seriesLeader: 'Connecticut leads series',
					lastFiveMeetings: [
						{ date: 'Aug 20, 2025', score: 'CHI 82 - 89 CONN', result: 'Connecticut Win' },
						{ date: 'Jul 15, 2025', score: 'CONN 76 - 84 CHI', result: 'Chicago Win' },
						{ date: 'Jun 10, 2025', score: 'CHI 78 - 91 CONN', result: 'Connecticut Win' },
						{ date: 'May 25, 2025', score: 'CONN 85 - 88 CHI', result: 'Chicago Win' },
						{ date: 'Apr 30, 2025', score: 'CHI 92 - 87 CONN', result: 'Chicago Win' }
					],
					bettingTrends: {
						ats: '3-2 Chicago ATS',
						overUnder: '3-2 Over Total',
						avgTotal: '166.8 Avg Total Points'
					}
				},
				aiInsights: {
					keyMatchup: {
						title: 'Chicago\'s strong home court advantage (12-3 at Wintrust Arena) vs Connecticut\'s excellent road record (11-4 away) creates an interesting matchup.',
						confidence: 78
					},
					valueBet: {
						title: 'Chicago has covered the spread in 7 of their last 10 home games as underdogs. The +6.5 line offers good value.',
						expectedValue: 15
					}
				},
				injuries: {
					home: [
						{ player: 'All Players', position: '', status: 'HEALTHY' }
					],
					away: [
						{ player: 'All Players', position: '', status: 'HEALTHY' }
					]
				},
				playerProps: {
					home: [
						{
							name: 'Marina Mabrey',
							position: 'Guard',
							number: '#4',
							props: [
								{ type: 'Points', line: 14.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Assists', line: 4.5, overOdds: '-110', underOdds: '-110' },
								{ type: '3-Pointers Made', line: 2.5, overOdds: '-110', underOdds: '-110' }
							]
						},
						{
							name: 'Kamilla Cardoso',
							position: 'Center',
							number: '#10',
							props: [
								{ type: 'Points', line: 12.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 8.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Blocks', line: 1.5, overOdds: '-110', underOdds: '-110' }
							]
						}
					],
					away: [
						{
							name: 'Alyssa Thomas',
							position: 'Forward',
							number: '#25',
							props: [
								{ type: 'Points', line: 14.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 9.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Assists', line: 7.5, overOdds: '-110', underOdds: '-110' }
							]
						},
						{
							name: 'DeWanna Bonner',
							position: 'Forward',
							number: '#24',
							props: [
								{ type: 'Points', line: 15.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 7.5, overOdds: '-110', underOdds: '-110' },
								{ type: '3-Pointers Made', line: 2.5, overOdds: '-110', underOdds: '-110' }
							]
						}
					]
				}
			},
			'game-001': {
				id: 'game-001',
				homeTeam: {
					id: '11',
					name: 'Phoenix Mercury',
					abbreviation: 'PHX',
					logo: '/logos/phoenix-mercury.png',
					record: '12-18',
					lastFive: '2-3',
					color: '#e67e22'
				},
				awayTeam: {
					id: '3',
					name: 'Connecticut Sun',
					abbreviation: 'CONN',
					logo: '/logos/connecticut-sun.png',
					record: '22-8',
					lastFive: '4-1',
					color: '#3498db'
				},
				gameTime: '2025-09-15T23:00:00Z',
				status: 'upcoming',
				venue: 'Footprint Center',
				location: 'Phoenix, AZ',
				bettingLines: {
					spread: {
						home: '+8.5 -110',
						away: '-8.5 -110'
					},
					total: {
						over: 'Over 162.5 -110',
						under: 'Under 162.5 -110'
					},
					moneyline: {
						home: '+280',
						away: '-340'
					}
				},
				teamStats: {
					home: {
						pointsPerGame: 78.2,
						fieldGoalPct: 43.2,
						reboundsPerGame: 32.1,
						assistsPerGame: 19.8
					},
					away: {
						pointsPerGame: 84.7,
						fieldGoalPct: 46.8,
						reboundsPerGame: 35.4,
						assistsPerGame: 22.1
					}
				},
				headToHead: {
					allTimeSeries: '12-8',
					seriesLeader: 'Phoenix leads series',
					lastFiveMeetings: [
						{ date: 'Aug 15, 2025', score: 'CONN 89 - 82 PHX', result: 'Connecticut Win' },
						{ date: 'Jul 22, 2025', score: 'PHX 76 - 84 CONN', result: 'Connecticut Win' },
						{ date: 'Jun 8, 2025', score: 'CONN 78 - 91 PHX', result: 'Connecticut Loss' },
						{ date: 'May 18, 2025', score: 'PHX 85 - 88 CONN', result: 'Connecticut Win' },
						{ date: 'Apr 25, 2025', score: 'CONN 92 - 87 PHX', result: 'Connecticut Win' }
					],
					bettingTrends: {
						ats: '3-2 Connecticut ATS',
						overUnder: '4-1 Over Total',
						avgTotal: '168.2 Avg Total Points'
					}
				},
				aiInsights: {
					keyMatchup: {
						title: 'Connecticut\'s strong offensive rebounding (12.3 per game) vs Atlanta\'s weak defensive rebounding (28.1 per game) creates a significant advantage for the Sun.',
						confidence: 87
					},
					valueBet: {
						title: 'Atlanta has covered the spread in 4 of their last 6 games as heavy underdogs (+7 or more). The +8.5 line offers value.',
						expectedValue: 12
					}
				},
				injuries: {
					home: [
						{ player: 'Kia Vaughn', position: 'Center', status: 'OUT' },
						{ player: 'Sophie Cunningham', position: 'Guard', status: 'QUESTIONABLE' }
					],
					away: [
						{ player: 'All Players', position: '', status: 'HEALTHY' }
					]
				},
				playerProps: {
					home: [
						{
							name: 'Diana Taurasi',
							position: 'Guard',
							number: '#3',
							props: [
								{ type: 'Points', line: 16.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Assists', line: 5.5, overOdds: '-110', underOdds: '-110' },
								{ type: '3-Pointers Made', line: 2.5, overOdds: '-110', underOdds: '-110' }
							]
						},
						{
							name: 'Kahleah Copper',
							position: 'Forward',
							number: '#12',
							props: [
								{ type: 'Points', line: 18.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 6.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Steals', line: 1.5, overOdds: '-110', underOdds: '-110' }
							]
						}
					],
					away: [
						{
							name: 'Alyssa Thomas',
							position: 'Forward',
							number: '#25',
							props: [
								{ type: 'Points', line: 14.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 9.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Assists', line: 7.5, overOdds: '-110', underOdds: '-110' }
							]
						},
						{
							name: 'DeWanna Bonner',
							position: 'Forward',
							number: '#24',
							props: [
								{ type: 'Points', line: 15.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 7.5, overOdds: '-110', underOdds: '-110' },
								{ type: '3-Pointers Made', line: 2.5, overOdds: '-110', underOdds: '-110' }
							]
						}
					]
				}
			},
			'game-002': {
				id: 'game-002',
				homeTeam: {
					id: '1',
					name: 'Las Vegas Aces',
					abbreviation: 'LV',
					logo: '/logos/las-vegas-aces.png',
					record: '28-8',
					lastFive: '3-2',
					color: '#8b5cf6'
				},
				awayTeam: {
					id: '2',
					name: 'Seattle Storm',
					abbreviation: 'SEA',
					logo: '/logos/seattle-storm.png',
					record: '22-14',
					lastFive: '2-3',
					color: '#06b6d4'
				},
				gameTime: '2024-07-15T20:00:00Z',
				status: 'live',
				venue: 'Michelob ULTRA Arena',
				location: 'Las Vegas, NV',
				bettingLines: {
					spread: {
						home: '-4.5 -110',
						away: '+4.5 -110'
					},
					total: {
						over: 'Over 168.5 -110',
						under: 'Under 168.5 -110'
					},
					moneyline: {
						home: '-180',
						away: '+150'
					}
				},
				teamStats: {
					home: {
						pointsPerGame: 85.2,
						fieldGoalPct: 47.1,
						reboundsPerGame: 36.8,
						assistsPerGame: 23.4
					},
					away: {
						pointsPerGame: 82.1,
						fieldGoalPct: 44.8,
						reboundsPerGame: 34.2,
						assistsPerGame: 21.7
					}
				},
				headToHead: {
					allTimeSeries: '15-12',
					seriesLeader: 'Las Vegas leads series',
					lastFiveMeetings: [
						{ date: 'Aug 10, 2024', score: 'LV 89 - 82 SEA', result: 'Las Vegas Win' },
						{ date: 'Jul 25, 2024', score: 'SEA 76 - 84 LV', result: 'Las Vegas Win' },
						{ date: 'Jun 15, 2024', score: 'LV 78 - 91 SEA', result: 'Las Vegas Loss' },
						{ date: 'May 20, 2024', score: 'SEA 85 - 88 LV', result: 'Las Vegas Win' },
						{ date: 'Apr 30, 2024', score: 'LV 92 - 87 SEA', result: 'Las Vegas Win' }
					],
					bettingTrends: {
						ats: '3-2 Las Vegas ATS',
						overUnder: '3-2 Over Total',
						avgTotal: '171.4 Avg Total Points'
					}
				},
				aiInsights: {
					keyMatchup: {
						title: 'Las Vegas\'s superior rebounding (36.8 per game) vs Seattle\'s average rebounding (34.2 per game) gives the Aces a significant advantage in second-chance opportunities.',
						confidence: 82
					},
					valueBet: {
						title: 'Seattle has covered the spread in 6 of their last 8 games as road underdogs. The +4.5 line offers good value.',
						expectedValue: 8
					}
				},
				injuries: {
					home: [
						{ player: 'All Players', position: '', status: 'HEALTHY' }
					],
					away: [
						{ player: 'Jewell Loyd', position: 'Guard', status: 'QUESTIONABLE' }
					]
				},
				playerProps: {
					home: [
						{
							name: 'A\'ja Wilson',
							position: 'Forward',
							number: '#22',
							props: [
								{ type: 'Points', line: 22.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 9.5, overOdds: '-115', underOdds: '-105' },
								{ type: 'Assists', line: 3.5, overOdds: '-110', underOdds: '-110' }
							]
						}
					],
					away: [
						{
							name: 'Breanna Stewart',
							position: 'Forward',
							number: '#30',
							props: [
								{ type: 'Points', line: 19.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Rebounds', line: 8.5, overOdds: '-110', underOdds: '-110' },
								{ type: 'Assists', line: 4.5, overOdds: '-120', underOdds: '+100' }
							]
						}
					]
				}
			}
		};

		const game = mockGames[gameId as keyof typeof mockGames];

		if (!game) {
			return json({
				success: false,
				message: 'Game not found'
			}, { status: 404 });
		}

		return json({
			success: true,
			game
		});

	} catch (error: any) {
		console.error('Error fetching game details:', error);
		return json({
			success: false,
			message: 'Failed to fetch game details',
			error: error.message
		}, { status: 500 });
	}
};
