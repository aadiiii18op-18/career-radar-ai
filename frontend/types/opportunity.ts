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
}
