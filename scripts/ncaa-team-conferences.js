// NCAA Football Team to Conference Mapping
// This mapping covers all FBS (Division I) teams and their conferences

export const NCAA_TEAM_CONFERENCES = {
	// SEC (Southeastern Conference)
	'Alabama': 'SEC',
	'Arkansas': 'SEC',
	'Auburn': 'SEC',
	'Florida': 'SEC',
	'Georgia': 'SEC',
	'Kentucky': 'SEC',
	'LSU': 'SEC',
	'Mississippi State': 'SEC',
	'Missouri': 'SEC',
	'Ole Miss': 'SEC',
	'South Carolina': 'SEC',
	'Tennessee': 'SEC',
	'Texas A&M': 'SEC',
	'Vanderbilt': 'SEC',
	
	// Big Ten
	'Illinois': 'Big Ten',
	'Indiana': 'Big Ten',
	'Iowa': 'Big Ten',
	'Maryland': 'Big Ten',
	'Michigan': 'Big Ten',
	'Michigan State': 'Big Ten',
	'Minnesota': 'Big Ten',
	'Nebraska': 'Big Ten',
	'Northwestern': 'Big Ten',
	'Ohio State': 'Big Ten',
	'Penn State': 'Big Ten',
	'Purdue': 'Big Ten',
	'Rutgers': 'Big Ten',
	'Wisconsin': 'Big Ten',
	
	// ACC (Atlantic Coast Conference)
	'Boston College': 'ACC',
	'Clemson': 'ACC',
	'Duke': 'ACC',
	'Florida State': 'ACC',
	'Georgia Tech': 'ACC',
	'Louisville': 'ACC',
	'Miami': 'ACC',
	'North Carolina': 'ACC',
	'NC State': 'ACC',
	'Pittsburgh': 'ACC',
	'Syracuse': 'ACC',
	'Virginia': 'ACC',
	'Virginia Tech': 'ACC',
	'Wake Forest': 'ACC',
	
	// Big 12
	'Baylor': 'Big 12',
	'BYU': 'Big 12',
	'Cincinnati': 'Big 12',
	'Houston': 'Big 12',
	'Iowa State': 'Big 12',
	'Kansas': 'Big 12',
	'Kansas State': 'Big 12',
	'Oklahoma State': 'Big 12',
	'TCU': 'Big 12',
	'Texas': 'Big 12',
	'Texas Tech': 'Big 12',
	'UCF': 'Big 12',
	'West Virginia': 'Big 12',
	
	// Pac-12
	'Arizona': 'Pac-12',
	'Arizona State': 'Pac-12',
	'California': 'Pac-12',
	'Colorado': 'Pac-12',
	'Oregon': 'Pac-12',
	'Oregon State': 'Pac-12',
	'Stanford': 'Pac-12',
	'UCLA': 'Pac-12',
	'USC': 'Pac-12',
	'Utah': 'Pac-12',
	'Washington': 'Pac-12',
	'Washington State': 'Pac-12',
	
	// AAC (American Athletic Conference)
	'Charlotte': 'AAC',
	'ECU': 'AAC',
	'FAU': 'AAC',
	'Memphis': 'AAC',
	'Navy': 'AAC',
	'North Texas': 'AAC',
	'Rice': 'AAC',
	'SMU': 'AAC',
	'South Florida': 'AAC',
	'Temple': 'AAC',
	'Tulane': 'AAC',
	'Tulsa': 'AAC',
	'UTSA': 'AAC',
	
	// Mountain West
	'Air Force': 'Mountain West',
	'Boise State': 'Mountain West',
	'Colorado State': 'Mountain West',
	'Fresno State': 'Mountain West',
	'Hawaii': 'Mountain West',
	'Nevada': 'Mountain West',
	'New Mexico': 'Mountain West',
	'San Diego State': 'Mountain West',
	'San Jose State': 'Mountain West',
	'UNLV': 'Mountain West',
	'Utah State': 'Mountain West',
	'Wyoming': 'Mountain West',
	
	// Conference USA
	'FIU': 'Conference USA',
	'Jacksonville State': 'Conference USA',
	'Kennesaw State': 'Conference USA',
	'Liberty': 'Conference USA',
	'Louisiana Tech': 'Conference USA',
	'Middle Tennessee': 'Conference USA',
	'New Mexico State': 'Conference USA',
	'Sam Houston': 'Conference USA',
	'UTEP': 'Conference USA',
	'WKU': 'Conference USA',
	
	// MAC (Mid-American Conference)
	'Akron': 'MAC',
	'Ball State': 'MAC',
	'Bowling Green': 'MAC',
	'Buffalo': 'MAC',
	'Central Michigan': 'MAC',
	'Eastern Michigan': 'MAC',
	'Kent State': 'MAC',
	'Miami (OH)': 'MAC',
	'Northern Illinois': 'MAC',
	'Ohio': 'MAC',
	'Toledo': 'MAC',
	'Western Michigan': 'MAC',
	
	// Sun Belt
	'Appalachian State': 'Sun Belt',
	'Arkansas State': 'Sun Belt',
	'Coastal Carolina': 'Sun Belt',
	'Georgia Southern': 'Sun Belt',
	'Georgia State': 'Sun Belt',
	'James Madison': 'Sun Belt',
	'Louisiana': 'Sun Belt',
	'Louisiana-Monroe': 'Sun Belt',
	'Marshall': 'Sun Belt',
	'Old Dominion': 'Sun Belt',
	'South Alabama': 'Sun Belt',
	'Southern Miss': 'Sun Belt',
	'Texas State': 'Sun Belt',
	'Troy': 'Sun Belt',
	
	// Independent
	'Army': 'Independent',
	'Connecticut': 'Independent',
	'Notre Dame': 'Independent',
	'UMass': 'Independent',
};

// Helper function to find conference by team name (fuzzy matching)
export function findConference(teamName) {
	if (!teamName) return null;
	
	// Direct match
	if (NCAA_TEAM_CONFERENCES[teamName]) {
		return NCAA_TEAM_CONFERENCES[teamName];
	}
	
	// Try partial matches (e.g., "Alabama Crimson Tide" -> "Alabama")
	const teamNameLower = teamName.toLowerCase();
	
	for (const [key, conference] of Object.entries(NCAA_TEAM_CONFERENCES)) {
		const keyLower = key.toLowerCase();
		
		// Check if team name contains the key or vice versa
		if (teamNameLower.includes(keyLower) || keyLower.includes(teamNameLower.split(' ')[0])) {
			return conference;
		}
		
		// Check common variations
		if (teamNameLower.includes('crimson tide') && key === 'Alabama') return conference;
		if (teamNameLower.includes('tigers') && key === 'LSU') return conference;
		if (teamNameLower.includes('buckeyes') && key === 'Ohio State') return conference;
		if (teamNameLower.includes('wolverines') && key === 'Michigan') return conference;
		if (teamNameLower.includes('longhorns') && key === 'Texas') return conference;
		if (teamNameLower.includes('sooners') && key === 'Oklahoma') return conference;
		if (teamNameLower.includes('trojan') && key === 'USC') return conference;
		if (teamNameLower.includes('bruins') && key === 'UCLA') return conference;
		if (teamNameLower.includes('ducks') && key === 'Oregon') return conference;
		if (teamNameLower.includes('badgers') && key === 'Wisconsin') return conference;
	}
	
	return null;
}

