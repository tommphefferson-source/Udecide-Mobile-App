export interface SeedQuiz {
  id: string;
  title: string;
  description: string | null;
  category: string;
  questionCount: number;
}

/** Mock-backed quiz menu (replaces legacy /quiz_menu_list). */
export const quizzes: SeedQuiz[] = [
  {
    id: "quiz-constitution",
    title: "Constitution Basics",
    description: "Test your knowledge of the U.S. Constitution.",
    category: "Foundations",
    questionCount: 10,
  },
  {
    id: "quiz-branches",
    title: "Three Branches of Government",
    description: "Legislative, executive and judicial — who does what?",
    category: "Government",
    questionCount: 8,
  },
  {
    id: "quiz-voting",
    title: "Voting & Elections",
    description: "How elections work, from registration to the ballot box.",
    category: "Elections",
    questionCount: 12,
  },
  {
    id: "quiz-rights",
    title: "Civil Rights & Liberties",
    description: null,
    category: "Rights",
    questionCount: 9,
  },
];
