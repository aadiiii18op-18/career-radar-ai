import crypto from "crypto";
import type { Opportunity } from "../types/opportunity";

/**
 * Normalizes title and organizer, then generates a SHA-256 fingerprint hash
 * to enable cross-platform deduplication.
 */
export function generateFingerprintHash(title: string, organizer: string): string {
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedOrganizer = organizer.toLowerCase().replace(/[^a-z0-9]/g, "");
  return crypto
    .createHash("sha256")
    .update(`${normalizedTitle}_${normalizedOrganizer}`)
    .digest("hex");
}

/**
 * Sanitizes markdown content to return cleaner snippet text.
 */
export function sanitizeDescription(markdownDesc: string): string {
  if (!markdownDesc) return "";
  return markdownDesc
    .replace(/[#*`_\-]/g, "") // Remove common markdown symbols
    .replace(/\s+/g, " ")    // Collapse extra whitespace
    .trim();
}

/**
 * Normalizes raw Devfolio opportunity payloads into the standard schema.
 */
export function normalizeDevfolioOpportunity(rawItem: any): Opportunity {
  const externalId = rawItem.uuid || rawItem.id || "";
  const title = rawItem.name || "N/A";
  
  // Extract organizer name safely from subdomain or email
  const subdomain = rawItem.hackathon_setting?.subdomain || rawItem.slug || "";
  const organizer = rawItem.hackathon_setting?.contact_email
    ? rawItem.hackathon_setting.contact_email.split("@")[0].toUpperCase()
    : subdomain
      ? subdomain.charAt(0).toUpperCase() + subdomain.slice(1)
      : "Devfolio Event";

  const slug = rawItem.slug;
  const url = slug ? `https://${slug}.devfolio.co/` : rawItem.hackathon_setting?.site_url || "https://devfolio.co/hackathons";
  
  // Registration deadline date
  const deadlineRaw = rawItem.hackathon_setting?.reg_ends_at || rawItem.ends_at || rawItem.starts_at || "";
  const deadline = deadlineRaw ? deadlineRaw.split("T")[0] : new Date().toISOString().split("T")[0];

  const description = sanitizeDescription(rawItem.desc || rawItem.tagline || "");

  // Extracted tags
  const tags = Array.isArray(rawItem.themes)
    ? rawItem.themes.map((t: any) => t.name).filter(Boolean)
    : [];

  const hash = generateFingerprintHash(title, organizer);

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const isActive = deadlineDate >= now;

  return {
    id: `devfolio_${externalId}`,
    source: "devfolio",
    externalId,
    title,
    organizer,
    category: "Hackathon",
    description,
    deadline,
    url,
    isActive,
    tags,
    hash,
  };
}
