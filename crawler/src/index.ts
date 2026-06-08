import { fetchDevfolioHackathons } from "./fetchers/devfolio";
import { normalizeDevfolioOpportunity } from "./normalizers/devfolio";
import { fetchUnstopOpportunities } from "./fetchers/unstop";
import { initFirestore, isDuplicateHash, upsertOpportunity } from "./services/firestore";
import type { Opportunity } from "./types/opportunity";

async function main() {
  const isDryRun = process.env.DRY_RUN === "true" || !process.env.FIREBASE_SERVICE_ACCOUNT;
  console.log("=== CareerRadarAI Opportunity Ingestion Orchestrator ===");
  console.log(`Mode: ${isDryRun ? "DRY RUN (Simulated DB writes)" : "PRODUCTION (Live DB writes)"}`);

  try {
    // 1. Fetch from Devfolio and Unstop in parallel
    console.log("\n[Orchestrator] Starting parallel fetching...");
    const [rawDevfolio, unstopOpps] = await Promise.all([
      fetchDevfolioHackathons(),
      fetchUnstopOpportunities(),
    ]);

    console.log(`\n[Orchestrator] Fetch completed.`);
    console.log(`- Devfolio: Fetched ${rawDevfolio.length} raw items.`);
    console.log(`- Unstop: Fetched ${unstopOpps.length} normalized items.`);

    // Initialize Firestore if not in dry run
    if (!isDryRun) {
      initFirestore();
    }

    // 2. Process Devfolio opportunities
    const devfolioOpps: Opportunity[] = [];
    for (const rawItem of rawDevfolio) {
      try {
        const normalized = normalizeDevfolioOpportunity(rawItem);
        devfolioOpps.push(normalized);
      } catch (err: any) {
        console.error(`[Orchestrator] Error normalizing Devfolio item:`, err.message);
      }
    }

    let devfolioFetched = devfolioOpps.length;
    let devfolioInserted = 0;
    let devfolioUpdated = 0;
    let devfolioSkipped = 0;

    console.log(`\n[Orchestrator] Processing Devfolio opportunities (${devfolioFetched} items)...`);
    for (const opp of devfolioOpps) {
      let isDup = false;
      if (!isDryRun) {
        isDup = await isDuplicateHash(opp.hash || "");
      }

      if (isDup) {
        console.log(`[Deduplicator] Skipped duplicate Devfolio event: "${opp.title}" (Hash: ${opp.hash})`);
        devfolioSkipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[Dry Run] Would upsert Devfolio opportunity: ${opp.id} (${opp.title})`);
        devfolioInserted++;
      } else {
        const res = await upsertOpportunity(opp);
        if (res === "inserted") {
          devfolioInserted++;
        } else if (res === "updated") {
          devfolioUpdated++;
        } else {
          devfolioSkipped++;
        }
      }
    }

    // 3. Process Unstop opportunities
    let unstopFetched = unstopOpps.length;
    let unstopInserted = 0;
    let unstopUpdated = 0;
    let unstopSkipped = 0;

    console.log(`\n[Orchestrator] Processing Unstop opportunities (${unstopFetched} items)...`);
    for (const opp of unstopOpps) {
      let isDup = false;
      if (!isDryRun) {
        isDup = await isDuplicateHash(opp.hash || "");
      }

      if (isDup) {
        console.log(`[Deduplicator] Skipped duplicate Unstop event: "${opp.title}" (Hash: ${opp.hash})`);
        unstopSkipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[Dry Run] Would upsert Unstop opportunity: ${opp.id} (${opp.title})`);
        unstopInserted++;
      } else {
        const res = await upsertOpportunity(opp);
        if (res === "inserted") {
          unstopInserted++;
        } else if (res === "updated") {
          unstopUpdated++;
        } else {
          unstopSkipped++;
        }
      }
    }

    // 4. Detailed logging for Unstop
    console.log("\n[Unstop Fetcher]");
    console.log(`Fetched ${unstopFetched} opportunities`);
    console.log(`Normalized ${unstopFetched} opportunities`);
    console.log(`Inserted ${unstopInserted}`);
    console.log(`Updated ${unstopUpdated}`);
    console.log(`Skipped ${unstopSkipped}`);

    // 5. Final combined run summary
    console.log("\n=== combined run summary ===");
    console.log("\nDevfolio:");
    console.log(`${devfolioFetched} fetched`);
    console.log(`${devfolioInserted} inserted`);
    console.log(`${devfolioUpdated} updated`);

    console.log("\nUnstop:");
    console.log(`${unstopFetched} fetched`);
    console.log(`${unstopInserted} inserted`);
    console.log(`${unstopUpdated} updated`);

    console.log("\nTotal:");
    console.log(`${devfolioFetched + unstopFetched} fetched`);
    console.log(`${devfolioInserted + unstopInserted} inserted`);
    console.log(`${devfolioUpdated + unstopUpdated} updated`);
    console.log(`${devfolioSkipped + unstopSkipped} skipped`);

    console.log("\nRun completed successfully.");
  } catch (error: any) {
    console.error("\n[Fatal Ingestion Error]:", error.message);
  }
}

main();
