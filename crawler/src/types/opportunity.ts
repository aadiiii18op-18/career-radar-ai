export type OpportunityCategory =
  | "Internship"
  | "Hackathon"
  | "Scholarship"
  | "Fellowship"
  | "Competition";

export interface Opportunity {
  id: string;             // Composite ID format: source_externalId (e.g., "devfolio_af04ba...")
  source: string;         // Identifier of origin platform (e.g., "devfolio")
  externalId: string;     // Unique identifier from the origin platform
  title: string;
  organizer: string;
  category: OpportunityCategory;
  description: string;    // Sanitized description text
  deadline: string;       // YYYY-MM-DD format
  url: string;            // Direct application/details URL
  isActive: boolean;      // Status flag indicating whether the opportunity is open
  tags: string[];         // Extracted skills/themes (e.g., ["AI", "React"])
  hash: string;           // SHA-256 fingerprint hash of normalized title + organizer for cross-platform deduplication
  createdAt?: unknown;    // Timestamp in DB
  updatedAt?: unknown;    // Timestamp in DB
}

export interface SourcePlugin {
  sourceName: string;
  fetch(): Promise<any[]>;
  normalize(rawData: any): Opportunity;
}
