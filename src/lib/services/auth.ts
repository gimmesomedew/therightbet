import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '$lib/database/connection.js';
import { JWT_SECRET } from '$env/static/private';

if (!JWT_SECRET) {
	throw new Error('JWT_SECRET environment variable is required');
}

export interface User {
	id: string;
	email: string;
	first_name?: string;
	last_name?: string;
	subscription_tier: string;
	created_at: Date;
}

export interface Invite {
	id: string;
	email: string;
	invite_code: string;
	invited_by: string;
	used: boolean;
	expires_at: Date;
	created_at: Date;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData {
	email: string;
	password: string;
	first_name?: string;
	last_name?: string;
	invite_code: string;
}

export interface AuthResult {
	success: boolean;
	user?: User;
	token?: string;
	message?: string;
}

class AuthService {
	private jwtSecret: string;
	private tokenExpiry = '7d'; // 7 days

	constructor() {
		this.jwtSecret = JWT_SECRET;
	}

	// Generate a secure invite code
	private generateInviteCode(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let result = '';
		for (let i = 0; i < 8; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	// Hash password
	private async hashPassword(password: string): Promise<string> {
		const saltRounds = 12;
		return await bcrypt.hash(password, saltRounds);
	}

	// Verify password
	private async verifyPassword(password: string, hash: string): Promise<boolean> {
		return await bcrypt.compare(password, hash);
	}

	// Generate JWT token
	private generateToken(userId: string): string {
		return jwt.sign(
			{ userId, iat: Math.floor(Date.now() / 1000) },
			this.jwtSecret,
			{ expiresIn: this.tokenExpiry }
		);
	}

	// Verify JWT token
	verifyToken(token: string): { userId: string } | null {
		try {
			const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
			return decoded;
		} catch (error) {
			return null;
		}
	}

	// Create an invite
	async createInvite(email: string, invitedBy: string): Promise<{ success: boolean; invite_code?: string; message?: string }> {
		try {
			// Check if user already exists
			const existingUser = await db`
				SELECT id FROM users WHERE email = ${email}
			`;
			
			if (existingUser.length > 0) {
				return {
					success: false,
					message: 'User with this email already exists'
				};
			}

			// Check if invite already exists and is not expired
			const existingInvite = await db`
				SELECT id FROM invites 
				WHERE email = ${email} 
				AND used = false 
				AND expires_at > NOW()
			`;
			
			if (existingInvite.length > 0) {
				return {
					success: false,
					message: 'Active invite already exists for this email'
				};
			}

			// Generate invite code
			const inviteCode = this.generateInviteCode();
			
			// Set expiry to 7 days from now
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);

			// Create invite
			await db`
				INSERT INTO invites (email, invite_code, invited_by, expires_at, created_at)
				VALUES (${email}, ${inviteCode}, ${invitedBy}, ${expiresAt}, NOW())
			`;

			return {
				success: true,
				invite_code: inviteCode,
				message: 'Invite created successfully'
			};
		} catch (error) {
			console.error('Error creating invite:', error);
			return {
				success: false,
				message: 'Failed to create invite'
			};
		}
	}

	// Validate invite code
	async validateInvite(inviteCode: string): Promise<{ valid: boolean; email?: string; message?: string }> {
		try {
			const invite = await db`
				SELECT email, used, expires_at 
				FROM invites 
				WHERE invite_code = ${inviteCode}
			`;

			if (invite.length === 0) {
				return {
					valid: false,
					message: 'Invalid invite code'
				};
			}

			const inviteData = invite[0];

			if (inviteData.used) {
				return {
					valid: false,
					message: 'Invite code has already been used'
				};
			}

			if (new Date(inviteData.expires_at) < new Date()) {
				return {
					valid: false,
					message: 'Invite code has expired'
				};
			}

			return {
				valid: true,
				email: inviteData.email,
				message: 'Invite code is valid'
			};
		} catch (error) {
			console.error('Error validating invite:', error);
			return {
				valid: false,
				message: 'Failed to validate invite code'
			};
		}
	}

	// Register user with invite code
	async register(data: RegisterData): Promise<AuthResult> {
		try {
			// Validate invite code
			const inviteValidation = await this.validateInvite(data.invite_code);
			if (!inviteValidation.valid) {
				return {
					success: false,
					message: inviteValidation.message
				};
			}

			// Check if email matches invite
			if (inviteValidation.email !== data.email) {
				return {
					success: false,
					message: 'Email does not match the invite'
				};
			}

			// Check if user already exists
			const existingUser = await db`
				SELECT id FROM users WHERE email = ${data.email}
			`;
			
			if (existingUser.length > 0) {
				return {
					success: false,
					message: 'User with this email already exists'
				};
			}

			// Hash password
			const passwordHash = await this.hashPassword(data.password);

			// Create user
			const newUser = await db`
				INSERT INTO users (
					email, password_hash, first_name, last_name, 
					subscription_tier, created_at, updated_at
				)
				VALUES (
					${data.email}, ${passwordHash}, ${data.first_name || null}, ${data.last_name || null},
					'premium', NOW(), NOW()
				)
				RETURNING id, email, first_name, last_name, subscription_tier, created_at
			`;

			// Mark invite as used
			await db`
				UPDATE invites 
				SET used = true, used_at = NOW() 
				WHERE invite_code = ${data.invite_code}
			`;

			const user = newUser[0];
			const token = this.generateToken(user.id);

			return {
				success: true,
				user: {
					id: user.id,
					email: user.email,
					first_name: user.first_name,
					last_name: user.last_name,
					subscription_tier: user.subscription_tier,
					created_at: user.created_at
				},
				token,
				message: 'Registration successful'
			};
		} catch (error) {
			console.error('Error during registration:', error);
			return {
				success: false,
				message: 'Registration failed'
			};
		}
	}

	// Login user
	async login(credentials: LoginCredentials): Promise<AuthResult> {
		try {
			// Find user by email
			const user = await db`
				SELECT id, email, password_hash, first_name, last_name, 
					   subscription_tier, created_at, is_active
				FROM users 
				WHERE email = ${credentials.email}
			`;

			if (user.length === 0) {
				return {
					success: false,
					message: 'Invalid email or password'
				};
			}

			const userData = user[0];

			// Check if user is active
			if (!userData.is_active) {
				return {
					success: false,
					message: 'Account is deactivated'
				};
			}

			// Verify password
			const passwordValid = await this.verifyPassword(credentials.password, userData.password_hash);
			if (!passwordValid) {
				return {
					success: false,
					message: 'Invalid email or password'
				};
			}

			// Generate token
			const token = this.generateToken(userData.id);

			return {
				success: true,
				user: {
					id: userData.id,
					email: userData.email,
					first_name: userData.first_name,
					last_name: userData.last_name,
					subscription_tier: userData.subscription_tier,
					created_at: userData.created_at
				},
				token,
				message: 'Login successful'
			};
		} catch (error) {
			console.error('Error during login:', error);
			return {
				success: false,
				message: 'Login failed'
			};
		}
	}

	// Get user by ID
	async getUserById(userId: string): Promise<User | null> {
		try {
			const user = await db`
				SELECT id, email, first_name, last_name, subscription_tier, created_at
				FROM users 
				WHERE id = ${userId} AND is_active = true
			`;

			if (user.length === 0) {
				return null;
			}

			const userData = user[0];
			return {
				id: userData.id,
				email: userData.email,
				first_name: userData.first_name,
				last_name: userData.last_name,
				subscription_tier: userData.subscription_tier,
				created_at: userData.created_at
			};
		} catch (error) {
			console.error('Error getting user:', error);
			return null;
		}
	}

	// Get user by token
	async getUserByToken(token: string): Promise<User | null> {
		const decoded = this.verifyToken(token);
		if (!decoded) {
			return null;
		}

		return await this.getUserById(decoded.userId);
	}

	// Get all invites (admin function)
	async getInvites(): Promise<Invite[]> {
		try {
			const invites = await db`
				SELECT i.id, i.email, i.invite_code, i.invited_by, i.used, 
					   i.expires_at, i.created_at, i.used_at,
					   u.email as invited_by_email
				FROM invites i
				LEFT JOIN users u ON i.invited_by = u.id
				ORDER BY i.created_at DESC
			`;

			return invites.map(invite => ({
				id: invite.id,
				email: invite.email,
				invite_code: invite.invite_code,
				invited_by: invite.invited_by,
				used: invite.used,
				expires_at: invite.expires_at,
				created_at: invite.created_at
			}));
		} catch (error) {
			console.error('Error getting invites:', error);
			return [];
		}
	}
}

// Export singleton instance
export const authService = new AuthService();
