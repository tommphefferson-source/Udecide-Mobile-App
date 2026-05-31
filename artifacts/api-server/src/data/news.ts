export interface SeedNewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  content?: string;
  imageUrl?: string;
  author?: string;
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
      author: "USA.gov",
      content:
        "Your voter registration is what allows you to cast a ballot in an election. Rules vary by state, and registrations can lapse if you move, change your name, or skip several election cycles.\n\nMost states let you confirm your status online in just a few minutes. Have your name, date of birth, and home address ready.\n\nIf you find that you are not registered, or your information is out of date, you can usually fix it through your state's election website before the registration deadline.",
    },
    {
      id: "news-deadlines",
      title: "Know your state's voting deadlines",
      description:
        "Registration, absentee and early-voting deadlines vary by state.",
      source: "USA.gov",
      url: "https://www.usa.gov/election-office",
      publishedAt: "2026-05-10",
      author: "USA.gov",
      content:
        "Every state sets its own deadlines for registering to vote, requesting an absentee or mail-in ballot, and voting early in person.\n\nMissing a deadline by even a day can mean you are unable to vote in that election, so it pays to check the dates well in advance.\n\nContact your state or local election office to confirm the exact deadlines that apply where you live, and mark them on your calendar.",
    },
    {
      id: "news-ballot",
      title: "Research what's on your ballot",
      description:
        "Preview candidates and measures before you head to the polls.",
      source: "USA.gov",
      url: "https://www.usa.gov/midterm-elections",
      publishedAt: "2026-05-18",
      author: "USA.gov",
      content:
        "Ballots often include far more than the headline races. Local offices, judicial retentions, and ballot measures can all have a direct impact on your community.\n\nReviewing a sample ballot before election day lets you research each candidate and question at your own pace, so you are not making decisions for the first time in the voting booth.\n\nMany election offices publish sample ballots based on your address a few weeks before the election.",
    },
  ],
};
