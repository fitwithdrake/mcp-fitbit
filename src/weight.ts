import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const FITBIT_API_BASE = "https://api.fitbit.com/1";
const USER_AGENT = "mcp-fitbit-server/1.0";

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
 * Registers a single, parameterized Fitbit weight tool with the MCP server.
 * @param server The McpServer instance.
 * @param getAccessTokenFn Function to retrieve the current access token.
 */
export function registerWeightTool(
    server: McpServer,
    getAccessTokenFn: () => string | null
): void {
    const toolName = "get_weight";
    const description = "Get the raw JSON response for weight entries from Fitbit for a specified period ending today. Requires a 'period' parameter such as '1d', '7d', '30d', '3m', '6m', '1y'";

    // Define the schema shape using zod
    const parametersSchemaShape = {
        period: z.enum(["1d", "7d", "30d", "3m", "6m", "1y"])
                 .describe("The time period for which to retrieve weight data."),
    };

    // Define the expected type for the validated parameters
    type WeightParams = {
        period: "1d" | "7d" | "30d" | "3m" | "6m" | "1y";
    };

    server.tool(
        toolName,
        description,
        parametersSchemaShape, // Pass the schema shape to the SDK for validation
        // The SDK validates the input based on the schema and passes the
        // validated parameters object (typed as WeightParams) to the callback.
        async ({ period }: WeightParams): Promise<ToolResponseStructure> => {

            // Construct the endpoint dynamically
            const endpoint = `/body/weight/date/today/${period}.json`;

            const weightData = await makeFitbitRequest<WeightTimeSeriesResponse>(endpoint, getAccessTokenFn);

            // Handle API call failure
            if (!weightData) {
                return {
                    content: [{ type: "text", text: `Failed to retrieve weight data from Fitbit API for the period '${period}'. Check token and permissions.` }],
                    isError: true
                };
            }

            // Handle no data found for the period
            const weightEntries = weightData['body-weight'] || [];
            if (weightEntries.length === 0) {
                return {
                    content: [{ type: "text", text: `No weight data found for the period '${period}'.` }]
                };
            }

            // Return successful response with raw JSON
            const rawJsonResponse = JSON.stringify(weightData, null, 2);
            return {
                content: [{ type: "text", text: rawJsonResponse }],
            };
        }
    );

    console.error(`Registered Fitbit '${toolName}' tool (raw JSON output, requires 'period' parameter).`);
}
