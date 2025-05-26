# Fitbit MCP Server

[![CI](https://github.com/TheDigitalNinja/mcp-fitbit/actions/workflows/ci.yml/badge.svg)](https://github.com/TheDigitalNinja/mcp-fitbit/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Fitbit API](https://img.shields.io/badge/Fitbit-00B0B9?logo=fitbit&logoColor=white)](https://dev.fitbit.com/)

> Connect AI assistants to your Fitbit health data

Give your AI assistant access to your Fitbit data for personalized health insights, trend analysis, and automated tracking. Works with Claude Desktop and other MCP-compatible AI tools.

## What it does

🏃 **Exercise & Activities** - Get detailed workout logs and activity data  
😴 **Sleep Analysis** - Retrieve sleep patterns and quality metrics  
⚖️ **Weight Tracking** - Access weight trends over time  
❤️ **Heart Rate Data** - Monitor heart rate patterns and zones  
🍎 **Nutrition Logs** - Review food intake, calories, and macros  
👤 **Profile Info** - Access basic Fitbit profile details

*Ask your AI things like: "Show me my sleep patterns this week" or "What's my average heart rate during workouts?"*

## Quick Start

**🚀 Want to test the tools right away?**

1. [Get Fitbit API credentials](https://dev.fitbit.com/) (see Installation below)
2. Then run:

```bash
git clone https://github.com/TheDigitalNinja/mcp-fitbit
cd mcp-fitbit
npm install
# Create .env with your Fitbit credentials
npm run dev
```

This opens the **MCP Inspector** at `http://localhost:5173` where you can test all tools interactively and handle the OAuth flow.

## Installation

1. **Get Fitbit API credentials** at [dev.fitbit.com](https://dev.fitbit.com/)
   - Set **OAuth 2.0 Application Type** to `Personal`
   - Set **Callback URL** to `http://localhost:3000/callback`

2. **Create `.env` file:**
   ```bash
   FITBIT_CLIENT_ID=your_client_id_here
   FITBIT_CLIENT_SECRET=your_client_secret_here
   ```

3. **Build the server:**
   ```bash
   npm run build
   ```


## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_weight` | Weight data over time periods | `period`: `1d`, `7d`, `30d`, `3m`, `6m`, `1y` |
| `get_sleep_by_date_range` | Sleep logs for date range (max 100 days) | `startDate`, `endDate` (YYYY-MM-DD) |
| `get_exercises` | Activity/exercise logs after date | `afterDate` (YYYY-MM-DD), `limit` (1-100) |
| `get_daily_activity_summary` | Daily activity summary with goals | `date` (YYYY-MM-DD) |
| `get_activity_goals` | User's activity goals (daily/weekly) | `period`: `daily`, `weekly` |
| `get_activity_timeseries` | Activity time series data (max 30 days) | `resourcePath`, `startDate`, `endDate` (YYYY-MM-DD) |
| `get_azm_timeseries` | Active Zone Minutes time series (max 1095 days) | `startDate`, `endDate` (YYYY-MM-DD) |
| `get_heart_rate` | Heart rate for time period | `period`: `1d`, `7d`, `30d`, `1w`, `1m`, optional `date` |
| `get_heart_rate_by_date_range` | Heart rate for date range (max 1 year) | `startDate`, `endDate` (YYYY-MM-DD) |
| `get_food_log` | Complete nutrition data for a day | `date` (YYYY-MM-DD or "today") |
| `get_nutrition` | Individual nutrient over time | `resource`, `period`, optional `date` |
| `get_nutrition_by_date_range` | Individual nutrient for date range | `resource`, `startDate`, `endDate` |
| `get_profile` | User profile information | None |

**Nutrition resources:** `caloriesIn`, `water`, `protein`, `carbs`, `fat`, `fiber`, `sodium`

**Activity time series resources:** `steps`, `distance`, `calories`, `activityCalories`, `caloriesBMR`, `tracker/activityCalories`, `tracker/calories`, `tracker/distance`

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fitbit": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-fitbit\\build\\index.js"]
    }
  }
}
```

**Config file locations:**
- Windows: `%AppData%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

### First Run Authorization

When you first ask your AI assistant to use Fitbit data:
1. The server opens your browser to `http://localhost:3000/auth`
2. Log in to Fitbit and grant permissions
3. You'll be redirected to a success page
4. Your AI can now access your Fitbit data!

## Development

```bash
npm run lint          # Check code quality
npm run format        # Fix formatting
npm run build         # Compile TypeScript
npm run dev           # Run with MCP inspector
```

**Architecture:** See [TASKS.md](TASKS.md) for improvement opportunities and technical details.

