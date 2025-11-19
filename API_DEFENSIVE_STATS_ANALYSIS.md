# API Analysis: Defensive Statistics & Red Zone Data

## Current API Connections

### 1. **Sportradar API** (Primary NFL Data Source)
- **Current Usage**: Game schedules, statistics, play-by-play data
- **Endpoint Used**: `/games/{game_id}/statistics.json`
- **What We're Getting**:
  - Team statistics (offensive stats)
  - Player statistics (rushing, receiving, passing touchdowns)
  - Game scores and results
  - Play-by-play data

- **What Sportradar NFL API Provides**:
  - ✅ Game-by-game statistics
  - ✅ Team statistics (both offense and defense)
  - ✅ Player statistics
  - ❓ Red zone statistics (needs verification)
  - ❓ Week-to-week defensive rankings (needs verification)

- **Potential Endpoints to Check**:
  - `/seasons/{year}/{season_type}/teams/{team_id}/statistics.json` - Team season statistics
  - `/games/{game_id}/statistics.json` - Game statistics (already using)
  - `/seasons/{year}/{season_type}/standings.json` - Standings (may include defensive rankings)

### 2. **The Odds API**
- **Purpose**: Betting odds only (spreads, totals, moneylines)
- **Does NOT provide**: Statistics or defensive data

### 3. **SportsDataIO API**
- **Current Usage**: NCAA Football team records
- **Potential**: May have NFL defensive statistics (requires subscription check)
- **Note**: We have the API key but haven't explored NFL defensive stats endpoints

### 4. **College Football Data API (CFBD)**
- **Purpose**: NCAA Football only
- **Does NOT provide**: NFL data

## What We Need

### Required Data:
1. **General Defensive Statistics** (week-to-week):
   - Points allowed per game
   - Yards allowed (total, passing, rushing)
   - Sacks
   - Interceptions
   - Forced fumbles
   - Turnovers forced
   - Third down conversion rate allowed
   - Time of possession allowed

2. **Red Zone Defensive Statistics** (week-to-week):
   - Red zone attempts allowed
   - Red zone touchdowns allowed
   - Red zone field goals allowed
   - Red zone stop percentage
   - Red zone scoring percentage allowed

## Recommended Next Steps

### Option 1: Check Sportradar API Capabilities (Recommended First)
1. **Test Sportradar Endpoints**:
   ```bash
   # Test team statistics endpoint
   GET /seasons/{year}/{season_type}/teams/{team_id}/statistics.json
   
   # Check if game statistics include defensive red zone data
   GET /games/{game_id}/statistics.json
   ```

2. **Review Sportradar Documentation**:
   - Check if red zone statistics are included in game statistics
   - Verify if defensive stats are available week-by-week
   - Check trial tier limitations (may need paid tier for advanced stats)

### Option 2: SportsDataIO API (If Sportradar Doesn't Have It)
1. **Check Available Endpoints**:
   - `/nfl/v3/stats/json/TeamGameStats/{season}/{week}`
   - `/nfl/v3/stats/json/TeamSeasonStats/{season}`
   - Check documentation for red zone specific endpoints

2. **Subscription Requirements**:
   - Verify if your current subscription includes NFL defensive statistics
   - Check if red zone data requires a premium tier

### Option 3: Additional APIs (If Needed)
1. **nflfastR/nflverse** (Free, Open Source):
   - Provides comprehensive NFL statistics
   - Includes defensive metrics
   - Week-by-week data available
   - **Note**: Requires data scraping or using their R package/API

2. **Pro Football Reference**:
   - Comprehensive defensive statistics
   - Red zone data available
   - **Note**: May require web scraping (check ToS)

3. **ESPN API**:
   - May have defensive statistics
   - **Note**: Limited public API access

## Action Items

1. ✅ **Immediate**: Test Sportradar API endpoints for defensive statistics
   - Create a test script to query team statistics
   - Check game statistics response for defensive red zone data

2. ✅ **Secondary**: Review SportsDataIO NFL endpoints
   - Check if defensive stats are available
   - Verify subscription tier includes this data

3. ⚠️ **If Needed**: Research and integrate additional API
   - Evaluate nflfastR/nflverse
   - Consider Pro Football Reference scraping (if legal)
   - Check ESPN API availability

## Testing Script Needed

Create a script to test Sportradar defensive statistics endpoints:

```javascript
// Test Sportradar defensive stats
const testDefensiveStats = async () => {
  // Test 1: Team season statistics
  const teamStats = await fetch(
    `https://api.sportradar.com/nfl/official/trial/v7/en/seasons/2024/REG/teams/{TEAM_ID}/statistics.json?api_key=${API_KEY}`
  );
  
  // Test 2: Game statistics (check for defensive red zone data)
  const gameStats = await fetch(
    `https://api.sportradar.com/nfl/official/trial/v7/en/games/{GAME_ID}/statistics.json?api_key=${API_KEY}`
  );
  
  // Analyze response structure
  console.log('Team Stats:', JSON.stringify(teamStats, null, 2));
  console.log('Game Stats:', JSON.stringify(gameStats, null, 2));
};
```

## Conclusion

**Current Status**: We are NOT currently fetching defensive statistics or red zone defensive data.

**Recommendation**: 
1. First, test Sportradar API endpoints to see if this data is available in your current subscription tier
2. If not available, check SportsDataIO API for NFL defensive statistics
3. If neither provides the needed data, consider integrating nflfastR/nflverse or another specialized API

Would you like me to create a test script to check what defensive statistics are available from Sportradar API?

