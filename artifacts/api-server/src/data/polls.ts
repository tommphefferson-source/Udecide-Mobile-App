export interface SeedPollOption {
  id: string;
  label: string;
  votes: number;
}

export interface SeedPoll {
  id: string;
  question: string;
  description: string | null;
  category: string | null;
  options: SeedPollOption[];
}

/** Mock-backed poll catalog (replaces legacy /poll_listing). */
export const polls: SeedPoll[] = [
  {
    id: "poll-voter-turnout",
    question: "How important is increasing voter turnout in your community?",
    description: "Share how much of a priority civic participation is for you.",
    category: "Civic Engagement",
    options: [
      { id: "opt-critical", label: "Critically important", votes: 482 },
      { id: "opt-somewhat", label: "Somewhat important", votes: 213 },
      { id: "opt-neutral", label: "Neutral", votes: 64 },
      { id: "opt-not", label: "Not important", votes: 28 },
    ],
  },
  {
    id: "poll-local-priorities",
    question: "Which local issue matters most to you this year?",
    description: "Pick the area you most want local leaders to focus on.",
    category: "Local Issues",
    options: [
      { id: "opt-education", label: "Education", votes: 301 },
      { id: "opt-infrastructure", label: "Infrastructure & roads", votes: 254 },
      { id: "opt-safety", label: "Public safety", votes: 198 },
      { id: "opt-housing", label: "Housing affordability", votes: 276 },
    ],
  },
  {
    id: "poll-information-source",
    question: "Where do you primarily get your election information?",
    description: null,
    category: "Media",
    options: [
      { id: "opt-official", label: "Official government sites", votes: 174 },
      { id: "opt-news", label: "News outlets", votes: 233 },
      { id: "opt-social", label: "Social media", votes: 189 },
      { id: "opt-apps", label: "Civic apps", votes: 142 },
    ],
  },
];
