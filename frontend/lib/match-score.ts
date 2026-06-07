import type { Opportunity } from "@/types/opportunity";
import type { UserProfile } from "@/types/profile";

export interface MatchResult {
  score: number;
  reasons: string[];
}

/**
 * Checks if a search phrase exactly matches a word/token in the target text.
 * Prevents substring matches like "C" matching "C++", "Java" matching "JavaScript",
 * or "React" matching "Reactive".
 */
export function matchesPhrase(text: string, phrase: string): boolean {
  const t = text.toLowerCase();
  const p = phrase.toLowerCase().trim();

  if (!p) return false;

  let index = t.indexOf(p);
  while (index !== -1) {
    const charBefore = index > 0 ? t[index - 1] : "";
    const charAfter = index + p.length < t.length ? t[index + p.length] : "";

    // Boundaries: matched word must not be part of a larger alphanumeric/programming word.
    // Programming symbols like +, #, ., - are treated as part of the word (e.g. C++, C#, Node.js, React-native)
    const isAlphanumericOrProgSymbol = (char: string) => {
      if (!char) return false;
      return /[a-z0-9+#.\-]/.test(char);
    };

    if (!isAlphanumericOrProgSymbol(charBefore) && !isAlphanumericOrProgSymbol(charAfter)) {
      return true;
    }

    index = t.indexOf(p, index + 1);
  }
  return false;
}

/**
 * Deterministic AI Match Score Calculation.
 * Weights: Skills = 50%, Interests = 35%, Branch/Year = 15%.
 * Score range: [30%, 99%].
 */
export function calculateMatchScore(
  profile: Omit<UserProfile, "updatedAt"> | null,
  opp: Opportunity
): MatchResult {
  if (!profile) {
    return { score: 30, reasons: [] };
  }

  let skillsPoints = 0;
  let interestsPoints = 0;
  let contextPoints = 0;
  const reasons: string[] = [];

  const title = opp.title;
  const desc = opp.description;
  const textToSearch = `${title} ${desc}`;

  // 1. Skills match (50% weight)
  if (profile.skills && profile.skills.length > 0) {
    profile.skills.forEach((skill) => {
      if (matchesPhrase(textToSearch, skill)) {
        skillsPoints += 25;
        if (reasons.length < 3) {
          reasons.push(`${skill} skill matched`);
        }
      }
    });
  }
  const finalSkillsPoints = Math.min(skillsPoints, 50);

  // 2. Interests match (35% weight)
  if (profile.interests && profile.interests.length > 0) {
    profile.interests.forEach((interest) => {
      if (matchesPhrase(textToSearch, interest)) {
        interestsPoints += 20;
        if (reasons.length < 3) {
          reasons.push(`${interest} interest matched`);
        }
      }
    });
  }
  const finalInterestsPoints = Math.min(interestsPoints, 35);

  // 3. Branch / Year relevance (15% weight)
  if (profile.branch) {
    const branchKeywords = profile.branch.split(/\s+/).filter((k) => k.length > 3);
    const matchesBranch = branchKeywords.some((keyword) => matchesPhrase(textToSearch, keyword));
    if (matchesBranch) {
      contextPoints += 10;
      if (reasons.length < 3) {
        let displayBranch = profile.branch;
        if (displayBranch.toLowerCase().includes("computer science")) {
          displayBranch = "CSE";
        }
        reasons.push(`${displayBranch} branch aligned`);
      }
    }
  }

  if (profile.year) {
    const isUpperclassman = ["3rd Year", "4th Year", "PG / Masters"].includes(profile.year);
    let matchedYear = false;
    if (opp.category === "Internship" && isUpperclassman) {
      contextPoints += 5;
      matchedYear = true;
    } else if (opp.category === "Scholarship" && !isUpperclassman) {
      contextPoints += 5;
      matchedYear = true;
    } else if (matchesPhrase(textToSearch, profile.year)) {
      contextPoints += 5;
      matchedYear = true;
    }

    if (matchedYear && reasons.length < 3) {
      reasons.push(`${profile.year} relevant`);
    }
  }
  const finalContextPoints = Math.min(contextPoints, 15);

  const rawScore = finalSkillsPoints + finalInterestsPoints + finalContextPoints;
  
  // Mapping 0-100 score to 30-99 range:
  // Formula: 30 + Math.round(rawScore * 0.69)
  const score = Math.max(30, Math.min(99, 30 + Math.round(rawScore * 0.69)));

  if (reasons.length === 0) {
    reasons.push("General suitability");
  }

  return { score, reasons };
}
