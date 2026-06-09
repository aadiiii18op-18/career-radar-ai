export type OpportunityCategory =
  | "Internship"
  | "Hackathon"
  | "Scholarship"
  | "Fellowship"
  | "Competition";

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  organizer: string;
  deadline: string;
  description: string;
  applyUrl: string;
  url?: string;
  
  // Ingestion source metadata:
  source?: string;
  externalId?: string;
  updatedAt?: unknown;
  createdAt?: unknown;
  isActive?: boolean;
  views?: number;
  tags?: string[];
  hash?: string;
  isDeadlineEstimated?: boolean;
}
