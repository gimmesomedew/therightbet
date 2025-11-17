import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import readline from 'readline';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

const db = neon(DATABASE_URL);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

function question(prompt) {
	return new Promise((resolve) => {
		rl.question(prompt, resolve);
	});
}

async function updateTeamRecord() {
	try {
		const [sport] = await db`SELECT id FROM sports WHERE code = 'NCAAFB' LIMIT 1`;
		if (!sport) {
			console.log('❌ NCAAFB sport not found');
			return;
		}

		console.log('📊 NCAA Football Team Record Updater\n');
		console.log('This script allows you to manually update team records.');
		console.log('The Odds API does not provide historical game results,\nso records must be entered manually or imported from another source.\n');

		const teamName = await question('Enter team name (or abbreviation): ');
		
		const teams = await db`
			SELECT id, name, abbreviation, wins, losses 
			FROM teams 
			WHERE sport_id = ${sport.id}
				AND (LOWER(name) LIKE LOWER(${'%' + teamName + '%'}) 
					OR LOWER(abbreviation) LIKE LOWER(${'%' + teamName + '%'}))
			LIMIT 10
		`;

		if (teams.length === 0) {
			console.log('❌ No teams found matching that name');
			return;
		}

		if (teams.length > 1) {
			console.log('\nMultiple teams found:');
			teams.forEach((t, i) => {
				console.log(`  ${i + 1}. ${t.name} (${t.abbreviation}) - Current: ${t.wins || 0}-${t.losses || 0}`);
			});
			const choice = await question('\nSelect team number: ');
			const selectedTeam = teams[parseInt(choice) - 1];
			if (!selectedTeam) {
				console.log('❌ Invalid selection');
				return;
			}
			await updateRecord(selectedTeam);
		} else {
			await updateRecord(teams[0]);
		}

	} catch (error) {
		console.error('❌ Error:', error.message);
	} finally {
		rl.close();
	}
}

async function updateRecord(team) {
	console.log(`\nUpdating: ${team.name} (${team.abbreviation})`);
	console.log(`Current record: ${team.wins || 0}-${team.losses || 0}\n`);

	const wins = await question('Enter wins: ');
	const losses = await question('Enter losses: ');

	const winsNum = parseInt(wins);
	const lossesNum = parseInt(losses);

	if (isNaN(winsNum) || isNaN(lossesNum)) {
		console.log('❌ Invalid input. Wins and losses must be numbers.');
		return;
	}

	await db`
		UPDATE teams
		SET wins = ${winsNum}, losses = ${lossesNum}, updated_at = NOW()
		WHERE id = ${team.id}
	`;

	console.log(`\n✅ Updated ${team.name} to ${winsNum}-${lossesNum}`);
}

// Batch import from CSV format
async function batchImport() {
	console.log('\n📥 Batch Import Mode');
	console.log('Enter team records in format: TeamName,Wins,Losses');
	console.log('One per line. Type "done" when finished.\n');

	const records = [];
	let line;
	
	while ((line = await question('> ')) !== 'done') {
		const parts = line.split(',');
		if (parts.length === 3) {
			records.push({
				teamName: parts[0].trim(),
				wins: parseInt(parts[1].trim()),
				losses: parseInt(parts[2].trim())
			});
		} else {
			console.log('⚠️  Invalid format. Use: TeamName,Wins,Losses');
		}
	}

	if (records.length === 0) {
		console.log('No records to import');
		return;
	}

	const [sport] = await db`SELECT id FROM sports WHERE code = 'NCAAFB' LIMIT 1`;
	if (!sport) return;

	let updated = 0;
	let notFound = 0;

	for (const record of records) {
		const [team] = await db`
			SELECT id FROM teams 
			WHERE sport_id = ${sport.id}
				AND (LOWER(name) LIKE LOWER(${'%' + record.teamName + '%'})
					OR LOWER(abbreviation) LIKE LOWER(${'%' + record.teamName + '%'}))
			LIMIT 1
		`;

		if (team) {
			await db`
				UPDATE teams
				SET wins = ${record.wins}, losses = ${record.losses}, updated_at = NOW()
				WHERE id = ${team.id}
			`;
			updated++;
		} else {
			console.log(`⚠️  Team not found: ${record.teamName}`);
			notFound++;
		}
	}

	console.log(`\n✅ Updated ${updated} teams`);
	if (notFound > 0) {
		console.log(`⚠️  ${notFound} teams not found`);
	}
}

async function main() {
	const mode = await question('Choose mode:\n1. Single team update\n2. Batch import\nChoice: ');

	if (mode === '1') {
		await updateTeamRecord();
	} else if (mode === '2') {
		await batchImport();
	} else {
		console.log('Invalid choice');
		rl.close();
	}
}

main().catch(console.error);

