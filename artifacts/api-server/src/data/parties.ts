export interface SeedParty {
  id: string;
  name: string;
  abbreviation: string | null;
  description: string;
  foundedYear: number | null;
  website: string | null;
}

/**
 * Mock-backed, nonpartisan party reference data (replaces legacy /get_parties).
 * Descriptions are neutral summaries with no rankings or endorsements.
 */
export const parties: SeedParty[] = [
  {
    id: "party-democratic",
    name: "Democratic Party",
    abbreviation: "D",
    description:
      "One of the two major U.S. political parties, generally associated with center-left policy positions.",
    foundedYear: 1828,
    website: "https://democrats.org",
  },
  {
    id: "party-republican",
    name: "Republican Party",
    abbreviation: "R",
    description:
      "One of the two major U.S. political parties, generally associated with center-right policy positions.",
    foundedYear: 1854,
    website: "https://gop.com",
  },
  {
    id: "party-libertarian",
    name: "Libertarian Party",
    abbreviation: "L",
    description:
      "A third party that emphasizes individual liberty and limited government.",
    foundedYear: 1971,
    website: "https://lp.org",
  },
  {
    id: "party-green",
    name: "Green Party",
    abbreviation: "G",
    description:
      "A third party focused on environmentalism and social justice issues.",
    foundedYear: 2001,
    website: "https://gp.org",
  },
  {
    id: "party-independent",
    name: "Independent",
    abbreviation: "I",
    description:
      "Candidates or voters not formally affiliated with any political party.",
    foundedYear: null,
    website: null,
  },
];
