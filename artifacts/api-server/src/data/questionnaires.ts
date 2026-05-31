export interface SeedQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface SeedQuestionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: SeedQuestion[];
}

/** Mock-backed questionnaires (replaces legacy questionaires_listing). */
export const questionnaires: SeedQuestionnaire[] = [
  {
    id: "questionnaire-priorities",
    title: "Your Civic Priorities",
    description: "A short questionnaire to understand the issues you care about.",
    questions: [
      {
        id: "q-priority-1",
        prompt: "Which issue area is most important to you?",
        options: [
          "Economy & jobs",
          "Healthcare",
          "Education",
          "Environment",
          "Public safety",
        ],
      },
      {
        id: "q-priority-2",
        prompt: "How do you prefer to stay informed about politics?",
        options: ["Reading", "Watching", "Listening", "Discussion"],
      },
      {
        id: "q-priority-3",
        prompt: "How often do you vote?",
        options: ["Every election", "Most elections", "Occasionally", "Rarely"],
      },
    ],
  },
  {
    id: "questionnaire-engagement",
    title: "Civic Engagement Check-in",
    description: null,
    questions: [
      {
        id: "q-engage-1",
        prompt: "Have you contacted an elected official in the past year?",
        options: ["Yes", "No", "Not sure"],
      },
      {
        id: "q-engage-2",
        prompt: "Do you know who represents you locally?",
        options: ["Yes, all of them", "Some of them", "None of them"],
      },
    ],
  },
];
