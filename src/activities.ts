// filepath: d:\projects\personal\mcp-fitbit\src\activities.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { makeFitbitRequest, ToolResponseStructure } from "./utils.js";

// Use API version 1 for activities endpoints
const FITBIT_API_BASE = "https://api.fitbit.com/1";

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

// --- Special function to make API request with enhanced error handling ---
async function makeFitbitActivityRequest(
    endpoint: string,
    getAccessTokenFn: () => string | null
): Promise<{ data: ActivitiesListResponse | null; errorDetails: string | null }> {
    const currentAccessToken = getAccessTokenFn();
    if (!currentAccessToken) {
        return { 
            data: null, 
            errorDetails: "No Fitbit Access Token available. Please authorize first." 
        };
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${FITBIT_API_BASE}/${cleanEndpoint}`;
    console.error(`DEBUG - Attempting Fitbit API activity request to: ${url}`);

    const headers = {
        "User-Agent": "mcp-fitbit-server/1.0",
        "Authorization": `Bearer ${currentAccessToken}`,
        "Accept": "application/json",
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Fitbit API Error! Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return {
                data: null,
                errorDetails: `API error: Status ${response.status}. ${errorBody}`
            };
        }
        
        if (response.status === 204) {
            return { data: {} as ActivitiesListResponse, errorDetails: null };
        }
        
        const jsonData = await response.json();
        return { data: jsonData as ActivitiesListResponse, errorDetails: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error making Fitbit request to ${url}:`, errorMessage);
        return { 
            data: null, 
            errorDetails: `Network or parsing error: ${errorMessage}` 
        };
    }
}

// --- Tool Registration ---

/**
 * Registers a Fitbit activities/exercises tool with the MCP server.
 * @param server The McpServer instance.
 * @param getAccessTokenFn Function to retrieve the current access token.
 */
export function registerActivitiesTool(
    server: McpServer,
    getAccessTokenFn: () => string | null
): void {
    const toolName = "get_exercises";
    const description = "Get the raw JSON response for exercise and activity logs from Fitbit for a specific date range. Requires 'startDate' and 'endDate' parameters in 'YYYY-MM-DD' format. Retrieves a detailed list of logged exercises and activities.";

    const parametersSchemaShape = {
        startDate: z.string()
               .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format.")
               .describe("The start date for which to retrieve exercise data (YYYY-MM-DD)."),
        endDate: z.string()
               .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format.")
               .describe("The end date for which to retrieve exercise data (YYYY-MM-DD)."),
        limit: z.number()
               .min(1)
               .max(100)
               .optional()
               .describe("Maximum number of activities to return (1-100, default: 20)")
    };

    type ActivitiesParams = {
        startDate: string;
        endDate: string;
        limit?: number;
    };

    server.tool(
        toolName,
        description,
        parametersSchemaShape,
        async ({ startDate, endDate, limit = 20 }: ActivitiesParams): Promise<ToolResponseStructure> => {
            // Try a different URL structure that avoids the '/user/-/' prefix since
            // the makeFitbitActivityRequest function will add it correctly
            const endpoint = `activities/list.json?afterDate=${startDate}&beforeDate=${endDate}&sort=asc&offset=0&limit=${limit}`;
            
            console.error(`DEBUG - Request endpoint: ${endpoint}`);
            
            // Make the request with enhanced error handling
            const { data: activitiesData, errorDetails } = await makeFitbitActivityRequest(
                endpoint,
                getAccessTokenFn
            );

            // Handle API call failure
            if (!activitiesData) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Failed to retrieve exercise data from Fitbit API for the date range '${startDate}' to '${endDate}'. ${errorDetails || 'Check API permissions and date format.'}` 
                    }],
                    isError: true
                };
            }

            // Handle no data found
            const activityEntries = activitiesData.activities || [];
            if (activityEntries.length === 0) {
                return {
                    content: [{ type: "text", text: `No exercise data found for the date range '${startDate}' to '${endDate}'.` }]
                };
            }

            // Return successful response
            const rawJsonResponse = JSON.stringify(activitiesData, null, 2);
            return {
                content: [{ type: "text", text: rawJsonResponse }],
            };
        }
    );

    console.error(`Registered Fitbit '${toolName}' tool (raw JSON output, requires 'startDate', 'endDate', and optional 'limit' parameters).`);
}