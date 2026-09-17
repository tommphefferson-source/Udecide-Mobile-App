import type { JurisdictionConfig } from "./types";

/**
 * Per-state voter-history configuration.
 *
 * LEGAL GATING: `publicDisplayAllowed` and `permittedUseConfirmed` default to
 * FALSE everywhere. They may only be flipped to true after human/legal review
 * of the state statute and (where applicable) the provider license. The API
 * refuses to serve records for a jurisdiction until BOTH are true — flipping a
 * flag here is a deliberate, reviewable code change, not a runtime toggle.
 *
 * Georgia is the pilot: the ingestion adapter and normalized schema are built
 * against the GA Secretary of State voter-history file format. Its legal gate
 * remains CLOSED until counsel signs off (see docs/VOTER_HISTORY.md §Legal).
 */
export const JURISDICTIONS: Record<string, JurisdictionConfig> = {
  GA: {
    state: "GA",
    voterHistoryAvailable: true,
    sourceType: "STATE_FILE",
    sourceName: "Georgia Secretary of State — Voter History File",
    sourceUrl: "https://mvp.sos.ga.gov/s/voter-history-files",
    apiAvailable: false,
    fileAvailable: true, // free fixed-width download, per election, 2004–present
    historicalDepth: "2004–present (per-election files)",
    updateFrequency:
      "Counties post voting credit within 60 days of each election (O.C.G.A. § 21-2-215(i)); " +
      "identity join needs the $485 statewide Voter Registration List (snapshot, ~2wk fulfillment)",
    // Sole statutory restriction: commercial use is a MISDEMEANOR
    // (O.C.G.A. § 21-2-225(c), § 21-2-601). "Commercial purposes" is undefined
    // for a consumer app — whether UDecide's use qualifies is the open legal
    // question. No GA internet-publication ban was found. Gate stays CLOSED
    // until Georgia elections counsel signs off in writing.
    permittedUseConfirmed: false,
    commercialUseAllowed: false,
    publicDisplayAllowed: false,
    redistributionAllowed: false,
    showPrimaryBallotParty: false, // file records primary ballot pulled (D/R/NP); conservative default: hide
    showVotingMethod: true,
    retentionRequirements:
      "Honor § 21-2-225.1 protected-address suppressions on every refresh; never enrich " +
      "suppressed records from other sources; delete raw files if statute/terms change",
    attributionRequired: "Georgia Secretary of State",
    notes:
      "Pilot state. Raw statewide files are processed OFFLINE by scripts/src/voter-history; " +
      "only matched-official records enter the app dataset. Full sourcing & legal analysis: " +
      "docs/VOTER_HISTORY.md.",
  },
};

const NO_COVERAGE: Omit<JurisdictionConfig, "state"> = {
  voterHistoryAvailable: false,
  sourceType: "NONE",
  sourceName: "",
  sourceUrl: "",
  apiAvailable: false,
  fileAvailable: false,
  historicalDepth: "",
  updateFrequency: "",
  permittedUseConfirmed: false,
  commercialUseAllowed: false,
  publicDisplayAllowed: false,
  redistributionAllowed: false,
  showPrimaryBallotParty: false,
  showVotingMethod: false,
  retentionRequirements: "",
  attributionRequired: "",
  notes: "No voter-history source configured for this jurisdiction.",
};

export function getJurisdiction(state: string): JurisdictionConfig {
  const key = state.trim().toUpperCase();
  return JURISDICTIONS[key] ?? { state: key, ...NO_COVERAGE };
}

/** True only when every legal gate for the jurisdiction is open. */
export function isPublishable(cfg: JurisdictionConfig): boolean {
  return (
    cfg.voterHistoryAvailable &&
    cfg.permittedUseConfirmed &&
    cfg.publicDisplayAllowed
  );
}
