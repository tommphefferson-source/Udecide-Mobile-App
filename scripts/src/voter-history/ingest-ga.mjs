#!/usr/bin/env node
/**
 * Georgia voter-history ingestion CLI (offline; never runs on the server).
 *
 * Reads the two official Georgia Secretary of State files, extracts
 * participation records ONLY for the elected officials listed in the seed
 * file, resolves identity with conservative matching, and emits a small
 * normalized dataset the api-server can serve. Raw statewide files never
 * leave the operator's machine and are never committed.
 *
 * Sources (verified 2026-09, see docs/VOTER_HISTORY.md):
 *   - Voter History File  — FREE download per election (2004–present),
 *     https://mvp.sos.ga.gov/s/voter-history-files
 *     FIXED-WIDTH layout: County#(3) RegNumber(8) ElectionDate(8,yyyymmdd)
 *     ElectionType(3, coded) Party(2) Absentee(1) Provisional(1) Supplemental(1)
 *     Contains NO names — identity comes from the registration list join.
 *   - Voter Registration List — purchased from the SoS ($485 statewide,
 *     https://sos.ga.gov/page/order-voter-registration-lists-and-files), CSV.
 *     Includes name, BIRTH YEAR (year only), county, address, districts.
 *
 * LEGAL NOTE: O.C.G.A. § 21-2-225(c)/§ 21-2-601 make commercial use of this
 * data a misdemeanor. Running this tool for the app is gated on counsel
 * sign-off (docs/VOTER_HISTORY.md §Legal). This tool must never be pointed at
 * data whose acquisition terms were not reviewed.
 *
 * Usage:
 *   node scripts/src/voter-history/ingest-ga.mjs \
 *     --voters   /secure/ga/voter-registration-list.csv \
 *     --history  /secure/ga/2024-11-05-general.txt [--history more.txt ...] \
 *     --officials scripts/src/voter-history/officials-ga.seed.json \
 *     --out      /secure/ga/out \
 *     [--retrieved-at 2026-09-15]
 *
 * Outputs (in --out):
 *   dataset.json       normalized dataset (MATCHED + PROBABLE records; the
 *                      server publishes MATCHED only)
 *   review-queue.json  AMBIGUOUS matches needing human review — never published
 *   report.json        counts, validation results, provenance summary
 *
 * The registration-list header guard ABORTS ingestion when the delivered
 * file's columns differ from VOTERS_COLUMNS below (source schema change), so
 * silently-wrong data can never be produced. Verify the mapping against the
 * actual delivered file on first purchase and adjust once.
 *
 * Try it end-to-end with the committed fictitious fixtures:
 *   node scripts/src/voter-history/ingest-ga.mjs \
 *     --voters scripts/src/voter-history/fixtures/ga-voters.sample.csv \
 *     --history scripts/src/voter-history/fixtures/ga-history.sample.txt \
 *     --officials scripts/src/voter-history/fixtures/officials-ga.sample.json \
 *     --out /tmp/vh-out
 */
