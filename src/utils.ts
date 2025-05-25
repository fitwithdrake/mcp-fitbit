/**
 * Shared utility functions for Fitbit API integration
 */

// Common constants
export const USER_AGENT = 'mcp-fitbit-server/1.0';

// Common response structures for MCP tools
export type TextContent = { type: 'text'; text: string };

export type ToolResponseStructure = {
  content: TextContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Makes a generic request to the Fitbit API.
 * Handles adding the base URL, authorization header, and basic error handling.
 * @param endpoint The specific API endpoint path (e.g., '/body/weight/date/today/30d.json').
 * @param getAccessTokenFn A function that returns the current valid access token or null.
 * @param apiBase The base URL for the API (defaults to v1, can be overridden for different API versions)
 * @returns A promise resolving to the parsed JSON response (type T) or null if the request fails.
 */
export async function makeFitbitRequest<T>(
  endpoint: string,
  getAccessTokenFn: () => Promise<string | null>,
  apiBase: string = 'https://api.fitbit.com/1'
): Promise<T | null> {
  const currentAccessToken = await getAccessTokenFn();
  if (!currentAccessToken) {
    console.error(
      'Error: No Fitbit Access Token available. Please authorize first.'
    );
    return null;
  }

  // Ensure endpoint starts correctly relative to the user path
  const cleanEndpoint = endpoint.startsWith('/')
    ? endpoint.substring(1)
    : endpoint;
  // Construct the full URL including the user scope '-'.
  const url = `${apiBase}/user/-/${cleanEndpoint}`;
  console.error(`Attempting Fitbit API request to: ${url}`);

  const headers = {
    'User-Agent': USER_AGENT,
    Authorization: `Bearer ${currentAccessToken}`,
    Accept: 'application/json',
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Fitbit API Error! Status: ${response.status}, URL: ${url}, Body: ${errorBody}`
      );
      if (response.status === 401) {
        console.error(
          'Access token might be expired or invalid. Re-authorization may be needed.'
        );
        // Consider adding logic here to trigger re-auth automatically if possible
      }
      return null;
    }
    // Handle potential empty response body for certain success statuses (e.g., 204 No Content)
    if (response.status === 204) {
      return {} as T; // Return an empty object or appropriate type for no content
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Error making Fitbit request to ${url}:`, error);
    return null;
  }
}
