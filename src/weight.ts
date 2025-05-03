import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Fitbit API Configuration (can be shared or passed)
const FITBIT_API_BASE = "https://api.fitbit.com/1";
const USER_AGENT = "mcp-fitbit-server/1.0"; // Or get from a central config

// Interfaces for Fitbit Weight Data
interface WeightLog {
  bmi: number;
  date: string;
  logId: number;
  time: string;
  weight: number;
  source: string;
}

interface WeightResponse {
  weight: WeightLog[];
}

// Helper function for making Fitbit API requests
// Needs access token, passed via getAccessTokenFn
async function makeFitbitRequest<T>(
    endpoint: string,
    getAccessTokenFn: () => string | null
): Promise<T | null> {
  const currentAccessToken = getAccessTokenFn();
  if (!currentAccessToken) {
    console.error("Error: No Fitbit Access Token available. Please authorize first.");
    // Optionally, trigger the auth flow again here or return a specific error message
    return null;
  }

  const url = `${FITBIT_API_BASE}${endpoint}`;
  const headers = {
    "User-Agent": USER_AGENT,
    Authorization: `Bearer ${currentAccessToken}`,
    Accept: "application/json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Fitbit API Error! Status: ${response.status}, Body: ${errorBody}`);
      if (response.status === 401) {
        console.error("Access token might be expired or invalid. Re-authorization may be needed.");
        // Potentially clear the token and trigger re-auth?
        // The auth module should handle token state based on errors maybe
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making Fitbit request:", error);
    return null;
  }
}


// Function to register the Fitbit weight tool
export function registerWeightTool(
    server: McpServer,
    getAccessTokenFn: () => string | null // Pass function to get token
): void {
  server.tool(
    "get-weight",
    "Get the latest recorded weight entries for a specific date",
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date in YYYY-MM-DD format"),
    },
    async ({ date }) => {
      const weightEndpoint = `/user/-/body/log/weight/date/${date}.json`;
      // Pass the token getter function to the request helper
      const weightData = await makeFitbitRequest<WeightResponse>(weightEndpoint, getAccessTokenFn);

      if (!weightData) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to retrieve weight data for ${date}. Ensure the access token is valid and has the required permissions, or try authorizing again.`,
            },
          ],
        };
      }

      const weightLogs = weightData.weight || [];
      if (weightLogs.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No weight logged for ${date}.`
            },
          ],
        };
      }

      const formattedWeight = weightLogs.map((log: WeightLog) =>
        [
          `Date: ${log.date}`,
          `Time: ${log.time}`,
          `Weight: ${log.weight}`,
          `BMI: ${log.bmi}`,
          `Source: ${log.source}`,
          `Log ID: ${log.logId}`,
          "---",
        ].join("\\n"),
      );

      const weightText = `Weight logs for ${date}:\\n\\n${formattedWeight.join("\\n")}`;

      return {
        content: [
          {
            type: "text",
            text: weightText,
          },
        ],
      };
    },
  );

  console.error("Registered Fitbit 'get-weight' tool.");
}
