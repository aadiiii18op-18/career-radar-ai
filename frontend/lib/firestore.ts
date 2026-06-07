import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
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
