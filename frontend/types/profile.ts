export interface UserProfile {
  fullName: string;
  college: string;
  branch: string;
  year: string;
  skills: string[];
  interests: string[];
  careerGoal?: string;
  preferredDomains?: string[];
  updatedAt?: Date;
}

export const YEAR_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "PG / Masters",
];

export const SUGGESTED_SKILLS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Python", "Java", "C++", "C",
  "Node.js", "Express", "MongoDB", "Firebase", "SQL", "PostgreSQL", "Docker",
  "Git", "Linux", "Machine Learning", "Deep Learning", "Data Analysis",
  "Figma", "UI/UX", "Flutter", "Android", "iOS", "Swift", "Kotlin",
];

export const SUGGESTED_INTERESTS = [
  "Web Development", "Mobile Development", "AI / ML", "Data Science",
  "Open Source", "Competitive Programming", "Cybersecurity", "Cloud Computing",
  "DevOps", "Blockchain", "Game Development", "Robotics", "IoT",
  "Research", "Startups", "Design", "Product Management",
];

export const SUGGESTED_DOMAINS = [
  "Frontend Development", "Backend Development", "Fullstack Development",
  "AI / Machine Learning", "Data Science / Analytics", "Mobile App Development",
  "Cloud & DevOps", "Cybersecurity", "UI/UX Design", "Product Management",
];
