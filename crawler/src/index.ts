import { fetchDevfolioHackathons } from "./fetchers/devfolio";
import { normalizeDevfolioOpportunity } from "./normalizers/devfolio";
import { fetchUnstopOpportunities } from "./fetchers/unstop";
import { fetchHackerEarthChallenges } from "./fetchers/hackerearth";
import { normalizeHackerEarthOpportunity } from "./normalizers/hackerearth";
import { fetchInternshalaOpportunities } from "./fetchers/internshala";
import { initFirestore, isDuplicateHash, upsertOpportunity } from "./services/firestore";
import type { Opportunity } from "./types/opportunity";

async function main() {
  const isDryRun = process.env.DRY_RUN !== "false" && (process.env.DRY_RUN === "true" || !process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("=== CareerRadarAI Opportunity Ingestion Orchestrator ===");
  console.log(`Mode: ${isDryRun ? "DRY RUN (Simulated DB writes)" : "PRODUCTION (Live DB writes)"}`);

  try {
    // 1. Fetch from Devfolio, Unstop, HackerEarth, and Internshala in parallel
    console.log("\n[Orchestrator] Starting parallel fetching...");
    const [rawDevfolio, unstopOpps, heResult, internshalaOpps] = await Promise.all([
      fetchDevfolioHackathons(),
      fetchUnstopOpportunities(),
      fetchHackerEarthChallenges(),
      fetchInternshalaOpportunities(),
    ]);

    console.log(`\n[Orchestrator] Fetch completed.`);
    console.log(`- Devfolio: Fetched ${rawDevfolio.length} raw items.`);
    console.log(`- Unstop: Fetched ${unstopOpps.length} normalized items.`);
    console.log(`- HackerEarth: Fetched ${heResult.data.length} raw items.`);
    console.log(`- Internshala: Fetched ${internshalaOpps.length} normalized items.`);

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

    // 4. Process HackerEarth opportunities
    const rawHackerEarth = heResult.data;
    const isClist = heResult.isClist;
    const hackerearthOpps: Opportunity[] = [];
    for (const rawItem of rawHackerEarth) {
      try {
        const normalized = normalizeHackerEarthOpportunity(rawItem, isClist);
        hackerearthOpps.push(normalized);
      } catch (err: any) {
        console.error(`[Orchestrator] Error normalizing HackerEarth item:`, err.message);
      }
    }

    let hackerearthFetched = hackerearthOpps.length;
    let hackerearthInserted = 0;
    let hackerearthUpdated = 0;
    let hackerearthSkipped = 0;

    console.log(`\n[Orchestrator] Processing HackerEarth opportunities (${hackerearthFetched} items)...`);
    for (const opp of hackerearthOpps) {
      let isDup = false;
      if (!isDryRun) {
        isDup = await isDuplicateHash(opp.hash || "");
      }

      if (isDup) {
        console.log(`[Deduplicator] Skipped duplicate HackerEarth event: "${opp.title}" (Hash: ${opp.hash})`);
        hackerearthSkipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[Dry Run] Would upsert HackerEarth opportunity: ${opp.id} (${opp.title})`);
        hackerearthInserted++;
      } else {
        const res = await upsertOpportunity(opp);
        if (res === "inserted") {
          hackerearthInserted++;
        } else if (res === "updated") {
          hackerearthUpdated++;
        } else {
          hackerearthSkipped++;
        }
      }
    }

    // 5. Process Internshala opportunities
    let internshalaFetched = internshalaOpps.length;
    let internshalaInserted = 0;
    let internshalaUpdated = 0;
    let internshalaSkipped = 0;

    console.log(`\n[Orchestrator] Processing Internshala opportunities (${internshalaFetched} items)...`);
    for (const opp of internshalaOpps) {
      let isDup = false;
      if (!isDryRun) {
        isDup = await isDuplicateHash(opp.hash || "");
      }

      if (isDup) {
        console.log(`[Deduplicator] Skipped duplicate Internshala event: "${opp.title}" (Hash: ${opp.hash})`);
        internshalaSkipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[Dry Run] Would upsert Internshala opportunity: ${opp.id} (${opp.title})`);
        internshalaInserted++;
      } else {
        const res = await upsertOpportunity(opp);
        if (res === "inserted") {
          internshalaInserted++;
        } else if (res === "updated") {
          internshalaUpdated++;
        } else {
          internshalaSkipped++;
        }
      }
    }

    // 6. Detailed logging for Unstop
    console.log("\n[Unstop Fetcher]");
    console.log(`Fetched ${unstopFetched} opportunities`);
    console.log(`Normalized ${unstopFetched} opportunities`);
    console.log(`Inserted ${unstopInserted}`);
    console.log(`Updated ${unstopUpdated}`);
    console.log(`Skipped ${unstopSkipped}`);

    // Detailed logging for HackerEarth
    console.log("\n[HackerEarth Fetcher]");
    console.log(`Fetched ${hackerearthFetched} opportunities`);
    console.log(`Normalized ${hackerearthFetched} opportunities`);
    console.log(`Inserted ${hackerearthInserted}`);
    console.log(`Updated ${hackerearthUpdated}`);
    console.log(`Skipped ${hackerearthSkipped}`);

    // Detailed logging for Internshala
    console.log("\n[Internshala Fetcher]");
    console.log(`Fetched ${internshalaFetched} opportunities`);
    console.log(`Normalized ${internshalaFetched} opportunities`);
    console.log(`Inserted ${internshalaInserted}`);
    console.log(`Updated ${internshalaUpdated}`);
    console.log(`Skipped ${internshalaSkipped}`);

    // 7. Final combined run summary
    console.log("\n=== combined run summary ===");
    console.log("\nDevfolio:");
    console.log(`${devfolioFetched} fetched`);
    console.log(`${devfolioInserted} inserted`);
    console.log(`${devfolioUpdated} updated`);

    console.log("\nUnstop:");
    console.log(`${unstopFetched} fetched`);
    console.log(`${unstopInserted} inserted`);
    console.log(`${unstopUpdated} updated`);

    console.log("\nHackerEarth:");
    console.log(`${hackerearthFetched} fetched`);
    console.log(`${hackerearthInserted} inserted`);
    console.log(`${hackerearthUpdated} updated`);

    console.log("\nInternshala:");
    console.log(`${internshalaFetched} fetched`);
    console.log(`${internshalaInserted} inserted`);
    console.log(`${internshalaUpdated} updated`);

    console.log("\nTotal:");
    console.log(`${devfolioFetched + unstopFetched + hackerearthFetched + internshalaFetched} fetched`);
    console.log(`${devfolioInserted + unstopInserted + hackerearthInserted + internshalaInserted} inserted`);
    console.log(`${devfolioUpdated + unstopUpdated + hackerearthUpdated + internshalaUpdated} updated`);
    console.log(`${devfolioSkipped + unstopSkipped + hackerearthSkipped + internshalaSkipped} skipped`);

    console.log("\nRun completed successfully.");
  } catch (error: any) {
    console.error("\n[Fatal Ingestion Error]:", error.message);
  }
}

main();

