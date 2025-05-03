import express, { Request, Response } from 'express'; // Import Request and Response types
import { AuthorizationCode } from 'simple-oauth2';
import http from 'http';
import open from 'open';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Load environment variables --- 
// Calculate path relative to the *built* file in build/ directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Go up one level from build/ to the project root
const envPath = path.resolve(__dirname, '..', '.env'); 
dotenv.config({ path: envPath });
// --- End Load environment variables ---

// Calculate the directory name relative to this file if needed,
// but .env loading might be better handled in index.ts
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const envPath = path.resolve(__dirname, '..', '.env'); // Adjust path if needed
// dotenv.config({ path: envPath }); // Consider loading env in index.ts

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

// --- Function to start OAuth flow ---
export function startAuthorizationFlow(): void {
    if (oauthServer) {
        console.error("OAuth server is already running.");
        return; // Prevent starting multiple servers
    }
    if (!fitbitConfig.client.id || !fitbitConfig.client.secret) {
        console.error("Error: Fitbit Client ID or Secret not found. Check environment variables.");
        return;
    }

    const app = express(); // Define app here

    const authorizationUri = oauthClient.authorizeURL({
        redirect_uri: REDIRECT_URI,
        scope: 'weight', // Define necessary scopes here
    });

    // Use explicit types for req and res
    app.get('/auth', (req: Request, res: Response) => {
        console.error('Redirecting to Fitbit for authorization...');
        res.redirect(authorizationUri);
    });

    // Use explicit types for req and res
    app.get('/callback', async (req: Request, res: Response) => {
        const code = req.query.code as string;
        if (!code) {
            console.error('Authorization code missing in callback.');
            // Check oauthServer before closing
            if (oauthServer) {
                oauthServer.close(() => { console.error("OAuth server closed due to missing code."); });
                oauthServer = null;
            }
            // Ensure response is sent *after* attempting to close server
            res.status(400).send('Error: Authorization code missing.');
            return; // Exit function after sending response
        }

        console.error('Received authorization code. Exchanging for token...');
        const tokenParams = { code: code, redirect_uri: REDIRECT_URI };

        try {
            const tokenResult = await oauthClient.getToken(tokenParams);
            console.error('Access Token received successfully!');
            accessToken = tokenResult.token.access_token as string;
            // TODO: Persist tokenResult.token securely (including refresh token and expiry)

            // Check oauthServer before closing
            if (oauthServer) {
                console.error("Shutting down temporary OAuth server...");
                oauthServer.close(() => {
                    console.error("OAuth server closed successfully.");
                    oauthServer = null; // Ensure server instance is cleared
                });
            }
            // Send response after attempting to close server
            res.send('Authorization successful! You can close this window. The MCP Server is now authenticated.');

        } catch (error: any) {
            console.error('Error obtaining access token:', error.message || error);
            if (error.response) {
                try {
                    // Attempt to read error details, might fail if response isn't text
                    const errorDetails = await error.response.text();
                    console.error('Error details:', errorDetails);
                } catch (parseError) {
                    console.error('Could not parse error response body.');
                }
            }
            // Check oauthServer before closing
            if (oauthServer) {
                oauthServer.close(() => { console.error("OAuth server closed due to token exchange error."); });
                oauthServer = null;
            }
            // Send response after attempting to close server
            res.status(500).send('Error obtaining access token. Check MCP server logs.');
        }
    });

    oauthServer = app.listen(PORT, async () => {
        const authUrl = `http://localhost:${PORT}/auth`;
        console.error(`--------------------------------------------------------------------`);
        console.error(`ACTION REQUIRED: Fitbit Authorization Needed`);
        console.error(`Attempting to open authorization page in your browser:`);
        console.error(authUrl);
        console.error(`If the browser doesn't open, please navigate there manually.`);
        console.error(`Waiting for authorization callback...`);
        console.error(`--------------------------------------------------------------------`);
        try {
            await open(authUrl);
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

// --- Function to get the current access token ---
export function getAccessToken(): string | null {
    // TODO: Implement logic to load persisted token if available and not expired
    return accessToken;
}

// --- Optional: Function to initialize auth (e.g., load token) ---
export function initializeAuth(): void {
    // TODO: Load persisted token here
    const loadedToken = null; // Replace with actual token loading logic
    if (loadedToken) {
        accessToken = loadedToken;
        console.error("Loaded persisted access token.");
        // TODO: Check token expiry and potentially refresh if needed
    } else {
        console.error("No persisted access token found.");
    }
}
