import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import http from 'http';
import open from 'open';
import path from 'path';
import { AuthorizationCode } from 'simple-oauth2';
import { fileURLToPath } from 'url';

// Determine the directory of the current module (build/auth.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file located in the project root
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Fitbit OAuth2 Configuration
const fitbitConfig = {
  client: {
    id: process.env.FITBIT_CLIENT_ID || '',
    secret: process.env.FITBIT_CLIENT_SECRET || '',
  },
  auth: {
    tokenHost: 'https://api.fitbit.com',
    authorizePath: 'https://www.fitbit.com/oauth2/authorize',
    tokenPath: 'https://api.fitbit.com/oauth2/token',
  },
  options: {
    authorizationMethod: 'header' as const,
  },
};

// OAuth2 Redirect URI and local server port
const REDIRECT_URI = 'http://localhost:3000/callback';
const PORT = 3000;

// --- State Management ---
// In-memory storage for the access token. Consider a more persistent store for production.
let accessToken: string | null = null;
// Holds the temporary HTTP server instance used for the OAuth callback
let oauthServer: http.Server | null = null;

// --- OAuth Client Initialization ---
const oauthClient = new AuthorizationCode(fitbitConfig);

// --- Fitbit Authorization Flow ---

/**
 * Initiates the Fitbit OAuth2 authorization code flow.
 * Starts a temporary local web server to handle the redirect callback.
 * Opens the user's browser to the Fitbit authorization page.
 */
export function startAuthorizationFlow(): void {
    // Prevent multiple authorization flows from running simultaneously
    if (oauthServer) {
        console.error("OAuth server is already running.");
        return;
    }
    // Ensure Client ID and Secret are loaded before starting
    if (!fitbitConfig.client.id || !fitbitConfig.client.secret) {
        console.error("Error: Fitbit Client ID or Secret not found. Check environment variables.");
        return;
    }

    const app = express();

    // Generate the Fitbit authorization URL
    const authorizationUri = oauthClient.authorizeURL({
        redirect_uri: REDIRECT_URI,
        // Define necessary scopes required by the application
        scope: 'weight sleep', // Added 'sleep' scope
    });

    // Route to initiate the authorization flow by redirecting the user to Fitbit
    app.get('/auth', (req: Request, res: Response) => {
        console.error('Redirecting to Fitbit for authorization...');
        res.redirect(authorizationUri);
    });

    // Callback route that Fitbit redirects to after user authorization
    app.get('/callback', async (req: Request, res: Response) => {
        const code = req.query.code as string;
        // Handle cases where the authorization code is missing
        if (!code) {
            console.error('Authorization code missing in callback.');
            res.status(400).send('Error: Authorization code missing.');
            // Attempt to close the server if it exists
            if (oauthServer) {
                oauthServer.close(() => { console.error("OAuth server closed due to missing code."); });
                oauthServer = null;
            }
            return;
        }

        console.error('Received authorization code. Exchanging for token...');
        const tokenParams = { code: code, redirect_uri: REDIRECT_URI };

        try {
            // Exchange the authorization code for an access token
            const tokenResult = await oauthClient.getToken(tokenParams);
            console.error('Access Token received successfully!');
            accessToken = tokenResult.token.access_token as string;
            // TODO: Persist tokenResult.token securely (including refresh token and expiry)
            // For now, it's stored in memory (accessToken variable)

            res.send('Authorization successful! You can close this window. The MCP Server is now authenticated.');

        } catch (error: any) {
            // Handle errors during token exchange
            console.error('Error obtaining access token:', error.message || error);
            if (error.response) {
                try {
                    const errorDetails = await error.response.text();
                    console.error('Error details:', errorDetails);
                } catch (parseError) {
                    console.error('Could not parse error response body.');
                }
            }
            res.status(500).send('Error obtaining access token. Check MCP server logs.');
        } finally {
            // Ensure the temporary server is always shut down after handling the callback
            if (oauthServer) {
                console.error("Shutting down temporary OAuth server...");
                oauthServer.close(() => {
                    console.error("OAuth server closed.");
                    oauthServer = null;
                });
            }
        }
    });

    // Start the temporary local server
    oauthServer = app.listen(PORT, async () => {
        const authUrl = `http://localhost:${PORT}/auth`;
        console.error(`--------------------------------------------------------------------`);
        console.error(`ACTION REQUIRED: Fitbit Authorization Needed`);
        console.error(`Attempting to open authorization page in your browser:`);
        console.error(authUrl);
        console.error(`If the browser doesn't open, please navigate there manually.`);
        console.error(`Waiting for authorization callback...`);
        console.error(`--------------------------------------------------------------------`);
        // Attempt to automatically open the authorization URL in the default browser
        try {
            await open(authUrl);
            console.error(`Browser opened (or attempted).`);
        } catch (err) {
            console.error(`Failed to open browser automatically:`, err);
        }
    });

    // Handle potential errors during server startup
    oauthServer.on('error', (err) => {
        console.error("Error starting temporary OAuth server:", err);
        oauthServer = null;
    });
}

/**
 * Retrieves the current Fitbit access token.
 * @returns The access token string or null if not available.
 */
export function getAccessToken(): string | null {
    // TODO: Implement logic to check token expiry and use refresh token if necessary
    return accessToken;
}

/**
 * Initializes the authentication module.
 * Placeholder for future logic like loading persisted tokens.
 */
export function initializeAuth(): void {
    // TODO: Load persisted token from secure storage if available
    console.error("Auth initialized. Checking for persisted token...");
    if (!accessToken) {
        console.error("No persisted access token found.");
    }
}
