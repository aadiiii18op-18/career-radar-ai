import { generateFingerprintHash } from "./devfolio";
import type { Opportunity } from "../types/opportunity";
import type { HackerEarthRaw } from "../fetchers/hackerearth";

/**
 * Extracts a unique slug from a HackerEarth challenge URL to serve as externalId.
 */
export function extractHackerEarthSlug(url: string): string {
  if (!url) return "";
  // Matches the last segment of the path in a HackerEarth challenge URL
  const match = url.match(/\/challenges\/(?:hackathon|competitive|hiring|jobs|test|college)\/([^/]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback: extract the last non-empty segment of the URL path
  const segments = url.replace(/\/$/, "").split("/");
  const lastSegment = segments[segments.length - 1] || "";
  return lastSegment.toLowerCase();
}

/**
 * Maps the challenge title/URL to the existing CareerRadar categories: "Hackathon" or "Competition".
 * (Per modifications: Coding & Hiring challenges are mapped to "Competition").
 */
export function mapHackerEarthCategory(title: string, url: string): "Hackathon" | "Competition" {
  const t = title.toLowerCase();
  const u = url.toLowerCase();

  // If it's explicitly styled as a hackathon
  if (t.includes("hackathon") || t.includes(" hack ") || t.includes("hackday") || u.includes("/hackathon/")) {
    return "Hackathon";
  }

  // Fallback for all other challenges (Coding, Hiring, Quiz, Competitive programming)
  return "Competition";
}

/**
 * Normalizes HackerEarth raw items into the standard Opportunity schema.
 */
export function normalizeHackerEarthOpportunity(rawItem: HackerEarthRaw, isClist: boolean): Opportunity {
  const title = (isClist ? rawItem.event || rawItem.contest : rawItem.name) || "HackerEarth Challenge";
  const url = (isClist ? rawItem.href : rawItem.url) || "https://www.hackerearth.com/challenges/";
  
  const externalId = extractHackerEarthSlug(url) || Math.random().toString(36).substring(7);
  const organizer = "HackerEarth";

  // Map categories strictly to "Hackathon" | "Competition"
  const category = mapHackerEarthCategory(title, url);

  // Parse and normalize deadline (YYYY-MM-DD)
  const deadlineRaw = (isClist ? rawItem.end : rawItem.end_time) || "";
  let deadline = new Date().toISOString().split("T")[0];
  if (deadlineRaw) {
    deadline = deadlineRaw.split("T")[0] || deadline;
  }

  // Create human-readable description since the API only returns schedule details
  const cleanTitle = title.trim();
  const description = `Join the '${cleanTitle}' opportunity on HackerEarth. Test your algorithmic capabilities, compete against global developers, build projects, and unlock recruiting prospects. Open to student programmers and software developers.`;

  // Dynamically extract tags/skills from the title
  const tagsSet = new Set<string>(["Coding", "HackerEarth"]);
  const titleLower = title.toLowerCase();
  
  const keywordTags: Record<string, string> = {
    react: "React",
    javascript: "JavaScript",
    js: "JavaScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
    "c++": "C++",
    rust: "Rust",
    go: "Go",
    "data science": "Data Science",
    ml: "Machine Learning",
    ai: "AI",
    "artificial intelligence": "AI",
    blockchain: "Blockchain",
    web3: "Web3",
    cloud: "Cloud Computing",
    aws: "AWS",
    cybersecurity: "Cybersecurity",
    security: "Cybersecurity",
    mobile: "Mobile App Development",
    android: "Android",
    ios: "iOS",
    design: "UI/UX Design",
    ux: "UI/UX Design",
    hiring: "Hiring",
    recruit: "Hiring",
    job: "Hiring",
    intern: "Internship",
  };

  for (const [key, value] of Object.entries(keywordTags)) {
    if (titleLower.includes(key)) {
      tagsSet.add(value);
    }
  }
  const tags = Array.from(tagsSet);

  const hash = generateFingerprintHash(title, organizer);
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const isActive = deadlineDate >= now;

  return {
    id: `hackerearth_${externalId}`,
    source: "hackerearth",
    externalId,
    title,
    organizer,
    category,
    description,
    deadline,
    url,
    isActive,
    tags,
    hash,
  };
}
