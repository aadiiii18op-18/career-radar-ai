import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
} from "firebase/firestore";
import type { Opportunity } from "@/types/opportunity";
import { getFirebaseDb } from "@/lib/firebase/config";
import type { UserProfile } from "@/types/profile";

/**
 * Fetch the profile document for a given user UID.
 * Returns null if the document does not exist yet.
 */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(getFirebaseDb(), "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    fullName:   data.fullName   ?? "",
    college:    data.college    ?? "",
    branch:     data.branch     ?? "",
    year:       data.year       ?? "",
    skills:     data.skills     ?? [],
    interests:  data.interests  ?? [],
    updatedAt:  data.updatedAt?.toDate?.() ?? undefined,
  };
}

/**
 * Create or merge the profile document for a given user UID.
 * merge: true ensures no existing fields are deleted on partial save.
 */
export async function saveProfile(
  uid: string,
  profile: Omit<UserProfile, "updatedAt">
): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", uid);
  await setDoc(
    ref,
    { ...profile, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Save an opportunity for a user.
 */
export async function saveOpportunity(uid: string, opportunityId: string): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", uid, "saved_opportunities", opportunityId);
  await setDoc(ref, { savedAt: serverTimestamp() });
}

/**
 * Unsave/remove a bookmarked opportunity for a user.
 */
export async function unsaveOpportunity(uid: string, opportunityId: string): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", uid, "saved_opportunities", opportunityId);
  await deleteDoc(ref);
}

/**
 * Fetch all saved opportunity IDs for a user.
 */
export async function getSavedOpportunities(uid: string): Promise<string[]> {
  const colRef = collection(getFirebaseDb(), "users", uid, "saved_opportunities");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => d.id);
}

/**
 * Fetch all opportunities from the Firestore collection.
 */
export async function getOpportunities(): Promise<Opportunity[]> {
  const colRef = collection(getFirebaseDb(), "opportunities");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? "",
      category: data.category ?? "Internship",
      organizer: data.organizer ?? "",
      deadline: data.deadline ?? "",
      description: data.description ?? "",
      applyUrl: data.applyUrl ?? data.url ?? "",
      url: data.url,
      source: data.source,
      externalId: data.externalId,
      updatedAt: data.updatedAt,
      isActive: data.isActive,
      tags: data.tags,
      hash: data.hash,
    };
  });
}

/**
 * Create a new opportunity in Firestore.
 */
