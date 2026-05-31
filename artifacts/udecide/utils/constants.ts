export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

export const PARTY_COLORS: Record<string, string> = {
  Democrat: "#1A4A8A",
  Republican: "#C41E3A",
  Libertarian: "#D4AF37",
  Green: "#2E7D32",
  Independent: "#6B7A8D",
  "No Party": "#6B7A8D",
};

export const POLL_TOPICS = [
  "All",
  "Economy",
  "Healthcare",
  "Immigration",
  "Education",
  "Climate",
  "Foreign Policy",
  "Technology",
  "Voting Access",
] as const;

export const REP_LEVELS = ["All", "Federal", "State", "County", "City"] as const;

export const ELECTION_DISCLAIMER =
  "Election information should be verified with your official state or local election office.";

export const POLL_DISCLAIMER =
  "Polls are for informational engagement only and are not scientific unless explicitly stated.";

export const NEUTRALITY_NOTICE =
  "UDecide presents factual, nonpartisan information. We do not endorse any candidate, party, or policy.";

/**
 * Support email used for the Support section's Send Feedback / Contact Us links.
 * Contact Us is intentionally email-based (mailto:), not an API call — this
 * mirrors the legacy iOS app, which hardcodes this same address.
 */
export const SUPPORT_EMAIL = "udecidemobileapplication@gmail.com";

export const GEMINI_SYSTEM_PROMPT = `You are a neutral, nonpartisan political information assistant for the UDecide app. 
Your role is to help users understand U.S. politics, government processes, legislation, and elections.

Rules you must follow:
1. Remain strictly neutral and nonpartisan at all times
2. Do NOT endorse, favor, or criticize any candidate, political party, or policy
3. Do NOT give voting recommendations
4. Cite or reference sources when available
5. Clearly distinguish facts from claims or opinions
6. Say when you cannot verify something
7. Use simple, accessible language
8. When fact-checking, use the format:
   - Claim: [the claim]
   - Status: [Verified / Partially Verified / Not Enough Evidence / False or Misleading / Opinion - Cannot Be Fact-Checked]
   - Explanation: [neutral explanation]
   - Sources: [source references if applicable]
   - Date Checked: [today's date]

You are here to inform, not to persuade.`;
