import * as admin from "firebase-admin";
import type { Opportunity } from "../types/opportunity";

let db: admin.firestore.Firestore | null = null;

/**
 * Initializes Firestore admin instance lazily.
 * Uses service account JSON from FIREBASE_SERVICE_ACCOUNT if available,
 * otherwise falls back to local default project ID initialization.
 */
export function initFirestore(): admin.firestore.Firestore {
  if (db) return db;

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectIdEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "career-radar-ai";

  if (serviceAccountEnv) {
    try {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[Firestore Service] Initialized using Service Account environment variable.");
    } catch (err: any) {
      console.error("[Firestore Service] Failed to parse service account JSON:", err.message);
      admin.initializeApp({
        projectId: projectIdEnv,
      });
      console.log("[Firestore Service] Falling back to default project ID initialization.");
    }
  } else {
    admin.initializeApp({
      projectId: projectIdEnv,
    });
    console.log("[Firestore Service] Initialized using default project ID:", projectIdEnv);
  }

  db = admin.firestore();
  return db;
}

/**
 * Check if an opportunity fingerprint hash already exists in Firestore.
 * This is used for cross-source deduplication.
 */
export async function isDuplicateHash(hash: string): Promise<boolean> {
  const firestoreDb = initFirestore();
  const snap = await firestoreDb
    .collection("opportunities")
    .where("hash", "==", hash)
    .limit(1)
    .get();

  return !snap.empty;
}

/**
 * Upserts a normalized opportunity into the opportunities collection.
 * Uses source_externalId as the document ID to guarantee idempotency.
 * Preserves the original createdAt timestamp if the document already exists.
 */
export async function upsertOpportunity(opportunity: Opportunity): Promise<"inserted" | "updated" | "skipped"> {
  const firestoreDb = initFirestore();
  const docRef = firestoreDb.collection("opportunities").doc(opportunity.id);
  const docSnap = await docRef.get();
  
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  if (docSnap.exists) {
    const existing = docSnap.data();
    
    // Check if any key fields changed: deadline, description, tags, title, organizer
    const deadlineChanged = existing?.deadline !== opportunity.deadline;
    const descriptionChanged = existing?.description !== opportunity.description;
    const titleChanged = existing?.title !== opportunity.title;
    const organizerChanged = existing?.organizer !== opportunity.organizer;
    
    // Compare tags array
    const existingTags = Array.isArray(existing?.tags) ? existing.tags : [];
    const newTags = Array.isArray(opportunity.tags) ? opportunity.tags : [];
    const tagsChanged = existingTags.length !== newTags.length || 
      !newTags.every((t: string) => existingTags.includes(t));
      
    if (!deadlineChanged && !descriptionChanged && !titleChanged && !organizerChanged && !tagsChanged) {
      console.log(`[Firestore Service] Skipped (No changes): ${opportunity.id} (${opportunity.title})`);
      return "skipped";
    }

    // Update: only update mutable fields and set updatedAt (exclude createdAt & id)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, id, ...updateData } = opportunity;
    await docRef.set(
      {
        ...updateData,
        updatedAt: now,
      },
      { merge: true }
    );
    console.log(`[Firestore Service] Updated opportunity: ${opportunity.id} (${opportunity.title})`);
    return "updated";
  } else {
    // Create: set both createdAt and updatedAt.
    await docRef.set({
      ...opportunity,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`[Firestore Service] Created opportunity: ${opportunity.id} (${opportunity.title})`);
    return "inserted";
  }
}
