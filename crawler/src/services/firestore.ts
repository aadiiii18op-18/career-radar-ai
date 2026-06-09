import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Firestore } from "@google-cloud/firestore";
import { OAuth2Client } from "google-auth-library";
import type { Opportunity } from "../types/opportunity";

let db: admin.firestore.Firestore | null = null;

/**
 * Initializes Firestore admin instance lazily.
 * Uses service account JSON from FIREBASE_SERVICE_ACCOUNT if available,
 * otherwise falls back to local default project ID initialization or CLI credentials.
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
      db = admin.firestore();
    } catch (err: any) {
      console.error("[Firestore Service] Failed to parse service account JSON:", err.message);
      admin.initializeApp({
        projectId: projectIdEnv,
      });
      console.log("[Firestore Service] Falling back to default project ID initialization.");
      db = admin.firestore();
    }
  } else {
    // Try to load token from local Firebase CLI configstore
    const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        const accessToken = config.tokens?.access_token;
        if (accessToken) {
          const authClient = new OAuth2Client();
          authClient.setCredentials({ access_token: accessToken });
          db = new Firestore({
            projectId: projectIdEnv,
            authClient: authClient as any
          }) as any;
          console.log("[Firestore Service] Initialized direct Firestore client using local Firebase CLI token.");
        } else {
          throw new Error("No access token found in configstore.");
        }
      } catch (err: any) {
        console.error("[Firestore Service] Failed to load local Firebase CLI token:", err.message);
        admin.initializeApp({
          projectId: projectIdEnv,
        });
        console.log("[Firestore Service] Falling back to default project ID initialization.");
        db = admin.firestore();
      }
    } else {
      admin.initializeApp({
        projectId: projectIdEnv,
      });
      console.log("[Firestore Service] Initialized using default project ID:", projectIdEnv);
      db = admin.firestore();
    }
  }

  return db!;
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
