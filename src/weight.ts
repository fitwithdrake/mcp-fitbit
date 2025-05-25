import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { makeFitbitRequest, ToolResponseStructure } from "./utils.js";

const FITBIT_API_BASE = "https://api.fitbit.com/1";

// Represents a single weight entry from the Fitbit Time Series API
interface WeightTimeSeriesEntry {
  dateTime: string; // Date (and potentially time) of the entry
  value: string;    // Weight value as a string
}

// Represents the structure of the response from the Fitbit Time Series API for weight
interface WeightTimeSeriesResponse {
  'body-weight': WeightTimeSeriesEntry[]; // Array of weight entries
}

// --- Tool Registration ---

/**
 * Registers a single, parameterized Fitbit weight tool with the MCP server.
 * @param server The McpServer instance.
 * @param getAccessTokenFn Function to retrieve the current access token.
 */
export function registerWeightTool(
    server: McpServer,
    getAccessTokenFn: () => Promise<string | null>
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
