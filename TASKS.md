# MCP Fitbit Server - Remaining Tasks

This document outlines the remaining improvement opportunities for the MCP Fitbit server.

## Remaining Tasks & New Feature Implementation

### 1. **Implement Daily Activity Summary Tool**
**Priority: High | Effort: Medium | Status: ✅ Completed**

**Problem:** No tool to fetch a consolidated summary of a user's activity for a specific day, including goal progress.
**Why needed:** Essential for answering user questions like "how did I do today?" by providing a snapshot of daily achievements (steps, distance, calories, active minutes) against defined goals.
**Solution:**
- Create a new tool, e.g., `get_daily_activity_summary`.
- Utilize Fitbit API endpoint: `GET /1/user/-/activities/date/{date}.json`.
- The tool should accept a `date` parameter in 'YYYY-MM-DD' format.
- Define necessary TypeScript interfaces for the API response structure (e.g., `DailyActivitySummaryResponse`, `ActivitySummaryData`, `ActivityGoalsSummaryData`).
- Register the new tool in `src/index.ts`.
- Ensure the `activity` OAuth scope is requested (it likely already is).
**Implementation completed:**
- ✅ Created `src/daily-activity.ts` with `get_daily_activity_summary` tool
- ✅ Registered tool in `src/index.ts`
- ✅ Updated documentation in README.md and CLAUDE.md
- ✅ TypeScript interfaces for complete API response structure
- ✅ Tool follows 1:1 proxy pattern with proper error handling

### 2. **Implement Activity Goals Tool**
**Priority: Medium | Effort: Low-Medium | Status: To Do**

**Problem:** The server cannot currently retrieve the user's defined activity goals.
**Why needed:** Understanding user goals (e.g., daily steps, weekly active minutes) is crucial context for evaluating their activity data and answering questions about performance.
**Solution:**
- Create a new tool, e.g., `get_activity_goals`.
- Utilize Fitbit API endpoint: `GET /1/user/-/activities/goals/{period}.json`.
- The tool should accept a `period` parameter (e.g., 'daily', 'weekly').
- Define TypeScript interfaces for the API response (e.g., `ActivityGoalsResponse`, `GoalsData`).
- Register the new tool in `src/index.ts`.
- Ensure the `activity` OAuth scope is requested.
**Files to modify:**
- `src/index.ts` (for tool registration and import)
- Create `src/activity_goals.ts` (or add to an existing relevant file like `src/activities.ts` if deemed appropriate, though a new file might be cleaner)
- `TASKS.md` (to update status upon completion)

### 3. **Implement Activity Time Series Tool**
**Priority: High | Effort: Medium | Status: To Do**

**Problem:** No tool to fetch time series data for overall daily activity metrics (e.g., total steps, distance, calories burned per day). The existing `get_exercises` tool lists logged activities but doesn't provide daily aggregate trends.
**Why needed:** Essential for answering user questions like "how was my week?" by showing trends in key activity metrics over a specified period.
**Solution:**
- Create a new tool, e.g., `get_activity_timeseries`.
- Utilize Fitbit API endpoint: `GET /1/user/-/activities/{resource-path}/date/{base-date}/{end-date}.json`.
- The tool should accept `resourcePath` (e.g., 'steps', 'distance', 'calories', 'elevation'), `baseDate` (YYYY-MM-DD), and `endDate` (YYYY-MM-DD) parameters.
- Define TypeScript interfaces for the API response (e.g., `ActivityTimeSeriesResponse`, `TimeSeriesDataPoint`).
- Register the new tool in `src/index.ts`.
- Ensure the `activity` OAuth scope is requested.
**Files to modify:**
- `src/index.ts` (for tool registration and import)
- Create `src/activity_timeseries.ts` (or a similar name)
- `TASKS.md` (to update status upon completion)

### 4. **Implement Active Zone Minutes (AZM) Time Series Tool**
**Priority: Medium | Effort: Low-Medium | Status: To Do**

**Problem:** No dedicated tool to track Active Zone Minutes (AZM) trends over time. While individual activities might contain AZM data, a specific time series for daily total AZM is missing.
**Why needed:** AZM is a key health and activity metric promoted by Fitbit. Providing a tool to track its trends is valuable for users monitoring their fitness.
**Solution:**
- Create a new tool, e.g., `get_azm_timeseries`.
- Utilize Fitbit API endpoint: `GET /1/user/-/activities/active-zone-minutes/date/{base-date}/{end-date}.json`.
- The tool should accept `baseDate` (YYYY-MM-DD) and `endDate` (YYYY-MM-DD) parameters.
- Define TypeScript interfaces for the API response (e.g., `AzmTimeSeriesResponse`, `AzmDataPoint`).
- Register the new tool in `src/index.ts`.
- Ensure the `activity` OAuth scope is requested (Fitbit documentation confirms `activity` scope for AZM time series).
**Files to modify:**
- `src/index.ts` (for tool registration and import)
- Add to `src/activity_timeseries.ts` (if created for task #4 and seems appropriate) or create a dedicated `src/azm.ts`.
- `TASKS.md` (to update status upon completion)

## Implementation Recommendation

**Recommended Action:** 
1. Prioritize the implementation of the new Fitbit API tools (Tasks #1, #2, #3, #4) as they directly enhance the server's capability to answer common user queries about their activity and well-being.

## Design Philosophy Reminder

This MCP server is designed to be:
- **Simple and focused** - 1:1 proxy to Fitbit API
- **Local development tool** - Not a production service
- **Minimal complexity** - Easy to understand and maintain

The major refactoring work has already addressed all critical issues. The remaining tasks are minor quality-of-life improvements that should only be pursued if there's clear value.

## Contributing

When working on remaining tasks:
1. Maintain the project's simplicity
2. Avoid over-engineering solutions
3. Test with the MCP inspector
4. Update this document when completed