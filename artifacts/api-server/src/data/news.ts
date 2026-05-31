export interface SeedNewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}

/**
 * Mock-backed news content. The legacy app mainly consumed a `news_url`; this
 * keeps that field while adding a structured, expandable article list.
 */
export const newsContent: {
  newsUrl: string;
  title: string;
  description: string;
  source: string;
  articles: SeedNewsArticle[];
} = {
  newsUrl: "https://www.usa.gov/voting-and-elections",
  title: "Voting & Elections News",
  description: "Nonpartisan updates on elections, deadlines and civic participation.",
  source: "USA.gov",
  articles: [
    {
      id: "news-register",
      title: "Check your voter registration status",
      description:
        "Make sure your registration is current ahead of upcoming elections.",
      source: "USA.gov",
      url: "https://www.usa.gov/voter-registration",
      publishedAt: "2026-05-01",
    },
    {
      id: "news-deadlines",
      title: "Know your state's voting deadlines",
      description:
        "Registration, absentee and early-voting deadlines vary by state.",
      source: "USA.gov",
      url: "https://www.usa.gov/election-office",
      publishedAt: "2026-05-10",
    },
    {
      id: "news-ballot",
      title: "Research what's on your ballot",
      description:
        "Preview candidates and measures before you head to the polls.",
      source: "USA.gov",
      url: "https://www.usa.gov/midterm-elections",
      publishedAt: "2026-05-18",
    },
  ],
};
