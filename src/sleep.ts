import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { makeFitbitRequest, ToolResponseStructure } from './utils.js';

// Use API version 1.2 for sleep endpoints
const FITBIT_API_BASE = 'https://api.fitbit.com/1.2';

// --- Fitbit API Response Interfaces for Sleep ---

// Represents the summary data for different sleep stages
interface SleepLevelSummaryData {
  count: number;
  minutes: number;
  thirtyDayAvgMinutes?: number; // Optional, might not always be present
}

// Represents the summary of sleep levels (deep, light, rem, wake)
interface SleepLevelSummary {
  deep?: SleepLevelSummaryData;
  light?: SleepLevelSummaryData;
  rem?: SleepLevelSummaryData;
  wake?: SleepLevelSummaryData;
  // Older "classic" sleep logs might have different structures
  restless?: SleepLevelSummaryData;
  awake?: SleepLevelSummaryData;
  asleep?: SleepLevelSummaryData;
}

// Represents detailed data points for sleep stages (simplified)
interface SleepLevelDataPoint {
  dateTime: string;
  level: 'deep' | 'light' | 'rem' | 'wake' | 'asleep' | 'awake' | 'restless';
  seconds: number;
}

// Represents the structure containing sleep level summaries and detailed data
interface SleepLevels {
  summary: SleepLevelSummary;
  data: SleepLevelDataPoint[];
  shortData?: SleepLevelDataPoint[]; // For naps or short sleep periods
}

// Represents a single sleep log entry from the Fitbit API
interface SleepLogEntry {
  logId: number;
  dateOfSleep: string;
  startTime: string;
  endTime: string;
  duration: number; // Milliseconds
  minutesToFallAsleep: number;
  minutesAsleep: number;
  minutesAwake: number;
  minutesAfterWakeup?: number; // May not be present in all log types
  timeInBed: number;
  efficiency: number;
  type: 'stages' | 'classic';
  infoCode: number;
  levels?: SleepLevels; // Present for 'stages' type
  // Classic sleep logs might have slightly different fields
  isMainSleep: boolean;
}

// Represents the overall structure of the response from the Fitbit Sleep API by date
interface SleepLogResponse {
  sleep: SleepLogEntry[]; // Array of sleep log entries for the requested date
  summary: {
    totalMinutesAsleep: number;
    totalSleepRecords: number;
    totalTimeInBed: number;
  };
}

// Represents the overall structure of the response from the Fitbit Sleep API by date range
interface SleepLogRangeResponse {
  sleep: SleepLogEntry[]; // Array of sleep log entries for the requested date range
  // Note: The summary object might not be present or might differ in the date range endpoint response.
  // Adjust based on actual API behavior if needed.
}

// --- Tool Registration ---

/**
 * Registers a single, parameterized Fitbit sleep tool with the MCP server for a date range.
 * @param server The McpServer instance.
 * @param getAccessTokenFn Function to retrieve the current access token.
 */
export function registerSleepTool(
  server: McpServer,
  getAccessTokenFn: () => Promise<string | null>
): void {
  const toolName = 'get_sleep_by_date_range';
  const description =
    "Get the raw JSON response for sleep logs from Fitbit for a specific date range. Requires 'startDate' and 'endDate' parameters in 'YYYY-MM-DD' format. Note: The API enforces a maximum range of 100 days.";

  const parametersSchemaShape = {
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format.')
      .describe(
        'The start date for which to retrieve sleep data (YYYY-MM-DD).'
      ),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format.')
      .describe('The end date for which to retrieve sleep data (YYYY-MM-DD).'),
  };

  type SleepParams = {
    startDate: string;
    endDate: string;
  };

  server.tool(
    toolName,
    description,
    parametersSchemaShape,
    async ({
      startDate,
      endDate,
    }: SleepParams): Promise<ToolResponseStructure> => {
      // Construct the endpoint dynamically
      const endpoint = `/sleep/date/${startDate}/${endDate}.json`;

      // Make the request
      const sleepData = await makeFitbitRequest<SleepLogRangeResponse>(
        endpoint,
        getAccessTokenFn,
        FITBIT_API_BASE
      );

      // Handle API call failure
      if (!sleepData) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to retrieve sleep data from Fitbit API for the date range '${startDate}' to '${endDate}'. Check token, permissions, date format, and ensure the range is 100 days or less.`,
            },
          ],
          isError: true,
        };
      }

      // Handle no data found
      const sleepEntries = sleepData.sleep || [];
      if (sleepEntries.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No sleep data found for the date range '${startDate}' to '${endDate}'.`,
            },
          ],
        };
      }

      // Return successful response
      const rawJsonResponse = JSON.stringify(sleepData, null, 2);
      return {
        content: [{ type: 'text', text: rawJsonResponse }],
      };
    }
  );
}
