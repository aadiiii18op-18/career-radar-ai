import { fetchDevfolioHackathons } from "./fetchers/devfolio";
import { normalizeDevfolioOpportunity } from "./normalizers/devfolio";
import { initFirestore, isDuplicateHash, upsertOpportunity } from "./services/firestore";

async function main() {
  const isDryRun = process.env.DRY_RUN === "true" || !process.env.FIREBASE_SERVICE_ACCOUNT;
  console.log("=== CareerRadarAI Opportunity Ingestion Orchestrator ===");
  console.log(`Mode: ${isDryRun ? "DRY RUN (Simulated DB writes)" : "PRODUCTION (Live DB writes)"}`);

  try {
    // 1. Fetch raw data from Source 1: Devfolio
    const rawHackathons = await fetchDevfolioHackathons();
    console.log(`\nSuccessfully fetched ${rawHackathons.length} raw opportunities from Devfolio.`);

    if (rawHackathons.length === 0) {
      console.log("No records retrieved. Exiting run.");
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;

    // 2. Initialize Firestore if in production
    if (!isDryRun) {
      initFirestore();
    }

    // 3. Process each record through Normalizer and Deduplicator
    for (const rawItem of rawHackathons) {
      const normalized = normalizeDevfolioOpportunity(rawItem);

      // Check cross-platform deduplication fingerprint hash
      let isDup = false;
      if (!isDryRun) {
        isDup = await isDuplicateHash(normalized.hash);
      }

      if (isDup) {
        console.log(`[Deduplicator] Skipped duplicate: "${normalized.title}" (Hash: ${normalized.hash})`);
        skippedCount++;
        continue;
      }

      if (isDryRun) {
        console.log(`[Dry Run] Would upsert opportunity: ${normalized.id}`);
        console.log(`          Title: "${normalized.title}" | Organizer: "${normalized.organizer}"`);
        console.log(`          Deadline: ${normalized.deadline} | URL: ${normalized.url}`);
        console.log(`          Hash: ${normalized.hash} | Tags: [${normalized.tags.join(", ")}]\n`);
        createdCount++;
      } else {
        await upsertOpportunity(normalized);
        createdCount++;
      }
    }

    console.log("\n=== Ingestion Run Summary ===");
    console.log(`Total Processed: ${rawHackathons.length}`);
    console.log(`Upserted (New/Updated): ${createdCount}`);
    console.log(`Skipped (Duplicate): ${skippedCount}`);
    console.log("Run completed successfully.");
  } catch (error: any) {
    console.error("\n[Fatal Ingestion Error]:", error.message);
  }
}

main();
