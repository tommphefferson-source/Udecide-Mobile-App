export interface SeedHomeSection {
  id: string;
  title: string;
  subtitle: string | null;
  route: string | null;
}

/** Mock-backed home metadata (replaces legacy /home_data). */
export const homeContent: {
  newsUrl: string;
  sections: SeedHomeSection[];
} = {
  newsUrl: "https://www.usa.gov/voting-and-elections",
  sections: [
    {
      id: "elections",
      title: "Elections & Ballots",
      subtitle: "Upcoming elections and what's on your ballot",
      route: "/elections",
    },
    {
      id: "representatives",
      title: "Your Representatives",
      subtitle: "Find federal, state and local officials",
      route: "/representatives",
    },
    {
      id: "polls",
      title: "Community Polls",
      subtitle: "See where people stand on the issues",
      route: "/polls",
    },
    {
      id: "civics",
      title: "Learn the System",
      subtitle: "Quizzes, terminology and party guides",
      route: "/political-guide",
    },
  ],
};
