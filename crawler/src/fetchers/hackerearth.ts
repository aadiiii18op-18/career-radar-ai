import axios from "axios";

export interface HackerEarthRaw {
  name?: string;
  url?: string;
  start_time?: string;
  end_time?: string;
  duration?: string | number;
  site?: string;
  status?: string;
  // CLIST specific fields:
  event?: string;
  contest?: string;
  href?: string;
  start?: string;
  end?: string;
}

// Static mock data fallback to safeguard dry-run verification and normalizer execution during API outages
const MOCK_HACKEREARTH_DATA: HackerEarthRaw[] = [
  {
    name: "HackerEarth India Hiring Challenge 2026",
    url: "https://www.hackerearth.com/challenges/hiring/india-hiring-challenge-2026/",
    start_time: "2026-07-01T10:00:00.000Z",
    end_time: "2026-07-05T18:00:00.000Z",
    site: "HackerEarth"
  },
  {
    name: "Google Gemini Hackathon with HackerEarth",
    url: "https://www.hackerearth.com/challenges/hackathon/gemini-ai-hackathon-2026/",
    start_time: "2026-06-15T09:00:00.000Z",
    end_time: "2026-06-20T21:00:00.000Z",
    site: "HackerEarth"
  },
  {
    name: "HackerEarth Competitive Coding Arena - Round 4",
    url: "https://www.hackerearth.com/challenges/competitive/coding-arena-round-4/",
    start_time: "2026-06-25T14:00:00.000Z",
    end_time: "2026-06-25T17:00:00.000Z",
    site: "HackerEarth"
  },
  {
    name: "Amazon Software Engineer Recruit Hack",
    url: "https://www.hackerearth.com/challenges/hiring/amazon-software-engineer-recruit-hack/",
    start_time: "2026-08-10T10:00:00.000Z",
    end_time: "2026-08-12T18:00:00.000Z",
    site: "HackerEarth"
  },
  {
    name: "HackerEarth JS and React Developer Challenge",
    url: "https://www.hackerearth.com/challenges/competitive/js-react-challenge-2026/",
    start_time: "2026-06-18T10:00:00.000Z",
    end_time: "2026-06-18T18:00:00.000Z",
    site: "HackerEarth"
  }
];

/**
 * Fetches HackerEarth opportunities.
 * - Prioritizes the CLIST API if environment credentials (CLIST_USERNAME and CLIST_API_KEY) are present.
 * - Falls back to Kontests API as a secondary keyless option.
 * - Restricts the static mock database fallback exclusively to local development/dry-run testing.
 */
export async function fetchHackerEarthChallenges(): Promise<{ data: HackerEarthRaw[]; isClist: boolean }> {
  const clistUsername = process.env.CLIST_USERNAME;
  const clistApiKey = process.env.CLIST_API_KEY;
  const isDryRun = process.env.DRY_RUN !== "false" && (process.env.DRY_RUN === "true" || !process.env.FIREBASE_SERVICE_ACCOUNT);

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  // 1. Preferred Production Source: CLIST API (when keys exist)
  if (clistUsername && clistApiKey) {
    console.log("[HackerEarth Fetcher] CLIST credentials detected. Querying CLIST API as preferred production source...");
    const url = "https://clist.by/api/v1/contest/";
    try {
      const response = await axios.get(url, {
        params: {
          username: clistUsername,
          api_key: clistApiKey,
          resource__name: "hackerearth.com",
          order_by: "start",
          end__gt: new Date().toISOString(), // Fetch future/ongoing contests
        },
        headers,
        timeout: 10000,
      });

      if (response.status === 200 && response.data && Array.isArray(response.data.objects)) {
        console.log(`[HackerEarth Fetcher] Successfully retrieved ${response.data.objects.length} contests from CLIST API.`);
        return { data: response.data.objects, isClist: true };
      }
      console.warn("[HackerEarth Fetcher] Unexpected CLIST response structure.");
    } catch (err: any) {
      console.error("[HackerEarth Fetcher] CLIST API query failed:", err.message);
    }
  } else {
    console.log("[HackerEarth Fetcher] No CLIST credentials detected in environment.");
  }

  // 2. Unreliable Secondary Source: Public Kontests API
  console.log("[HackerEarth Fetcher] Attempting query to public Kontests API...");
  const url = "https://kontests.net/api/v1/hackerearth";
  try {
    const response = await axios.get(url, { headers, timeout: 5000 });
    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      console.log(`[HackerEarth Fetcher] Successfully retrieved ${response.data.length} contests from Kontests API.`);
      return { data: response.data, isClist: false };
    }
    throw new Error(`Unexpected status code: ${response.status} or empty response`);
  } catch (err: any) {
    console.warn(`[HackerEarth Fetcher] Kontests API query failed: ${err.message}`);
    
    // 3. Dry Run / Local Testing Safeguard: Only return mocks in local mode, never in production
    if (isDryRun) {
      console.log("[HackerEarth Fetcher] Running in Local Development/Dry Run mode. Activating static mock fallback database...");
      return { data: MOCK_HACKEREARTH_DATA, isClist: false };
    } else {
      console.error("[HackerEarth Fetcher] Production run: Mock fallback skipped. Returning empty list to prevent DB pollution.");
      return { data: [], isClist: false };
    }
  }
}
