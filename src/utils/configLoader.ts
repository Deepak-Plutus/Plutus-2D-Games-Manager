import type { GameDefinition } from "../Definitions/GameDefinition";


/**
 * Fetches the game configuration from an S3 bucket.
 * @param s3Url - The full URL to the game-config.json file in S3
 * @returns The parsed GameConfig object
 * @throws Error if the fetch fails or the config is invalid
 */
export async function fetchGameConfigFromS3(
  s3Url: string,
): Promise<GameDefinition> {
  try {
    const response = await fetch(s3Url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch game config: ${response.status} ${response.statusText}`,
      );
    }

    const config = await response.json();
    return config as GameDefinition;
  } catch (error) {
    console.error("Error fetching game config from S3:", error);
    throw new Error(
      `Unable to load game configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Extracts the S3 config URL from the address bar query parameter.
 * Looks for ?config=<url> in the URL.
 * @returns The S3 URL from query param, or null if not found
 */
export function getConfigUrlFromQueryParam(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const configUrl = urlParams.get("config");

  if (configUrl) {
    console.log("Found config URL in query parameter:", configUrl);
    return configUrl;
  }

  return null;
}
