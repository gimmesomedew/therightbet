import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const gameId = params.id;
		
		// Fetch game data from our API
		const gameResponse = await fetch(`http://localhost:5173/api/games/${gameId}`);
		const gameData = await gameResponse.json();
		
		// Fetch head-to-head data from SportsRadar API
		const headToHeadResponse = await fetch(`http://localhost:5173/api/games/${gameId}/head-to-head-sportradar`);
		const headToHeadData = await headToHeadResponse.json();
		
		if (gameData.success) {
			return {
				game: gameData.game,
				headToHead: headToHeadData.success ? headToHeadData.data : null
			};
		} else {
			return {
				error: gameData.message || 'Failed to load game details'
			};
		}
	} catch (error) {
		return {
			error: 'Failed to load game details'
		};
	}
};
