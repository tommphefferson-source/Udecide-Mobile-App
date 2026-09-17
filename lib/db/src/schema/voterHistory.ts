import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Target relational schema for the Elected Official Voter History feature.
 *
 * NOT YET WIRED: the api-server currently serves voter history from a
 * file-backed normalized dataset (artifacts/api-server/src/voterHistory/) —
 * it has no database connection and Render has no DATABASE_URL provisioned.
 * When record volume justifies a database, point the store at these tables;
 * the shapes mirror artifacts/api-server/src/voterHistory/types.ts 1:1.
 *
 * Domain rule carried into the schema: participation only. There is no
 * column anywhere for candidate choice, and none may ever be added.
 */

export const electedOfficialTable = pgTable(
  "elected_official",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(), // e.g. "ga:jordan-sample:state-senator"
    displayName: text("display_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    office: text("office").notNull(),
    level: text("level").notNull(), // federal | state | county | city
    district: text("district"),
    state: text("state").notNull(),
    // Matching attributes — server-side only, never exposed via API.
    matchBirthYear: integer("match_birth_year"),
    matchRegistrationCounty: text("match_registration_county"),
  },
  (t) => [uniqueIndex("elected_official_key_idx").on(t.key)],
);

export const electionTable = pgTable(
  "election",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(), // "ga-2024-11-05-general"
    jurisdiction: text("jurisdiction").notNull(),
    electionDate: date("election_date").notNull(),
    electionName: text("election_name").notNull(),
    electionType: text("election_type").notNull(), // GENERAL | PRIMARY | ...
    electionYear: integer("election_year").notNull(),
    source: text("source").notNull(),
  },
  (t) => [uniqueIndex("election_external_id_idx").on(t.externalId)],
);

export const voterHistoryTable = pgTable(
  "voter_history",
  {
    id: serial("id").primaryKey(),
    officialId: integer("official_id")
      .notNull()
      .references(() => electedOfficialTable.id),
    electionId: integer("election_id")
      .notNull()
      .references(() => electionTable.id),
    jurisdiction: text("jurisdiction").notNull(),
    participated: boolean("participated").notNull(),
    votingMethod: text("voting_method"), // IN_PERSON | EARLY | ABSENTEE_BY_MAIL | PROVISIONAL
    matchConfidence: text("match_confidence").notNull(), // MATCHED | PROBABLE_MATCH | AMBIGUOUS
    // Provenance — every displayed fact traces back to its source.
    source: text("source").notNull(),
    sourceUrl: text("source_url"),
    sourceRecordId: text("source_record_id").notNull(), // opaque hash, not the registration number
    sourceFile: text("source_file").notNull(),
    sourceUpdatedAt: timestamp("source_updated_at"),
    retrievedAt: timestamp("retrieved_at").notNull(),
    ingestedAt: timestamp("ingested_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("voter_history_official_election_idx").on(t.officialId, t.electionId),
  ],
);
