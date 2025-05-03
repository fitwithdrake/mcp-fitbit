import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// --- Fitbit API Configuration ---
const FITBIT_API_BASE = "https://api.fitbit.com/1";
// User agent string for identifying requests to the Fitbit API
const USER_AGENT = "mcp-fitbit-server/1.0";

// --- Interfaces for Fitbit API Responses ---

// Represents a single weight entry from the Fitbit Time Series API
interface WeightTimeSeriesEntry {
  dateTime: string; // Date (and potentially time) of the entry
  value: string;    // Weight value as a string
}

// Represents the structure of the response from the Fitbit Time Series API for weight
interface WeightTimeSeriesResponse {
  'body-weight': WeightTimeSeriesEntry[]; // Array of weight entries
}

// --- Fitbit API Request Helper ---

/**
 * Makes a generic request to the Fitbit API.
 * Handles adding the base URL, authorization header, and basic error handling.
 * @param endpoint The specific API endpoint path (e.g., '/body/weight/date/today/30d.json').
 * @param getAccessTokenFn A function that returns the current valid access token or null.
 * @returns A promise resolving to the parsed JSON response (type T) or null if the request fails.
 */
async function makeFitbitRequest<T>(
    endpoint: string,
    getAccessTokenFn: () => string | null
): Promise<T | null> {
    const currentAccessToken = getAccessTokenFn();
    if (!currentAccessToken) {
        console.error("Error: No Fitbit Access Token available. Please authorize first.");
        return null;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${FITBIT_API_BASE}/user/-/${cleanEndpoint}`;
    console.error(`Attempting Fitbit API request to: ${url}`);

    const headers = {
        "User-Agent": USER_AGENT,
        Authorization: `Bearer ${currentAccessToken}`,
        Accept: "application/json",
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Fitbit API Error! Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            if (response.status === 401) {
                console.error("Access token might be expired or invalid. Re-authorization may be needed.");
            }
            return null;
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error(`Error making Fitbit request to ${url}:`, error);
        return null;
    }
}

// --- MCP Tool Response Structures ---

// Defines the structure for text content within a tool response
type TextContent = { type: "text"; text: string };

// Defines the standard structure for a tool's response to the MCP client
type ToolResponseStructure = {
    content: TextContent[]; // Array containing response content (currently just text)
    isError?: boolean;      // Optional flag indicating if the tool execution resulted in an error
    _meta?: Record<string, unknown>; // Optional metadata
    [key: string]: unknown; // Allows for extensibility
};

// --- Tool Registration ---

/**
 * Factory function to create and register a Fitbit weight tool for a specific time period.
 * @param server The McpServer instance.
 * @param getAccessTokenFn Function to retrieve the current access token.
 * @param days The number of past days (7, 30, or 90) for which to fetch weight data.
 */
function createWeightTool(
    server: McpServer,
    getAccessTokenFn: () => string | null,
    days: 7 | 30 | 90
): void {
    const toolName = `get_weight_last_${days}_days`;
    const description = `Get the raw JSON response for weight entries from the last ${days} days.`;
    const endpoint = `/body/weight/date/today/${days}d.json`;

    server.tool(
        toolName,
        description,
        {}, // This tool currently accepts no input parameters
        async (): Promise<ToolResponseStructure> => {
            const weightData = await makeFitbitRequest<WeightTimeSeriesResponse>(endpoint, getAccessTokenFn);

            // Handle API call failure (network error, invalid token, etc.)
            if (!weightData) {
                return {
                    content: [{ type: "text", text: `Failed to retrieve weight data from Fitbit API for the last ${days} days. Check token and permissions.` }],
                    isError: true
                };
            }

            // Handle successful API call that returned no data for the period
            const weightEntries = weightData['body-weight'] || [];
            if (weightEntries.length === 0) {
                return {
                    content: [{ type: "text", text: `No weight data found in the last ${days} days.` }]
                    // isError defaults to false
                };
            }

            // If data exists, stringify the raw JSON response
            const rawJsonResponse = JSON.stringify(weightData, null, 2); // Pretty-print for readability

            // Return the raw JSON string as text content
            return {
                content: [{ type: "text", text: rawJsonResponse }],
            };
        }
    );

    console.error(`Registered Fitbit '${toolName}' tool (raw JSON output).`);
}

/**
 * Registers all Fitbit weight tools with the MCP server.
 * Uses the createWeightTool factory function for different time periods.
 * @param server The McpServer instance.
 * @param getAccessTokenFn Function to retrieve the current access token.
 */
export function registerWeightTools(
    server: McpServer,
    getAccessTokenFn: () => string | null
): void {
    createWeightTool(server, getAccessTokenFn, 7);
    createWeightTool(server, getAccessTokenFn, 30);
    // Note: The 90d endpoint might not be supported by Fitbit API based on previous logs.
    // Consider removing or handling the specific error if 90d consistently fails.
    createWeightTool(server, getAccessTokenFn, 90);
}
