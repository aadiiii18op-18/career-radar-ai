import type { Opportunity } from "@/types/opportunity";
import type { UserProfile } from "@/types/profile";

export interface MatchBreakdown {
  skillsScore: number;
  interestScore: number;
  categoryScore: number;
  goalScore: number;
  completenessScore: number;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  breakdown?: MatchBreakdown;
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
 * Calculates user profile completion percentage (0 to 100) based on the 6 match-critical fields:
 * - branch
 * - year
 * - skills (non-empty)
 * - interests (non-empty)
 * - careerGoal
 * - preferredDomains (non-empty)
 */
export function calculateProfileCompletion(profile: Omit<UserProfile, "updatedAt"> | null): number {
  if (!profile) return 0;
  let filled = 0;
  const total = 6;
  if (profile.branch && profile.branch.trim() !== "") filled++;
  if (profile.year && profile.year.trim() !== "") filled++;
  if (profile.skills && profile.skills.length > 0) filled++;
  if (profile.interests && profile.interests.length > 0) filled++;
  if (profile.careerGoal && profile.careerGoal.trim() !== "") filled++;
  if (profile.preferredDomains && profile.preferredDomains.length > 0) filled++;
  return Math.round((filled / total) * 100);
}

/**
 * Returns the recommendation strength string based on the match score.
 */
export function getRecommendationStrength(score: number): "Excellent Match" | "Strong Match" | "Moderate Match" | "Weak Match" {
  if (score >= 90) return "Excellent Match";
  if (score >= 75) return "Strong Match";
  if (score >= 50) return "Moderate Match";
  return "Weak Match";
}

/**
 * Deterministic AI Match Score Calculation v2.
 * Weights: Skills = 40%, Interests = 25%, Category = 15%, Goal/Domains = 10%, Profile Completeness = 10%.
 * Score range: [0%, 100%].
 */
export function calculateMatchScore(
  profile: Omit<UserProfile, "updatedAt"> | null,
  opp: Opportunity
): MatchResult {
  if (!profile) {
    return { 
      score: 30, 
      reasons: ["Login to get personalized recommendations"],
      breakdown: {
        skillsScore: 0,
        interestScore: 0,
        categoryScore: 0,
        goalScore: 0,
        completenessScore: 0
      }
    };
  }

  const reasons: string[] = [];
  const textToSearch = `${opp.title} ${opp.description} ${(opp.tags || []).join(" ")} ${opp.category}`.toLowerCase();

  // 1. Skills Match (40% Weight) - Percentage-based
  let skillsScore = 0;
  if (profile.skills && profile.skills.length > 0) {
    const matchedSkills: string[] = [];
    profile.skills.forEach((skill) => {
      if (matchesPhrase(textToSearch, skill)) {
        matchedSkills.push(skill);
      }
    });

    const percentMatched = matchedSkills.length / profile.skills.length;
    skillsScore = percentMatched * 40;

    // Add up to top 2 reasons for matched skills
    matchedSkills.slice(0, 2).forEach((skill) => {
      reasons.push(`Matches ${skill} skill`);
    });
  }

  // 2. Interest Match (25% Weight) - Percentage-based
  let interestScore = 0;
  if (profile.interests && profile.interests.length > 0) {
    const matchedInterests: string[] = [];
    profile.interests.forEach((interest) => {
      if (matchesPhrase(textToSearch, interest)) {
        matchedInterests.push(interest);
      }
    });

    const percentMatched = matchedInterests.length / profile.interests.length;
    interestScore = percentMatched * 25;

    // Add up to top 2 reasons for matched interests
    matchedInterests.slice(0, 2).forEach((interest) => {
      reasons.push(`Matches ${interest} interest`);
    });
  }

  // 3. Category Match (15% Weight)
  let categoryScore = 0;
  let categoryMatched = false;
  const category = opp.category;

  if (category === "Internship") {
    const isUpperclassman = ["3rd Year", "4th Year", "PG / Masters"].includes(profile.year);
    if (isUpperclassman) {
      categoryScore = 15;
      categoryMatched = true;
      reasons.push(`Internship suitable for your academic level`);
    }
  } else if (category === "Hackathon" || category === "Competition") {
    const matchesDevInterests = profile.interests.some(interest => 
      ["Web Development", "Mobile Development", "AI / ML", "Data Science", "Competitive Programming", "Open Source"].includes(interest)
    );
    if (matchesDevInterests) {
      categoryScore = 15;
      categoryMatched = true;
      reasons.push(`Suitable ${category} for development interests`);
    }
  } else if (category === "Scholarship") {
    const isLowerclassman = ["1st Year", "2nd Year"].includes(profile.year);
    if (isLowerclassman) {
      categoryScore = 15;
      categoryMatched = true;
      reasons.push(`Scholarship aligned for early college years`);
    }
  } else if (category === "Fellowship") {
    const hasResearchInterest = profile.interests.some(interest => 
      ["Research", "AI / ML", "Data Science", "Cloud Computing"].includes(interest)
    );
    if (hasResearchInterest) {
      categoryScore = 15;
      categoryMatched = true;
      reasons.push(`Fellowship aligned with research interests`);
    }
  }

  // Fallback category check
  if (!categoryMatched && profile.interests && profile.interests.length > 0) {
    const matchesCategoryWord = profile.interests.some(interest => matchesPhrase(category, interest));
    if (matchesCategoryWord) {
      categoryScore = 15;
      reasons.push(`Matches ${category} category preference`);
    }
  }

  // 4. Career Goal & Preferred Domains Match (10% Weight)
  let goalScore = 0;
  if (profile.careerGoal && profile.careerGoal.trim() !== "") {
    if (matchesPhrase(textToSearch, profile.careerGoal)) {
      goalScore += 5;
      reasons.push(`Aligns with your ${profile.careerGoal} goal`);
    }
  }

  if (profile.preferredDomains && profile.preferredDomains.length > 0) {
    const matchedDomains: string[] = [];
    profile.preferredDomains.forEach((domain) => {
      if (matchesPhrase(textToSearch, domain)) {
        matchedDomains.push(domain);
      }
    });

    if (matchedDomains.length > 0) {
      const percentMatched = matchedDomains.length / profile.preferredDomains.length;
      goalScore += percentMatched * 5;
      matchedDomains.slice(0, 1).forEach((domain) => {
        reasons.push(`Matches ${domain} domain preference`);
      });
    }
  }

  // 5. Profile Completeness Bonus (10% Weight)
  const completenessPercent = calculateProfileCompletion(profile);
  const completenessScore = (completenessPercent / 100) * 10;
  if (completenessPercent === 100) {
    reasons.push("Profile completeness bonus (+10%)");
  }

  // Aggregate and round total score
  const score = Math.min(
    100,
    Math.round(skillsScore + interestScore + categoryScore + goalScore + completenessScore)
  );

  if (reasons.length === 0) {
    reasons.push("General suitability");
  }

  return {
    score,
    reasons,
    breakdown: {
      skillsScore: Math.round(skillsScore),
      interestScore: Math.round(interestScore),
      categoryScore: Math.round(categoryScore),
      goalScore: Math.round(goalScore),
      completenessScore: Math.round(completenessScore),
    }
  };
}
