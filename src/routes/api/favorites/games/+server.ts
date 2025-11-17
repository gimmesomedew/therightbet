import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/database/connection.js';

/**
 * GET: Get user's favorite games
 * POST: Add a game to favorites
 * DELETE: Remove a game from favorites
 */
export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (!locals.user) {
			return json({
				success: false,
				message: 'Unauthorized'
			}, { status: 401 });
		}

		const favorites = await db`
			SELECT target_id as game_id
			FROM user_favorites
			WHERE user_id = ${locals.user.id} AND type = 'game'
			ORDER BY created_at DESC
		`;

		return json({
			success: true,
			data: favorites.map(f => f.game_id)
		});
	} catch (error) {
		console.error('Error fetching favorite games:', error);
		return json({
			success: false,
			message: 'Failed to fetch favorite games'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		if (!locals.user) {
			return json({
				success: false,
				message: 'Unauthorized'
			}, { status: 401 });
		}

		const { gameId } = await request.json();

		if (!gameId) {
			return json({
				success: false,
				message: 'gameId is required'
			}, { status: 400 });
		}

		// Check if game exists
		const [game] = await db`
			SELECT id FROM games WHERE id = ${gameId} LIMIT 1
		`;

		if (!game) {
			return json({
				success: false,
				message: 'Game not found'
			}, { status: 404 });
		}

		// Check if already favorited
		const [existing] = await db`
			SELECT id FROM user_favorites
			WHERE user_id = ${locals.user.id} AND type = 'game' AND target_id = ${gameId}
			LIMIT 1
		`;

		if (existing) {
			return json({
				success: true,
				message: 'Game already favorited',
				isFavorite: true
			});
		}

		// Add to favorites
		await db`
			INSERT INTO user_favorites (user_id, type, target_id)
			VALUES (${locals.user.id}, 'game', ${gameId})
		`;

		return json({
			success: true,
			message: 'Game added to favorites',
			isFavorite: true
		});
	} catch (error) {
		console.error('Error adding favorite game:', error);
		return json({
			success: false,
			message: 'Failed to add favorite game'
		}, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	try {
		if (!locals.user) {
			return json({
				success: false,
				message: 'Unauthorized'
			}, { status: 401 });
		}

		const { gameId } = await request.json();

		if (!gameId) {
			return json({
				success: false,
				message: 'gameId is required'
			}, { status: 400 });
		}

		// Remove from favorites
		await db`
			DELETE FROM user_favorites
			WHERE user_id = ${locals.user.id} AND type = 'game' AND target_id = ${gameId}
		`;

		return json({
			success: true,
			message: 'Game removed from favorites',
			isFavorite: false
		});
	} catch (error) {
		console.error('Error removing favorite game:', error);
		return json({
			success: false,
			message: 'Failed to remove favorite game'
		}, { status: 500 });
	}
};

