import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeAuth, startAuthorizationFlow, getAccessToken } from './auth.js';
import { registerWeightLast30DaysTool } from './weight.js';

// Calculate the directory name of the current module (build/index.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path to the .env file (one level up from build/)
// Load environment variables early
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// --- Add logging here ---
console.error(`[index.ts] After dotenv load: FITBIT_CLIENT_ID=${process.env.FITBIT_CLIENT_ID ? 'Loaded' : 'MISSING'}`);
console.error(`[index.ts] After dotenv load: FITBIT_CLIENT_SECRET=${process.env.FITBIT_CLIENT_SECRET ? 'Loaded' : 'MISSING'}`);
// --- End logging ---

// Create MCP server instance
const server = new McpServer({
  name: "fitbit",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {}, // Tools will be registered below
  },
});

// Register tools from modules
registerWeightLast30DaysTool(server, getAccessToken);

// --- Main Application Logic ---
async function main() {
    // Initialize authentication (e.g., load token)
    initializeAuth();

    // --- Connect MCP Server ---
    const transport = new StdioServerTransport();

    try {
        await server.connect(transport);
        console.error("Fitbit MCP Server connected via stdio.");

        // --- Check for token or start auth flow AFTER connection ---
        // Use the imported getAccessToken function
        if (!getAccessToken()) {
            console.error("No access token found. Starting Fitbit authorization flow...");
            // Use the imported startAuthorizationFlow function
            startAuthorizationFlow(); // Start flow in background, DO NOT await
        } else {
            console.error("Using existing/loaded access token.");
        }

    } catch (error) {
         console.error("Failed to connect MCP server:", error);
         process.exit(1); // Exit if connection fails
    }

    console.error("MCP Server setup complete. Waiting for requests...");
    // Keep the process running; the server connection handles this.
    // No need for an infinite loop or wait here, StdioServerTransport handles it.
}

// Ensure the catch block correctly handles the error object
main().catch((error: Error) => { // Add type annotation for error
    console.error("Fatal error during MCP server startup:", error.message || error); // Log error message
    process.exit(1);
});