export async function createOpportunity(
  opportunity: Omit<Opportunity, "id">
): Promise<string> {
  const colRef = collection(getFirebaseDb(), "opportunities");
  const docRef = await addDoc(colRef, {
    ...opportunity,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export type ApplicationStatus = "applied" | "interview" | "offer" | "rejected";

export interface Application {
  opportunityId: string;
  status: ApplicationStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Fetch all applications for a user.
 */
export async function getApplications(uid: string): Promise<Application[]> {
  const colRef = collection(getFirebaseDb(), "users", uid, "applications");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      opportunityId: d.id,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

/**
 * Set/update application status.
 */
export async function setApplicationStatus(
  uid: string,
  opportunityId: string,
  status: ApplicationStatus
): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", uid, "applications", opportunityId);
  const snap = await getDoc(ref);
  const now = serverTimestamp();

  if (snap.exists()) {
    await setDoc(ref, { status, updatedAt: now }, { merge: true });
  } else {
    await setDoc(ref, { opportunityId, status, createdAt: now, updatedAt: now });
  }
}

/**
 * Remove an application from tracker.
 */
export async function removeApplication(uid: string, opportunityId: string): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", uid, "applications", opportunityId);
  await deleteDoc(ref);
}

/**
 * Check if a fingerprint hash already exists in Firestore.
 * Used for cross-source deduplication on the client.
 */
export async function isDuplicateHash(hash: string): Promise<boolean> {
  const colRef = collection(getFirebaseDb(), "opportunities");
  const q = query(colRef, where("hash", "==", hash));
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Upserts a normalized opportunity into the opportunities collection.
 * Uses source_externalId as document ID. Preserves createdAt.
 */
export async function upsertOpportunity(opportunity: Opportunity): Promise<"inserted" | "updated"> {
  const ref = doc(getFirebaseDb(), "opportunities", opportunity.id);
  const snap = await getDoc(ref);
  const now = serverTimestamp();

  if (snap.exists()) {
    // Exclude createdAt and id from update
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt: _createdAt, id: _id, ...updateData } = opportunity;
    await setDoc(ref, { ...updateData, updatedAt: now }, { merge: true });
    return "updated";
  } else {
    await setDoc(ref, { ...opportunity, createdAt: now, updatedAt: now });
    return "inserted";
  }
}

/**
 * Soft archives opportunities whose deadline is in the past.
 * Sets isActive to false. Returns count of archived documents.
 */
export async function archiveExpiredOpportunities(): Promise<number> {
  const opportunities = await getOpportunities();
  const todayStr = new Date().toISOString().split("T")[0];
  
  const expiredActive = opportunities.filter(
    (opp) => opp.deadline < todayStr && opp.isActive !== false
  );
  
  let count = 0;
  for (const opp of expiredActive) {
    const ref = doc(getFirebaseDb(), "opportunities", opp.id);
    await setDoc(ref, { isActive: false }, { merge: true });
    count++;
  }
  return count;
}

export interface OpportunityStats {
  total: number;
  active: number;
  expired: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
}

/**
 * Calculates overall counts, status counts, source distribution, and category distribution.
 */
export async function getOpportunityStats(): Promise<OpportunityStats> {
  const opportunities = await getOpportunities();
  const todayStr = new Date().toISOString().split("T")[0];
  
  const stats: OpportunityStats = {
    total: opportunities.length,
    active: 0,
    expired: 0,
    bySource: {},
    byCategory: {},
  };
  
  opportunities.forEach((opp) => {
    const isExpired = opp.deadline < todayStr || opp.isActive === false;
    if (isExpired) {
      stats.expired++;
    } else {
      stats.active++;
    }
    
    const source = opp.source || "manual";
    stats.bySource[source] = (stats.bySource[source] || 0) + 1;
    
    stats.byCategory[opp.category] = (stats.byCategory[opp.category] || 0) + 1;
  });
  
  return stats;
}

export interface DataQualityMetrics {
  missingTitle: number;
  missingDescription: number;
  missingDeadline: number;
  missingOrganizer: number;
  missingUrl: number;
  completenessPercentage: number;
}

/**
 * Checks for missing critical opportunity fields and computes database completeness metric.
 */
export async function getDataQualityMetrics(): Promise<DataQualityMetrics> {
  const opportunities = await getOpportunities();
  const metrics: DataQualityMetrics = {
    missingTitle: 0,
    missingDescription: 0,
    missingDeadline: 0,
    missingOrganizer: 0,
    missingUrl: 0,
    completenessPercentage: 100,
  };
  
  if (opportunities.length === 0) return metrics;
  
  const totalFields = opportunities.length * 5;
  let populatedFields = 0;
  
  opportunities.forEach((opp) => {
    const hasTitle = opp.title && opp.title.trim() !== "" && opp.title !== "N/A";
    const hasDesc = opp.description && opp.description.trim() !== "";
    const hasDeadline = opp.deadline && opp.deadline.trim() !== "";
    const hasOrganizer = opp.organizer && opp.organizer.trim() !== "" && opp.organizer !== "Devfolio Event" && opp.organizer !== "Unstop Event";
    const hasUrl = opp.applyUrl && opp.applyUrl.trim() !== "";
    
    if (hasTitle) populatedFields++; else metrics.missingTitle++;
    if (hasDesc) populatedFields++; else metrics.missingDescription++;
    if (hasDeadline) populatedFields++; else metrics.missingDeadline++;
    if (hasOrganizer) populatedFields++; else metrics.missingOrganizer++;
    if (hasUrl) populatedFields++; else metrics.missingUrl++;
  });
  
  metrics.completenessPercentage = Math.round((populatedFields / totalFields) * 100);
  return metrics;
}

export interface DuplicateReport {
  totalUniqueHashes: number;
  duplicateHashesCount: number;
  duplicateRecordsCount: number;
  duplicateGroups: Array<{
    hash: string;
    opportunities: Opportunity[];
  }>;
}

/**
 * Scans the database using fingerprint hashes to identify and group duplicate opportunity listings.
 */
export async function getDuplicateReport(): Promise<DuplicateReport> {
  const opportunities = await getOpportunities();
  const hashGroups: Record<string, Opportunity[]> = {};
  
  opportunities.forEach((opp) => {
    if (opp.hash && opp.hash.trim() !== "") {
      if (!hashGroups[opp.hash]) {
        hashGroups[opp.hash] = [];
      }
      hashGroups[opp.hash].push(opp);
    }
  });
  
  const report: DuplicateReport = {
    totalUniqueHashes: Object.keys(hashGroups).length,
    duplicateHashesCount: 0,
    duplicateRecordsCount: 0,
    duplicateGroups: [],
  };
  
  Object.entries(hashGroups).forEach(([hash, group]) => {
    if (group.length > 1) {
      report.duplicateHashesCount++;
      report.duplicateRecordsCount += group.length;
      report.duplicateGroups.push({
        hash,
        opportunities: group,
      });
    }
  });
  
  return report;
}
