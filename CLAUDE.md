# Claude Development Guide

## Project Overview
MCP server for Fitbit API integration providing health data access (weight, sleep, activities, profile).

**Design Philosophy:** This MCP server acts as a 1:1 JSON proxy to the Fitbit API. Tools should match the underlying API parameters and limitations exactly, without adding abstraction layers or client-side data manipulation. Return raw JSON responses from Fitbit API calls.

## Development Commands
- `npm run build` - Compile TypeScript to build/ directory
- `npm run start` - Run the built MCP server
- `npm run dev` - Build and run with MCP inspector for testing/debugging
- `npm test` - No tests configured yet
- No linting/typechecking scripts configured

## Project Structure
- `src/index.ts` - Main MCP server entry point, registers all tools
- `src/auth.ts` - OAuth2 flow with token persistence
- `src/utils.ts` - Shared Fitbit API request utilities  
- `src/weight.ts` - Weight data tool (time series)
- `src/sleep.ts` - Sleep data tool (date range)
- `src/activities.ts` - Exercise/activity data tool (date range)
- `src/profile.ts` - User profile tool
- `src/heart-rate.ts` - Heart rate data tools (time series and date range)
- `build/` - Compiled JavaScript output
- `.env` - Environment variables (FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET)

## Code Conventions
- TypeScript with ES modules
- Zod for parameter validation
- All tools return raw JSON from Fitbit API
- Error handling with console.error for debugging
- Use makeFitbitRequest utility for API calls
- **API Fidelity:** Tool parameters must exactly match Fitbit API requirements - no client-side workarounds or data filtering
- **No Abstraction:** If Fitbit API only supports `afterDate`, the tool should only accept `afterDate` (not `startDate`/`endDate`)
- **Documentation First:** Always check the official Fitbit API documentation at https://dev.fitbit.com/build/reference/ when adding new endpoints to ensure proper parameters, authentication scopes, and response formats

## Testing the Server
**Development mode (with inspector):**
1. `npm run dev` - Builds and opens MCP inspector web UI
2. Test tools interactively at http://localhost:5173
3. OAuth flow - server opens browser for authorization

**Production mode:**
1. `npm run build` - Compile TypeScript
2. `npm run start` - Run server directly
3. Tools available after auth: get_weight, get_sleep_by_date_range, get_exercises, get_profile, get_heart_rate, get_heart_rate_by_date_range

## Environment Setup
Requires `.env` file with:
```
FITBIT_CLIENT_ID=your_client_id
FITBIT_CLIENT_SECRET=your_client_secret
```

## API Notes
- Fitbit API uses different base URLs per endpoint (v1, v1.2)
- Activities tool has custom request handler due to different URL structure
- All dates in YYYY-MM-DD format
- Token persisted to `.fitbit-token.json`
- OAuth scopes: weight, sleep, profile, activity, heartrate