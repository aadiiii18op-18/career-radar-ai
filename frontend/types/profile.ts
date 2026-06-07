export interface UserProfile {
  fullName: string;
  college: string;
  branch: string;
  year: string;
  skills: string[];
  interests: string[];
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
