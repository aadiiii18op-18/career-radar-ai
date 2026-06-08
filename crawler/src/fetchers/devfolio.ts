import axios from "axios";

// Delay helper for backoff retries
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches raw live opportunities from Devfolio REST API.
 * Implements headers for user-agent emulation and retry logic with backoff.
 */
export async function fetchDevfolioHackathons(retries = 3, backoff = 1000): Promise<any[]> {
  const url = "https://api.devfolio.co/api/hackathons";
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Devfolio Fetcher] Fetching hackathons list (Attempt ${attempt}/${retries})...`);
      const response = await axios.get(url, {
        params: {
          filter: "application_open",
          page: 1,
          limit: 20
        },
        headers,
      });

      if (response.status === 200 && response.data) {
        return response.data.result || [];
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error: any) {
      console.error(`[Devfolio Fetcher] Attempt ${attempt} failed:`, error.message);
      if (attempt === retries) {
        throw new Error(`Failed to fetch after ${retries} attempts: ${error.message}`);
      }
      const backoffMs = backoff * Math.pow(2, attempt - 1);
      console.log(`[Devfolio Fetcher] Retrying in ${backoffMs}ms...`);
      await delay(backoffMs);
    }
  }
  return [];
}
