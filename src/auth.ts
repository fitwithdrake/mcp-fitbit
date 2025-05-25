import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import http from 'http';
import open from 'open';
import path from 'path';
import { AuthorizationCode, AccessToken } from 'simple-oauth2';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Determine the directory of the current module (build/auth.js)
const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);

// Load environment variables from .env file located in the project root
const envPath = path.resolve(currentDirname, '..', '.env');
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
// Storage for the access token and token data
let accessToken: string | null = null;
let tokenData: any = null;
// Holds the temporary HTTP server instance used for the OAuth callback
let oauthServer: http.Server | null = null;

// --- File paths for token persistence ---
const TOKEN_FILE_PATH = path.resolve(currentDirname, '..', '.fitbit-token.json');

// --- OAuth Client Initialization ---
const oauthClient = new AuthorizationCode(fitbitConfig);

/**
 * Saves the token data to a file for persistence
 * @param tokenData The token data to save
 */
async function saveTokenToFile(tokenData: any): Promise<void> {
    try {
        await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2), 'utf8');
        console.error(`Token saved to ${TOKEN_FILE_PATH}`);
    } catch (error) {
        console.error(`Error saving token to file: ${error}`);
    }
}

/**
 * Loads the token data from file
 * @returns The token data or null if not found
 */
async function loadTokenFromFile(): Promise<any> {
    try {
        if (!existsSync(TOKEN_FILE_PATH)) {
            console.error(`Token file not found at ${TOKEN_FILE_PATH}`);
            return null;
        }
        
        const data = await fs.readFile(TOKEN_FILE_PATH, 'utf8');
        const parsedData = JSON.parse(data);
        console.error('Token loaded from file successfully');
        return parsedData;
    } catch (error) {
        console.error(`Error loading token from file: ${error}`);
        return null;
    }
}

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
        scope: 'weight sleep profile activity heartrate nutrition',
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
            tokenData = tokenResult.token;
            
            // Persist token data to file
            await saveTokenToFile(tokenData);
            console.error('Token data has been persisted to file');

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
 * Loads persisted token from file storage if available.
 */
export async function initializeAuth(): Promise<void> {
    console.error("Auth initialized. Checking for persisted token...");
    
    try {
        // Load token data from file
        tokenData = await loadTokenFromFile();
        
        if (tokenData && tokenData.access_token) {
            accessToken = tokenData.access_token;
            console.error("Persisted access token loaded successfully.");
            
            // Check if token is expired and needs refresh
            if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
                console.error("Token is expired. Attempting to refresh...");
                try {
                    // Create AccessToken instance from the loaded token data
                    const accessTokenObj = oauthClient.createToken(tokenData);
                    
                    // Refresh the token
                    if (accessTokenObj.expired()) {
                        const refreshedToken = await accessTokenObj.refresh();
                        accessToken = refreshedToken.token.access_token as string;
                        tokenData = refreshedToken.token;
                        
                        // Save the refreshed token
                        await saveTokenToFile(tokenData);
                        console.error("Token refreshed and saved successfully.");
                    }
                } catch (refreshError) {
                    console.error("Failed to refresh token:", refreshError);
                    accessToken = null;
                    tokenData = null;
                }
            }
        } else {
            console.error("No persisted access token found or token data is invalid.");
        }
    } catch (error) {
        console.error("Error during token initialization:", error);
    }
}
