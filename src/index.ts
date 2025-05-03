import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import authentication functions
import { initializeAuth, startAuthorizationFlow, getAccessToken } from './auth.js';
// Import tool registration function(s)
import { registerWeightTools } from './weight.js';

// Calculate the directory name of the current module (build/index.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path to the .env file (one level up from build/)
// Load environment variables early in the application lifecycle
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Log environment variable loading status for debugging
console.error(`[index.ts] After dotenv load: FITBIT_CLIENT_ID=${process.env.FITBIT_CLIENT_ID ? 'Loaded' : 'MISSING'}`);
console.error(`[index.ts] After dotenv load: FITBIT_CLIENT_SECRET=${process.env.FITBIT_CLIENT_SECRET ? 'Loaded' : 'MISSING'}`);

// Create the main MCP server instance
const server = new McpServer({
  name: "fitbit",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {}, // Tools are registered dynamically below
  },
});

// Register available tools with the MCP server
registerWeightTools(server, getAccessToken);

// --- Main Application Entry Point ---
async function main() {
    // Initialize the authentication module (e.g., load persisted token)
    initializeAuth();

    // Set up the transport layer for communication (stdio in this case)
    const transport = new StdioServerTransport();

    try {
        // Connect the MCP server to the transport
        await server.connect(transport);
        console.error("Fitbit MCP Server connected via stdio.");

        // Check if an access token is available after connection
        // If not, initiate the OAuth2 authorization flow
        if (!getAccessToken()) {
            console.error("No access token found. Starting Fitbit authorization flow...");
            startAuthorizationFlow(); // Start flow in background, do not await
        } else {
            console.error("Using existing/loaded access token.");
        }

    } catch (error) {
         console.error("Failed to connect MCP server:", error);
         process.exit(1); // Exit if connection fails
    }

    console.error("MCP Server setup complete. Waiting for requests...");
    // The server connection via StdioServerTransport keeps the process alive.
}

// Execute the main function and handle any top-level errors
main().catch((error: Error) => {
    console.error("Fatal error during MCP server startup:", error.message || error);
    process.exit(1);
});