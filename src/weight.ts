import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod"; // Keep Zod for potential future use, though not needed for this tool

// Fitbit API Configuration (can be shared or passed)
const FITBIT_API_BASE = "https://api.fitbit.com/1";
const USER_AGENT = "mcp-fitbit-server/1.0"; // Or get from a central config

// Simplified interface for time series data points
interface WeightTimeSeriesEntry {
  dateTime: string;
  value: string; // Weight is returned as a string value here
}

// Interface for the time series response
interface WeightTimeSeriesResponse {
  'body-weight': WeightTimeSeriesEntry[];
}

// Helper function for making Fitbit API requests
// Needs access token, passed via getAccessTokenFn
async function makeFitbitRequest<T>(
    endpoint: string, // Endpoint should be relative path like /body/log/weight.json
    getAccessTokenFn: () => string | null
): Promise<T | null> {
  const currentAccessToken = getAccessTokenFn();
  if (!currentAccessToken) {
    console.error("Error: No Fitbit Access Token available. Please authorize first.");
    return null;
  }

  // Correct URL construction: Ensure only one slash between /user/- and the endpoint path
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = `${FITBIT_API_BASE}/user/-/${cleanEndpoint}`;
  console.error(`Attempting Fitbit API request to: ${url}`); // Log the corrected URL

  const headers = {
    "User-Agent": USER_AGENT,
    Authorization: `Bearer ${currentAccessToken}`,
    Accept: "application/json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorBody = await response.text();
      // Log the URL that failed along with the error
      console.error(`Fitbit API Error! Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
      if (response.status === 401) {
        console.error("Access token might be expired or invalid. Re-authorization may be needed.");
      }
      return null; // Return null on non-ok response
    }
    return (await response.json()) as T;
  } catch (error) {
    // Log the URL that failed along with the error
    console.error(`Error making Fitbit request to ${url}:`, error);
    return null;
  }
}

// Define the expected structure for the tool response content
type TextContent = { type: "text"; text: string };

// Define the expected structure for the tool response
type ToolResponseStructure = {
    content: TextContent[];
    isError?: boolean;
    _meta?: Record<string, unknown>;
    [key: string]: unknown; // Allow other properties
};


// NEW Tool Registration Function
export function registerWeightLast30DaysTool(
    server: McpServer,
    getAccessTokenFn: () => string | null
): void {
    server.tool(
        "get_weight_last_30_days", // Tool name
        "Get the raw JSON response for weight entries from the last 30 days.", // Updated description
        {}, // No input parameters
        async (): Promise<ToolResponseStructure> => { // No arguments needed in callback

            const weightEndpoint = `/body/weight/date/today/30d.json`;
            const weightData = await makeFitbitRequest<WeightTimeSeriesResponse>(weightEndpoint, getAccessTokenFn);

            // Handle API call failure (network error, 4xx/5xx status)
            if (!weightData) {
                return {
                    content: [{ type: "text", text: "Failed to retrieve weight data from Fitbit API. Check token and permissions." }],
                    isError: true // Indicate an API error occurred
                };
            }

            // Check if the API call succeeded but returned no data
            const weightEntries = weightData['body-weight'] || [];
            if (weightEntries.length === 0) {
                // Return a specific message indicating no data for the period, NOT an error
                return {
                    content: [{ type: "text", text: "No weight data found in the last 30 days." }]
                    // isError is false/undefined by default
                };
            }

            // If data exists, convert the raw JSON response object to a string
            const rawJsonResponse = JSON.stringify(weightData, null, 2); // Pretty-print JSON

            // Return the raw JSON string
            return {
                content: [{ type: "text", text: rawJsonResponse }],
            };
        }
    );

    console.error("Registered Fitbit 'get_weight_last_30_days' tool (raw JSON output).");
}