import { createReadStream, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { basename } from "node:path";

// ── Registration list column mapping (CSV header guard) ─────────────────────
// Column names must match the delivered file exactly (case-insensitive);
// verify on first purchase. Extra columns are ignored.
const VOTERS_COLUMNS = {
  regNumber: "VOTER REGISTRATION NUMBER",
  lastName: "LAST NAME",
  firstName: "FIRST NAME",
  middleName: "MIDDLE NAME",
  suffix: "SUFFIX",
  birthYear: "BIRTH YEAR",
  county: "COUNTY",
};

// ── Voter History File fixed-width layout (verified official layout) ────────
const HISTORY_FIELDS = [
  ["countyNumber", 3],
  ["regNumber", 8],
  ["electionDate", 8],
  ["electionType", 3],
  ["party", 2],
  ["absentee", 1],
  ["provisional", 1],
  ["supplemental", 1],
];
const HISTORY_LINE_MIN = HISTORY_FIELDS.reduce((n, [, w]) => n + w, 0); // 27

// Official election-type codes from the SoS layout documentation.
const GA_ELECTION_TYPES = {
  "001": { type: "PRIMARY", name: "General Primary" },
  "002": { type: "RUNOFF", name: "General Primary Runoff" },
  "003": { type: "GENERAL", name: "General Election" },
  "004": { type: "RUNOFF", name: "General Election Runoff" },
  "005": { type: "SPECIAL", name: "Special Election" },
  "006": { type: "RUNOFF", name: "Special Election Runoff" },
  "007": { type: "OTHER", name: "Non-Partisan Election" },
  "008": { type: "SPECIAL", name: "Special/Non-Partisan Election" },
  "009": { type: "OTHER", name: "Recall Election" },
  "010": { type: "PRIMARY", name: "Presidential Preference Primary" },
};

const SOURCE_NAME = "Georgia Secretary of State — Voter History File";
const SOURCE_URL = "https://mvp.sos.ga.gov/s/voter-history-files";

// ── Name normalization (mirrors api-server/src/voterHistory/matching.ts) ────
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/['-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !SUFFIXES.has(tok))
    .join(" ");
}
function firstLast(normalized) {
  const p = normalized.split(" ");
  return p.length <= 2 ? normalized : `${p[0]} ${p[p.length - 1]}`;
}
function hashRegNumber(reg) {
  // Opaque provenance id: the raw registration number is never emitted.
  return createHash("sha256").update(`ga:${reg}`).digest("hex").slice(0, 16);
}
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function args(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
  }
  return out;
}
function arg(name, required = true) {
  const all = args(name);
  if (all.length === 0) {
    if (required) {
      console.error(`Missing --${name}. See header comment for usage.`);
      process.exit(2);
    }
    return null;
  }
  return all[0];
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const votersFile = arg("voters");
  const historyFiles = args("history");
  const officialsFile = arg("officials");
  const outDir = arg("out");
  if (historyFiles.length === 0) {
    console.error("At least one --history file is required.");
    process.exit(2);
  }
  const retrievedAt =
    arg("retrieved-at", false) ??
    statSync(historyFiles[0]).mtime.toISOString().slice(0, 10);

  // Officials seed.
  const officials = JSON.parse(readFileSync(officialsFile, "utf8")).filter(
    (o) => !o._README,
  );
  if (officials.length === 0) {
    console.error("Officials seed has no entries — nothing to match. Fill the seed first.");
    process.exit(2);
  }
  for (const o of officials) {
    for (const f of ["key", "displayName", "state", "office", "level"]) {
      if (!o[f]) {
        console.error(`Officials seed entry missing "${f}": ${JSON.stringify(o)}`);
        process.exit(2);
      }
    }
    o.normalizedName = normalizeName(o.displayName);
    o.match = o.match ?? {};
  }
  const wantedNames = new Set(officials.map((o) => firstLast(o.normalizedName)));

  // Pass 1 — registration list (CSV): candidate identities for wanted names.
  console.error("Pass 1/2: scanning registration list for candidate identities…");
  const candidatesByName = new Map();
  let voterRows = 0;
  {
    const rl = createInterface({
      input: createReadStream(votersFile, "utf8"),
      crlfDelay: Infinity,
    });
    let idx = null;
    for await (const line of rl) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      if (!idx) {
        idx = {};
        for (const [key, col] of Object.entries(VOTERS_COLUMNS)) {
          const at = cols.findIndex((h) => h.toUpperCase() === col);
          if (at === -1) {
            console.error(
              `SCHEMA GUARD: expected column "${col}" not found in ${votersFile}.\n` +
                `Found: ${cols.join(", ")}\n` +
                `The source layout changed (or the mapping is wrong). Ingestion aborted;\n` +
                `no output written. Verify the delivered file layout, update VOTERS_COLUMNS, re-run.`,
            );
            process.exit(3);
          }
          idx[key] = at;
        }
        continue;
      }
      voterRows++;
      const first = cols[idx.firstName] ?? "";
      const middle = cols[idx.middleName] ?? "";
      const last = cols[idx.lastName] ?? "";
      const norm = normalizeName([first, middle, last].filter(Boolean).join(" "));
      const k = firstLast(norm);
      if (!wantedNames.has(k)) continue;
      if (!candidatesByName.has(k)) candidatesByName.set(k, []);
      candidatesByName.get(k).push({
        regNumber: cols[idx.regNumber] ?? "",
        birthYear: Number.parseInt(cols[idx.birthYear] ?? "", 10) || undefined,
        county: cols[idx.county] || undefined,
      });
    }
  }

  // Identity resolution (same rules as the server's matching.ts).
  const resolved = [];
  const reviewQueue = [];
  for (const o of officials) {
    const named = candidatesByName.get(firstLast(o.normalizedName)) ?? [];
    let result;
    if (named.length === 0) {
      result = { confidence: "NO_MATCH", reason: "no voter-file row with this name" };
    } else {
      const byBirth =
        o.match.birthYear !== undefined
          ? named.filter((c) => c.birthYear === o.match.birthYear)
          : [];
      if (named.length === 1) {
        const only = named[0];
        if (byBirth.length === 1)
          result = { confidence: "MATCHED", candidate: only, reason: "unique name + birth year" };
        else if (
          o.match.registrationCounty &&
          only.county &&
          only.county.toLowerCase() === o.match.registrationCounty.toLowerCase()
        )
          result = { confidence: "MATCHED", candidate: only, reason: "unique name + county" };
        else
          result = {
            confidence: "PROBABLE_MATCH",
            candidate: only,
            reason: "unique name, no corroborating attribute",
          };
      } else if (byBirth.length === 1) {
        result = {
          confidence: "MATCHED",
          candidate: byBirth[0],
          reason: `birth year disambiguated ${named.length} candidates`,
        };
      } else {
        result = {
          confidence: "AMBIGUOUS",
          reason: `${named.length} voter-file rows share this name; manual review required`,
        };
      }
    }
    if (result.confidence === "AMBIGUOUS") {
      reviewQueue.push({
        officialKey: o.key,
        displayName: o.displayName,
        reason: result.reason,
        candidateCount: named.length,
      });
    } else if (result.candidate) {
      resolved.push({ official: o, ...result });
    }
  }
  const regToOfficial = new Map(resolved.map((r) => [r.candidate.regNumber, r]));

  // Pass 2 — fixed-width history file(s): participation for resolved identities.
  const now = new Date().toISOString();
  const elections = new Map();
  const records = [];
  const validation = {
    historyRows: 0,
    shortLines: 0,
    badDates: 0,
    unknownTypeCodes: 0,
    duplicates: 0,
  };
  const seen = new Set();
  for (const historyFile of historyFiles) {
    console.error(`Pass 2/2: scanning ${basename(historyFile)}…`);
    const rl = createInterface({
      input: createReadStream(historyFile, "utf8"),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (!line.trim()) continue;
      validation.historyRows++;
      if (line.length < HISTORY_LINE_MIN) {
        validation.shortLines++;
        continue;
      }
      const row = {};
      let pos = 0;
      for (const [key, width] of HISTORY_FIELDS) {
        row[key] = line.slice(pos, pos + width).trim();
        pos += width;
      }
      const hit = regToOfficial.get(row.regNumber);
      if (!hit) continue;
      const m = /^(\d{4})(\d{2})(\d{2})$/.exec(row.electionDate);
      if (!m) { validation.badDates++; continue; }
      const isoDate = `${m[1]}-${m[2]}-${m[3]}`;
      const typeInfo = GA_ELECTION_TYPES[row.electionType.padStart(3, "0")];
      if (!typeInfo) { validation.unknownTypeCodes++; continue; }
      const electionId = `ga-${isoDate}-${row.electionType.padStart(3, "0")}`;
      const dupKey = `${hit.official.key}|${electionId}`;
      if (seen.has(dupKey)) { validation.duplicates++; continue; }
      seen.add(dupKey);
      if (!elections.has(electionId)) {
        elections.set(electionId, {
          id: electionId,
          jurisdiction: "GA",
          electionDate: isoDate,
          electionName: `${m[1]} ${typeInfo.name}`,
          electionType: typeInfo.type,
          source: SOURCE_NAME,
        });
      }
      // GA's absentee flag covers both mail and advance in-person voting.
      const votingMethod =
        row.provisional === "Y"
          ? "PROVISIONAL"
          : row.absentee === "Y"
            ? "ABSENTEE_OR_EARLY"
            : "IN_PERSON";
      records.push({
        officialKey: hit.official.key,
        electionId,
        participated: true,
        votingMethod,
        // Which primary ballot was pulled (D/R/NP) — primary participation,
        // never candidate choice. Display is gated by jurisdiction config.
        ...(typeInfo.type === "PRIMARY" && row.party ? { primaryBallotParty: row.party } : {}),
        matchConfidence: hit.confidence,
        provenance: {
          sourceName: SOURCE_NAME,
          sourceUrl: SOURCE_URL,
          sourceRecordId: hashRegNumber(row.regNumber),
          sourceFile: basename(historyFile),
          sourceUpdatedAt: null,
          retrievedAt,
          processedAt: now,
        },
      });
    }
  }

  mkdirSync(outDir, { recursive: true });
  const dataset = {
    generatedAt: now,
    generator: "ingest-ga.mjs v2 (fixed-width GA layout)",
    fixture: false,
    elections: [...elections.values()].sort((a, b) =>
      b.electionDate.localeCompare(a.electionDate),
    ),
    officials: officials.map((o) => ({
      key: o.key,
      displayName: o.displayName,
      normalizedName: o.normalizedName,
      state: o.state,
      office: o.office,
      level: o.level,
      match: o.match,
    })),
    records,
  };
  writeFileSync(`${outDir}/dataset.json`, JSON.stringify(dataset, null, 2));
  writeFileSync(`${outDir}/review-queue.json`, JSON.stringify(reviewQueue, null, 2));
  const report = {
    generatedAt: now,
    input: {
      votersFile: basename(votersFile),
      historyFiles: historyFiles.map((f) => basename(f)),
      retrievedAt,
    },
    officialsSeeded: officials.length,
    identities: {
      matched: resolved.filter((r) => r.confidence === "MATCHED").length,
      probable: resolved.filter((r) => r.confidence === "PROBABLE_MATCH").length,
      ambiguousForReview: reviewQueue.length,
      noMatch: officials.length - resolved.length - reviewQueue.length,
    },
    scanned: { voterRows, historyRows: validation.historyRows },
    validation,
    records: records.length,
    note:
      "Only MATCHED records are served by the API. PROBABLE_MATCH records are retained " +
      "for audit but withheld. Review review-queue.json, add corroborating seed " +
      "attributes (birth year / county), and re-run to resolve ambiguities.",
  };
  writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.error(
    `Done. ${records.length} records for ${resolved.length} resolved identities ` +
      `(${reviewQueue.length} ambiguous → review-queue.json). Output in ${outDir}/`,
  );
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
