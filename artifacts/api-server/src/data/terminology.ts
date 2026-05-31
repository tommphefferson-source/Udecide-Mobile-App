export interface SeedTerminology {
  id: string;
  term: string;
  definition: string;
  category: string | null;
}

/** Mock-backed political terminology (replaces legacy /political_terminology_list). */
export const terminology: SeedTerminology[] = [
  {
    id: "term-ballot",
    term: "Ballot",
    definition:
      "The list of candidates and measures a voter chooses from in an election.",
    category: "Elections",
  },
  {
    id: "term-absentee",
    term: "Absentee Voting",
    definition:
      "Casting a ballot by mail or drop-off instead of voting in person on election day.",
    category: "Elections",
  },
  {
    id: "term-incumbent",
    term: "Incumbent",
    definition: "The current holder of an elected office who is seeking re-election.",
    category: "Government",
  },
  {
    id: "term-filibuster",
    term: "Filibuster",
    definition:
      "A Senate tactic of prolonging debate to delay or block a vote on a bill.",
    category: "Legislature",
  },
  {
    id: "term-veto",
    term: "Veto",
    definition:
      "The power of an executive to reject a bill passed by the legislature.",
    category: "Executive",
  },
  {
    id: "term-gerrymander",
    term: "Gerrymandering",
    definition:
      "Drawing electoral district boundaries to favor one party or group.",
    category: "Elections",
  },
];
