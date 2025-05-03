import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from 'dotenv';
import express from 'express';
import { AuthorizationCode } from 'simple-oauth2';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open'; // <-- Import open

// Calculate the directory name of the current module (build/index.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path to the .env file (one level up from build/)
const envPath = path.resolve(__dirname, '..', '.env');

// Load environment variables from the specific .env file path
dotenv.config({ path: envPath });

// Fitbit API Configuration
const FITBIT_API_BASE = "https://api.fitbit.com/1";
const USER_AGENT = "mcp-fitbit-server/1.0";

// OAuth Configuration from environment variables
const fitbitConfig = {
  client: {
    id: process.env.FITBIT_CLIENT_ID || '',
    secret: process.env.FITBIT_CLIENT_SECRET || '',
  },
  auth: {
    tokenHost: 'https://api.fitbit.com',
    authorizePath: '/oauth2/authorize',
    tokenPath: '/oauth2/token',
  },
  options: {
    authorizationMethod: 'header' as const, // Fitbit requires client credentials in header
  }
};

const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/callback';
const PORT = process.env.PORT || 3000;

// --- State variable to hold the access token ---
let accessToken: string | null = null;
let oauthServer: http.Server | null = null; // To hold the server instance for shutdown

// --- OAuth Client ---
const oauthClient = new AuthorizationCode(fitbitConfig);

// Create server instance
const server = new McpServer({
  name: "fitbit",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper function for making Fitbit API requests
async function makeFitbitRequest<T>(endpoint: string): Promise<T | null> {
  if (!accessToken) {
    console.error("Error: No Fitbit Access Token available. Please authorize first.");
    // Optionally, trigger the auth flow again here or return a specific error message
    return null;
  }

  const url = `${FITBIT_API_BASE}${endpoint}`;
  const headers = {
    "User-Agent": USER_AGENT,
    Authorization: `Bearer ${accessToken}`,
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
        accessToken = null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making Fitbit request:", error);
    return null;
  }
}

// Interfaces for Fitbit Weight Data (keep as before)
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

// Register Fitbit weight tool (keep as before)
server.tool(
  "get-weight",
  "Get the latest recorded weight entries for a specific date",
  {
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date in YYYY-MM-DD format"),
  },
  async ({ date }) => {
    const weightEndpoint = `/user/-/body/log/weight/date/${date}.json`;
    const weightData = await makeFitbitRequest<WeightResponse>(weightEndpoint);

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


// --- Function to start OAuth flow (no longer returns Promise, doesn't block) ---
function startAuthorizationFlow(): void {
    if (oauthServer) {
        console.error("OAuth server is already running.");
        return; // Prevent starting multiple servers
    }
    if (!process.env.FITBIT_CLIENT_ID || !process.env.FITBIT_CLIENT_SECRET) {
        console.error("Error: Fitbit Client ID or Secret not found in .env file.");
        // Don't exit here, let the server run but log the error
        return;
    }

    const app = express();

    const authorizationUri = oauthClient.authorizeURL({
        redirect_uri: REDIRECT_URI,
        scope: 'weight',
    });

    app.get('/auth', (req, res) => {
        console.error('Redirecting to Fitbit for authorization...');
        res.redirect(authorizationUri);
    });

    app.get('/callback', async (req, res) => {
        const code = req.query.code as string;
        if (!code) {
            res.status(400).send('Error: Authorization code missing.');
            // Don't reject, just log error and close server if possible
            console.error('Authorization code missing in callback.');
             if (oauthServer) {
                oauthServer.close(() => { console.error("OAuth server closed due to error."); });
                oauthServer = null;
            }
            return;
        }

        console.error('Received authorization code. Exchanging for token...');
        const tokenParams = { code: code, redirect_uri: REDIRECT_URI };

        try {
            const tokenResult = await oauthClient.getToken(tokenParams);
            console.error('Access Token received successfully!');
            accessToken = tokenResult.token.access_token as string;
            // TODO: Persist tokenResult.token securely (including refresh token and expiry)

            res.send('Authorization successful! You can close this window. The MCP Server is now authenticated.');

            // Shutdown the temporary server
            if (oauthServer) {
                console.error("Shutting down temporary OAuth server...");
                oauthServer.close(() => {
                    console.error("OAuth server closed.");
                    oauthServer = null; // Ensure server instance is cleared
                });
            }

        } catch (error: any) {
            console.error('Error obtaining access token:', error.message || error);
            if (error.response) {
                console.error('Error details:', await error.response.text());
            }
            res.status(500).send('Error obtaining access token. Check MCP server logs.');
             if (oauthServer) {
                oauthServer.close(() => { console.error("OAuth server closed due to error."); });
                oauthServer = null;
            }
        }
    });

    oauthServer = app.listen(PORT, async () => { // Make listener async for open()
        const authUrl = `http://localhost:${PORT}/auth`;
        console.error(`--------------------------------------------------------------------`);
        console.error(`ACTION REQUIRED: Fitbit Authorization Needed`);
        console.error(`Attempting to open authorization page in your browser:`);
        console.error(authUrl);
        console.error(`If the browser doesn't open, please navigate there manually.`);
        console.error(`Waiting for authorization callback...`);
        console.error(`--------------------------------------------------------------------`);
        try {
            await open(authUrl); // Automatically open the browser
            console.error(`Browser opened (or attempted).`);
        } catch (err) {
            console.error(`Failed to open browser automatically:`, err);
        }
    });

    oauthServer.on('error', (err) => {
        console.error("Error starting temporary OAuth server:", err);
        oauthServer = null; // Clear server instance on error
    });
}


async function main() {
    // --- Connect MCP Server FIRST ---
    const transport = new StdioServerTransport();
    // Removed transport.onclose and transport.onerror handlers

    try {
        await server.connect(transport);
        console.error("Fitbit MCP Server connected via stdio."); // Log connection success

        // --- Check for token or start auth flow AFTER connection ---
        // TODO: Load persisted token here if implemented
        if (!accessToken) {
            console.error("No access token found. Starting Fitbit authorization flow...");
            startAuthorizationFlow(); // Start flow in background, DO NOT await
        } else {
            console.error("Using existing/loaded access token.");
        }

    } catch (error) {
         console.error("Failed to connect MCP server:", error);
         process.exit(1);
    }

    // Keep the process running (removed the Promise.reject as it wasn't needed)
    // The server connection itself should keep the process alive.
    // If it exits prematurely, it's likely due to an unhandled error or the transport closing.
    console.error("MCP Server setup complete. Waiting for requests...");

}

main().catch((error) => {
    // This top-level catch might handle errors during initial setup
    console.error("Fatal error during MCP server startup:", error);
    process.exit(1);
});