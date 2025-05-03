# Fitbit MCP Server

This project implements a Model Context Protocol (MCP) server that acts as a bridge between an LLM (like Claude) and the Fitbit API.

It allows the LLM to request and retrieve health and fitness data from a user's Fitbit account via defined tools.

## Features

*   **Fitbit API Integration:** Connects securely to the Fitbit API using OAuth 2.0.
*   **MCP Compliance:** Exposes Fitbit data through tools compliant with the Model Context Protocol.
*   **Extensible:** Designed to easily add support for more Fitbit API endpoints.

### Supported Endpoints

*   **Weight:**
    *   `get_weight_last_7_days`: Retrieves raw weight data for the past 7 days.
    *   `get_weight_last_30_days`: Retrieves raw weight data for the past 30 days.
    *   *(Note: A 90-day endpoint was attempted but is currently non-functional due to Fitbit API limitations (`Invalid time series period: 90d`).)*

### Planned Endpoints

*   Steps
*   Sleep
*   Heart Rate
*   Activity

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd MCP-Server
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Create Environment File:**
    *   Create a file named `.env` in the project root (`MCP-Server/`).
    *   Add your Fitbit application credentials:
        ```dotenv
        FITBIT_CLIENT_ID=YOUR_FITBIT_CLIENT_ID
        FITBIT_CLIENT_SECRET=YOUR_FITBIT_CLIENT_SECRET
        ```
    *   You can obtain these by registering an application at [dev.fitbit.com](https://dev.fitbit.com/). Ensure the **OAuth 2.0 Application Type** is set to `Personal` and the **Callback URL** is `http://localhost:3000/callback`.

4.  **Build the Project:**
    ```bash
    npm run build
    ```
    This compiles the TypeScript source files (`src/`) into JavaScript files (`build/`).

## Running the Server

1.  **Start the Server:**
    ```bash
    npm start
    ```
    This command executes the compiled JavaScript entry point (`build/index.js`).

2.  **Authorization Flow:**
    *   If this is the first time running the server or if the access token is missing/invalid, the server will automatically start the Fitbit OAuth 2.0 authorization flow.
    *   It will print a message to the console indicating that authorization is needed and attempt to open `http://localhost:3000/auth` in your default web browser.
    *   If the browser doesn't open automatically, navigate to that URL manually.
    *   Log in to your Fitbit account (if necessary) and grant the application permission (specifically for the requested scopes, e.g., 'weight').
    *   You will be redirected to `http://localhost:3000/callback`.
    *   The server will exchange the authorization code for an access token.
    *   A success message will appear in the browser tab, which can then be closed.
    *   The server logs will confirm that the token was received and the temporary auth server was shut down.
    *   The MCP server is now authenticated and ready to handle tool calls from the LLM.

## Available Tools

Once the server is running and authorized, the following tools will be available to the connected LLM:

*   `get_weight_last_7_days`: Fetches raw weight time series data for the last 7 days as a JSON string.
*   `get_weight_last_30_days`: Fetches raw weight time series data for the last 30 days as a JSON string.

## Development

*   Source code is located in the `src/` directory.
*   Run `npm run build` after making changes to the TypeScript files.
*   Run `npm start` to test the changes.
