export interface SeedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface SeedCivicsQuiz {
  id: string;
  title: string;
  description: string;
  questions: SeedQuizQuestion[];
}

/** Mock-backed Civics 101 quiz served at GET /quiz. */
export const civicsQuiz: SeedCivicsQuiz = {
  id: "civics-101",
  title: "Civics 101 Quiz",
  description: "Nonpartisan civic education based on official U.S. government sources.",
  questions: [
    {
      id: "q1",
      question: "How many branches are there in the U.S. federal government?",
      options: ["Two", "Three", "Four", "Five"],
      answerIndex: 1,
      explanation:
        "Three: the legislative (Congress), the executive (President), and the judicial (courts).",
    },
    {
      id: "q2",
      question: "What is the supreme law of the land?",
      options: [
        "The Declaration of Independence",
        "Federal statutes",
        "The Constitution",
        "Executive orders",
      ],
      answerIndex: 2,
      explanation: "The U.S. Constitution is the supreme law of the land.",
    },
    {
      id: "q3",
      question: "How many U.S. Senators are there in total?",
      options: ["50", "100", "435", "538"],
      answerIndex: 1,
      explanation: "There are 100 Senators — two from each of the 50 states.",
    },
    {
      id: "q4",
      question: "What are the first ten amendments to the Constitution called?",
      options: [
        "The Articles",
        "The Bill of Rights",
        "The Federalist Papers",
        "The Preamble",
      ],
      answerIndex: 1,
      explanation: "The first ten amendments are known as the Bill of Rights.",
    },
    {
      id: "q5",
      question: "How long is the term of a member of the U.S. House of Representatives?",
      options: ["Two years", "Four years", "Six years", "Eight years"],
      answerIndex: 0,
      explanation:
        "Representatives serve two-year terms; the entire House is up for election every two years.",
    },
    {
      id: "q6",
      question: "Who has the power to declare war?",
      options: ["The President", "The Supreme Court", "Congress", "State governors"],
      answerIndex: 2,
      explanation: "The Constitution grants Congress the power to declare war.",
    },
    {
      id: "q7",
      question: "How many justices serve on the U.S. Supreme Court?",
      options: ["Seven", "Nine", "Eleven", "Twelve"],
      answerIndex: 1,
      explanation: "The Supreme Court has nine justices, including one Chief Justice.",
    },
    {
      id: "q8",
      question: "How old must a person be to vote in U.S. federal elections?",
      options: ["16", "18", "21", "25"],
      answerIndex: 1,
      explanation: "The 26th Amendment set the voting age at 18.",
    },
  ],
};
