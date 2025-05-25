import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { makeFitbitRequest, ToolResponseStructure } from "./utils.js";

const FITBIT_API_BASE = "https://api.fitbit.com/1";

// Represents the structure of the response from the Fitbit Profile API
interface FitbitProfile {
  user: {
    fullName: string;
    age: number;
    gender: string;
    height: number; // in centimeters
    weight: number; // in kilograms
    avatar: string; // URL to the user's avatar
    memberSince: string; // Date the user joined Fitbit
    // Add other fields as needed
  };
}

/**
 * Registers a single, parameterized Fitbit profile tool with the MCP server.
 * @param server The McpServer instance.
 * @param getAccessTokenFn Function to retrieve the current access token.
 */
export function registerProfileTool(
  server: McpServer,
  getAccessTokenFn: () => Promise<string | null>
): void {
  const toolName = "get_profile";
  const description = "Get the raw JSON response for the user's Fitbit profile.";

  server.tool(
    toolName,
    description,
    {}, // No parameters required for this tool
    async (): Promise<ToolResponseStructure> => {
      // Construct the endpoint - use profile.json directly
      const endpoint = "profile.json";

      console.error("Fetching Fitbit profile data...");
      const profileData = await makeFitbitRequest<FitbitProfile>(
        endpoint,
        getAccessTokenFn,
        FITBIT_API_BASE
      );

      // Handle API call failure
      if (!profileData) {
        console.error("Failed to retrieve profile data from Fitbit API");
        return {
          content: [{ type: "text", text: "Failed to retrieve profile data from Fitbit API. Check token and permissions." }],
          isError: true,
        };
      }

      console.error("Successfully retrieved profile data");
      // Return successful response with properly formatted JSON
      const rawJsonResponse = JSON.stringify(profileData, null, 2);
      return {
        content: [{ type: "text", text: rawJsonResponse }],
      };
    }
  );

  console.error(`Registered Fitbit '${toolName}' tool (raw JSON output).`);
}