import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

async function createAdmin() {
	console.log('👑 Creating admin user and test invites...');
	
	try {
		const db = neon(DATABASE_URL);
		
		// Test database connection
		await db`SELECT 1 as test`;
		console.log('✅ Database connection successful');
		
		// Check if admin user already exists
		const existingAdmin = await db`
			SELECT id FROM users WHERE email = 'admin@therightbet.com'
		`;
		
		if (existingAdmin.length > 0) {
			console.log('⚠️  Admin user already exists');
		} else {
			// Create admin user
			const passwordHash = await bcrypt.hash('admin123', 12);
			
			const adminUser = await db`
				INSERT INTO users (
					email, password_hash, first_name, last_name,
					subscription_tier, created_at, updated_at
				)
				VALUES (
					'admin@therightbet.com', ${passwordHash}, 'Admin', 'User',
					'premium', NOW(), NOW()
				)
				RETURNING id, email
			`;
			
			console.log('✅ Admin user created:', adminUser[0].email);
		}
		
		// Get admin user ID
		const adminResult = await db`
			SELECT id FROM users WHERE email = 'admin@therightbet.com'
		`;
		const adminId = adminResult[0].id;
		
		// Create test invites
		const testInvites = [
			{ email: 'test1@example.com', code: 'TEST1234' },
			{ email: 'test2@example.com', code: 'DEMO5678' },
			{ email: 'user@example.com', code: 'USER9999' }
		];
		
		console.log('🎫 Creating test invites...');
		
		for (const invite of testInvites) {
			// Check if invite already exists
			const existingInvite = await db`
				SELECT id FROM invites WHERE invite_code = ${invite.code}
			`;
			
			if (existingInvite.length > 0) {
				console.log(`⚠️  Invite ${invite.code} already exists`);
				continue;
			}
			
			// Set expiry to 30 days from now
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 30);
			
			await db`
				INSERT INTO invites (email, invite_code, invited_by, expires_at, created_at)
				VALUES (${invite.email}, ${invite.code}, ${adminId}, ${expiresAt}, NOW())
			`;
			
			console.log(`✅ Created invite: ${invite.code} for ${invite.email}`);
		}
		
		console.log('\n🎉 Admin setup completed!');
		console.log('\n📋 Admin Credentials:');
		console.log('   Email: admin@therightbet.com');
		console.log('   Password: admin123');
		console.log('\n🎫 Test Invite Codes:');
		console.log('   TEST1234 - for test1@example.com');
		console.log('   DEMO5678 - for test2@example.com');
		console.log('   USER9999 - for user@example.com');
		console.log('\n💡 You can now:');
		console.log('   1. Login as admin at /login');
		console.log('   2. Create more invites via the admin panel');
		console.log('   3. Test registration with the invite codes above');
		
	} catch (error) {
		console.error('❌ Admin setup failed:', error.message);
		process.exit(1);
	}
}

createAdmin();
