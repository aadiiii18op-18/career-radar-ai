import axios from "axios";
import * as cheerio from "cheerio";
import { generateFingerprintHash } from "../normalizers/devfolio";
import type { Opportunity } from "../types/opportunity";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TECH_CATEGORIES = [
  { slug: "web-development-internship", name: "Web Development" },
  { slug: "software-development-internship", name: "Software Development" },
  { slug: "machine-learning-internship", name: "AI/ML" },
  { slug: "data-science-internship", name: "Data Science" },
  { slug: "ui-ux-design-internship", name: "UI/UX" }
];

/**
 * Calculates deadline date based on relative posting status age.
 * Standard listings are open for ~21 days from posting date.
 */
function calculateEstimatedDeadline(statusText: string): string {
  const now = new Date();
  let daysAgo = 0;

  const textLower = statusText.toLowerCase().trim();
  if (textLower.includes("few hours") || textLower.includes("today") || textLower.includes("just now")) {
    daysAgo = 0;
  } else if (textLower.includes("yesterday") || textLower.includes("1 day ago")) {
    daysAgo = 1;
  } else {
    const dayMatch = textLower.match(/(\d+)\s+days?\s+ago/);
    const weekMatch = textLower.match(/(\d+)\s+weeks?\s+ago/);
    if (dayMatch && dayMatch[1]) {
      daysAgo = parseInt(dayMatch[1], 10);
    } else if (weekMatch && weekMatch[1]) {
      daysAgo = parseInt(weekMatch[1], 10) * 7;
    }
  }

  const postingDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const estimatedDeadlineDate = new Date(postingDate.getTime() + 21 * 24 * 60 * 60 * 1000);
  return estimatedDeadlineDate.toISOString().split("T")[0];
}

/**
 * Fetches and normalizes Internshala internships for tech categories.
 * Respects max 3 pages per category and a 1000ms delay between requests.
 */
export async function fetchInternshalaOpportunities(): Promise<Opportunity[]> {
  const allOpportunities: Opportunity[] = [];
  const maxPages = 3;
  const delayMs = 1000;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  console.log(`[Internshala Fetcher] Starting paginated ingestion for ${TECH_CATEGORIES.length} tech categories (max ${maxPages} pages)...`);

  for (const cat of TECH_CATEGORIES) {
    console.log(`[Internshala Fetcher] Fetching category: "${cat.name}"`);
    let categoryCount = 0;

    for (let page = 1; page <= maxPages; page++) {
      // Small throttling delay to avoid rate-limiting
      if (page > 1 || allOpportunities.length > 0) {
        await delay(delayMs);
      }

      const pageUrl = page === 1 
        ? `https://internshala.com/internships/${cat.slug}/`
        : `https://internshala.com/internships/${cat.slug}/page-${page}/`;

      try {
        console.log(`[Internshala Fetcher] Fetching page ${page} of ${maxPages} from: ${pageUrl}...`);
        const response = await axios.get(pageUrl, { headers, timeout: 10000 });

        if (response.status !== 200 || !response.data) {
          console.warn(`[Internshala Fetcher] Failed to load page ${page} (HTTP status ${response.status}). Skipping.`);
          break;
        }

        const $ = cheerio.load(response.data);
        const containers = $("div.individual_internship");

        if (containers.length === 0) {
          console.log(`[Internshala Fetcher] No listings found on page ${page}. Stopping pagination for category.`);
          break;
        }

        containers.each((_, el) => {
          const $el = $(el);
          const externalId = $el.attr("internshipid") || $el.attr("id")?.replace("individual_internship_", "") || "";
          
          if (!externalId) return;

          const title = $el.find("h2.job-internship-name a.job-title-href").text().trim();
          const organizer = $el.find(".company-name").text().trim() || $el.find(".company_name p.company-name").text().trim() || "Internshala Company";
          
          const location = $el.find(".locations span").text().replace(/\s+/g, " ").trim();
          const stipend = $el.find(".stipend").text().trim() || "Unspecified";
          const duration = $el.find("i.ic-16-calendar").parent().find("span").text().trim() || "N/A";
          
          const dataHref = $el.attr("data-href") || $el.find("h2.job-internship-name a.job-title-href").attr("href") || "";
          const url = dataHref ? `https://internshala.com${dataHref}` : "https://internshala.com";

          const aboutText = $el.find(".about_job .text").text().replace(/\s+/g, " ").trim();
          const description = `Internship Role: ${title} at ${organizer} in ${location}.\nDuration: ${duration}.\nStipend: ${stipend}.\n\nAbout the role:\n${aboutText || "Details can be found on the application page."}`;

          // Parse tags from both the title and listed skill tags
          const tagsSet = new Set<string>([cat.name, "Internshala"]);
          $el.find(".job_skills .job_skill").each((_, skillEl) => {
            const skill = $(skillEl).text().trim();
            if (skill) tagsSet.add(skill);
          });
          const tags = Array.from(tagsSet);

          // Estimate deadline based on status relative time
          const statusText = $el.find(".color-labels span").text().trim() || "0 days ago";
          const deadline = calculateEstimatedDeadline(statusText);

          const hash = generateFingerprintHash(title, organizer);
          const deadlineDate = new Date(deadline);
          const now = new Date();
          const isActive = deadlineDate >= now;

          const opportunity: Opportunity = {
            id: `internshala_${externalId}`,
            source: "internshala",
            externalId,
            title,
            organizer,
            category: "Internship",
            description,
            deadline,
            url,
            isActive,
            tags,
            hash,
            isDeadlineEstimated: true
          };

          allOpportunities.push(opportunity);
          categoryCount++;
        });

      } catch (err: any) {
        console.error(`[Internshala Fetcher] Error fetching page ${page} of category "${cat.name}":`, err.message);
        break; // Stop page loop on error
      }
    }

    console.log(`[Internshala Fetcher] Category "${cat.name}" fetch complete. Discovered ${categoryCount} items.`);
  }

  return allOpportunities;
}
