// filepath: d:\projects\personal\mcp-fitbit\src\activities.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { makeFitbitRequest, ToolResponseStructure } from "./utils.js";


// --- Fitbit API Response Interfaces for Activities ---

// Represents a single activity entry from the Fitbit Activities API
interface ActivityLogEntry {
  logId: number;
  activityId: number;
  activityName: string;
  activityTypeId: number;
  activityLevel?: {
    minutes: number;
    name: string;
  }[];
  averageHeartRate?: number;
  calories: number;
  distance?: number;
  distanceUnit?: string;
  duration: number;
  activeDuration: number;
  steps?: number;
  source: {
    id: string;
    name: string;
    type: string;
  };
  startDate: string;
  startTime: string;
  originalStartDate: string;
  originalStartTime: string;
  heartRateZones?: {
    caloriesOut: number;
    max: number;
    min: number;
    minutes: number;
    name: string;
  }[];
  lastModified: string;
  elevationGain?: number;
  hasGps?: boolean;
  hasActiveZoneMinutes?: boolean;
}

// Represents the overall structure of the response from the Fitbit Activities API by date range
interface ActivitiesListResponse {
  activities: ActivityLogEntry[];
  pagination?: {
    beforeDate: string;
    limit: number;
    next: string;
    offset: number;
    previous: string;
    sort: string;
  };
}


// --- Tool Registration ---

/**
 * Registers a Fitbit activities/exercises tool with the MCP server.
 * @param server The McpServer instance.
 * @param getAccessTokenFn Function to retrieve the current access token.
 */
export function registerActivitiesTool(
    server: McpServer,
    getAccessTokenFn: () => Promise<string | null>
): void {
    const toolName = "get_exercises";
    const description = "Get the raw JSON response for exercise and activity logs from Fitbit after a specific date. Requires 'afterDate' parameter in 'YYYY-MM-DD' format. Retrieves a detailed list of logged exercises and activities.";

    const parametersSchemaShape = {
        afterDate: z.string()
               .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
               .describe("Retrieve activities after this date (YYYY-MM-DD)."),
        limit: z.number()
               .min(1)
               .max(100)
               .optional()
               .describe("Maximum number of activities to return (1-100, default: 20)")
    };

    type ActivitiesParams = {
        afterDate: string;
        limit?: number;
    };

    server.tool(
        toolName,
        description,
        parametersSchemaShape,
        async ({ afterDate, limit = 20 }: ActivitiesParams): Promise<ToolResponseStructure> => {
            // Use the correct Fitbit API endpoint structure - only afterDate is supported
            const endpoint = `activities/list.json?afterDate=${afterDate}&sort=asc&offset=0&limit=${limit}`;
            
            console.error(`DEBUG - Request endpoint: ${endpoint}`);
            
            // Make the request using shared utility
            const activitiesData = await makeFitbitRequest<ActivitiesListResponse>(
                endpoint,
                getAccessTokenFn,
                "https://api.fitbit.com/1"
            );

            // Handle API call failure
            if (!activitiesData) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Failed to retrieve exercise data from Fitbit API after date '${afterDate}'. Check API permissions and date format.` 
                    }],
                    isError: true
                };
            }

            // Handle no data found
            const activityEntries = activitiesData.activities || [];
            if (activityEntries.length === 0) {
                return {
                    content: [{ type: "text", text: `No exercise data found after date '${afterDate}'.` }]
                };
            }

            // Return successful response
            const rawJsonResponse = JSON.stringify(activitiesData, null, 2);
            return {
                content: [{ type: "text", text: rawJsonResponse }],
            };
        }
    );

}