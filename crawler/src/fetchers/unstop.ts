import axios from "axios";
import { generateFingerprintHash, sanitizeDescription } from "../normalizers/devfolio";
import type { Opportunity } from "../types/opportunity";

interface UnstopOrganisation {
  name?: string;
}

interface UnstopSkill {
  skill?: string;
}

interface UnstopRegnRequirements {
  end_regn_dt?: string;
}

interface UnstopOpportunityRaw {
  id: number;
  title?: string;
  type?: string;
  subtype?: string;
  details?: string;
  seo_url?: string;
  short_url?: string;
  short_id?: string;
  end_date?: string;
  organisation?: UnstopOrganisation;
  required_skills?: UnstopSkill[];
  regnRequirements?: UnstopRegnRequirements;
}

/**
 * Strips HTML tags and collapses whitespace in descriptions.
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Maps Unstop raw types and query channels to the strict CareerRadar category schema.
 */
function mapCategory(type: string, subtype: string, queryCategory: string): "Hackathon" | "Competition" | "Internship" {
  const t = (type || "").toLowerCase();
  const s = (subtype || "").toLowerCase();
  const qc = (queryCategory || "").toLowerCase();

  if (qc === "internships" || t === "internships" || s === "internships" || s === "internship") {
    return "Internship";
  }
  if (qc === "hackathons" || t === "hackathons" || s === "hackathons" || s === "hackathon") {
    return "Hackathon";
  }
  if (qc === "competitions" || t === "competitions" || s === "competitions" || s === "quiz" || s === "challenge" || s === "case-study") {
    return "Competition";
  }

  // Fallbacks
  if (t === "jobs" && s === "internships") {
    return "Internship";
  }
  return "Competition";
}

/**
 * Fetches and normalizes Unstop opportunities across Hackathons, Competitions, and Internships.
 * Implements browser header emulation, pagination limit checks, and throttling delays.
 */
export async function fetchUnstopOpportunities(): Promise<Opportunity[]> {
  const url = "https://unstop.com/api/public/opportunity/search-new";
  const categoriesToFetch = ["hackathons", "competitions", "internships"];
  const allOpportunities: Opportunity[] = [];
  const limit = 15;
  const maxPages = 5;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  console.log(`[Unstop Fetcher] Starting paginated ingestion (fetching first ${maxPages} pages for each category)...`);

  for (const categoryName of categoriesToFetch) {
    console.log(`[Unstop Fetcher] Fetching category: "${categoryName}"`);
    let categoryCount = 0;

    for (let page = 1; page <= maxPages; page++) {
      try {
        console.log(`[Unstop Fetcher] Fetching page ${page} of ${maxPages}...`);
        const response = await axios.get(url, {
          params: {
            opportunity: categoryName,
            page,
            limit,
          },
          headers,
        });

        if (response.status !== 200 || !response.data || !response.data.data) {
          console.warn(`[Unstop Fetcher] Unexpected API response format or status ${response.status} on page ${page}. Stopping page loop for category.`);
          break;
        }

        const rawList: UnstopOpportunityRaw[] = response.data.data.data || [];
        if (rawList.length === 0) {
          console.log(`[Unstop Fetcher] No items returned on page ${page}. Stopping page loop for category.`);
          break;
        }

        for (const rawItem of rawList) {
          const externalId = String(rawItem.id);
          const title = rawItem.title || "N/A";
          const organizer = rawItem.organisation?.name || "Unstop Event";
          
          const rawDesc = stripHtml(rawItem.details || "");
          const description = sanitizeDescription(rawDesc);

          const deadlineRaw = rawItem.regnRequirements?.end_regn_dt || rawItem.end_date || "";
          const deadline = deadlineRaw ? deadlineRaw.split("T")[0] : new Date().toISOString().split("T")[0];

          const linkUrl = rawItem.seo_url || rawItem.short_url || (rawItem.short_id ? `https://unstop.com/o/${rawItem.short_id}` : "https://unstop.com");

          const category = mapCategory(rawItem.type || "", rawItem.subtype || "", categoryName);
          const tags = Array.isArray(rawItem.required_skills)
            ? (rawItem.required_skills.map((s) => s.skill).filter(Boolean) as string[])
            : [];

          const hash = generateFingerprintHash(title, organizer);
          const deadlineDate = new Date(deadline);
          const now = new Date();
          const isActive = deadlineDate >= now;

          const opportunity: Opportunity = {
            id: `unstop_${externalId}`,
            source: "unstop",
            externalId,
            title,
            organizer,
            category,
            description,
            deadline,
            url: linkUrl,
            tags,
            hash,
            isActive,
          };

          allOpportunities.push(opportunity);
          categoryCount++;
        }

        // Add 500ms delay to prevent rate limit blocks
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err: any) {
        console.error(`[Unstop Fetcher] Error fetching page ${page} of category "${categoryName}":`, err.message);
        break; // Stop page loop for this category on failure
      }
    }
    console.log(`[Unstop Fetcher] Category "${categoryName}" fetch complete. Discovered ${categoryCount} items.`);
  }

  return allOpportunities;
}
