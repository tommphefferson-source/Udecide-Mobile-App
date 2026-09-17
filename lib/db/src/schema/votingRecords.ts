import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Target relational schema for the Voting Records feature (LegiScan-primary
 * ingestion → normalized Udecide-owned data layer).
 *
 * NOT YET WIRED: the api-server currently serves voting records through
 * in-memory-cached provider calls (artifacts/api-server/src/votingRecords/)
 * — it has no database connection and Render has no DATABASE_URL. When a
 * database is provisioned, a scheduled ingestion job writes these tables and
 * the service reads them instead of calling providers per request; the
 * shapes mirror src/votingRecords/types.ts 1:1.
 *
 * Idempotency is enforced at the database level: unique indexes on
 * (provider, provider record id) make re-running ingestion a no-op upsert,
 * never a duplicate.
 */

export const legislatorTable = pgTable(
  "legislator",
  {
    id: serial("id").primaryKey(),
    displayName: text("display_name").notNull(),
    state: text("state").notNull(),
    chamber: text("chamber"),
    district: text("district"),
    party: text("party"),
    // Stable external identifiers — never match on name alone.
    legiscanId: integer("legiscan_id"),
    bioguideId: text("bioguide_id"),
    openStatesId: text("open_states_id"),
  },
  (t) => [
    uniqueIndex("legislator_legiscan_idx").on(t.legiscanId),
    uniqueIndex("legislator_bioguide_idx").on(t.bioguideId),
  ],
);

export const rollCallTable = pgTable(
  "roll_call",
  {
    id: serial("id").primaryKey(),
    sourceProvider: text("source_provider").notNull(), // "LegiScan" | "us-house-clerk" | ...
    sourceRecordId: text("source_record_id").notNull(), // LegiScan roll_call_id etc.
    governmentLevel: text("government_level").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    state: text("state"),
    chamber: text("chamber"),
    sessionName: text("session_name"),
    externalSessionId: text("external_session_id"),
    externalBillId: text("external_bill_id"),
    billNumber: text("bill_number"),
    billTitle: text("bill_title"), // official text, verbatim — never AI-rewritten
    billDescription: text("bill_description"),
    question: text("question"),
    category: text("category").notNull(),
    voteDate: date("vote_date").notNull(),
    result: text("result"),
    yeaCount: integer("yea_count"),
    nayCount: integer("nay_count"),
    presentCount: integer("present_count"),
    absentCount: integer("absent_count"),
    notVotingCount: integer("not_voting_count"),
    totalVotes: integer("total_votes"),
    sourceUrl: text("source_url").notNull(),
    officialGovernmentSourceUrl: text("official_government_source_url"),
    retrievedAt: timestamp("retrieved_at").notNull(),
    sourceUpdatedAt: timestamp("source_updated_at"),
    lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("roll_call_provider_record_idx").on(t.sourceProvider, t.sourceRecordId)],
);

export const legislatorVoteTable = pgTable(
  "legislator_vote",
  {
    id: serial("id").primaryKey(),
    rollCallId: integer("roll_call_id")
      .notNull()
      .references(() => rollCallTable.id),
    legislatorId: integer("legislator_id")
      .notNull()
      .references(() => legislatorTable.id),
    officialVote: text("official_vote").notNull(), // normalized: Yea|Nay|Present|Not Voting|Abstain|Other
    sourceVoteValue: text("source_vote_value"), // original provider value, kept for audit
  },
  (t) => [uniqueIndex("legislator_vote_unique_idx").on(t.rollCallId, t.legislatorId)],
);
