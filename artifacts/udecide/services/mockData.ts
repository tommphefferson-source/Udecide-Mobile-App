import type {
  Representative,
  Election,
  PoliticalParty,
  Bill,
  Poll,
  VoterInfo,
  PoliticalGuideSection,
} from "@/types/politics";

export const MOCK_REPRESENTATIVES: Representative[] = [
  {
    id: "1",
    name: "Jane Smith",
    office: "U.S. Senator",
    party: "Democrat",
    district: "At-Large",
    level: "federal",
    phone: "(202) 224-3121",
    email: "senator@smith.senate.gov",
    website: "https://www.senate.gov",
    twitter: "@SenJaneSmith",
    source: "congress.gov (mock data)",
    recentVotes: [
      { bill: "Infrastructure Investment Act", vote: "Yea", date: "2024-01-15" },
      { bill: "Healthcare Reform Bill", vote: "Yea", date: "2024-02-10" },
      { bill: "Defense Authorization Act", vote: "Nay", date: "2024-03-05" },
    ],
  },
  {
    id: "2",
    name: "Robert Johnson",
    office: "U.S. Representative",
    party: "Republican",
    district: "3rd Congressional District",
    level: "federal",
    phone: "(202) 225-5765",
    website: "https://www.house.gov",
    twitter: "@RepRobJohnson",
    source: "congress.gov (mock data)",
    recentVotes: [
      { bill: "Infrastructure Investment Act", vote: "Nay", date: "2024-01-15" },
      { bill: "Tax Relief Act", vote: "Yea", date: "2024-02-20" },
    ],
  },
  {
    id: "3",
    name: "Maria Garcia",
    office: "State Senator",
    party: "Democrat",
    district: "14th State Senate District",
    level: "state",
    phone: "(916) 651-4014",
    website: "https://senate.ca.gov",
    source: "State Legislature (mock data)",
  },
  {
    id: "4",
    name: "Thomas Lee",
    office: "State Assembly Member",
    party: "Republican",
    district: "28th Assembly District",
    level: "state",
    phone: "(916) 319-2028",
    website: "https://assembly.ca.gov",
    source: "State Legislature (mock data)",
  },
  {
    id: "5",
    name: "Patricia Williams",
    office: "County Supervisor",
    party: "Democrat",
    district: "District 2",
    level: "county",
    phone: "(213) 974-2222",
    website: "https://bos.lacounty.gov",
    source: "County Records (mock data)",
  },
  {
    id: "6",
    name: "David Chen",
    office: "City Council Member",
    party: "Independent",
    district: "Ward 5",
    level: "city",
    phone: "(213) 485-3337",
    website: "https://cityclerk.lacity.org",
    source: "City Records (mock data)",
  },
];

export const MOCK_ELECTIONS: Election[] = [
  {
    id: "1",
    name: "2025 General Election",
    date: "2025-11-04",
    type: "General",
    state: "CA",
    registrationDeadline: "2025-10-20",
    earlyVotingStart: "2025-10-20",
    earlyVotingEnd: "2025-11-03",
    absenteeDeadline: "2025-11-04",
    offices: [
      {
        id: "o1",
        title: "U.S. Senate",
        candidates: [
          { id: "c1", name: "Alex Rivera", party: "Democrat", incumbentFlag: true, website: "https://example.com" },
          { id: "c2", name: "Kim Anderson", party: "Republican", incumbentFlag: false },
          { id: "c3", name: "Jordan Park", party: "Libertarian", incumbentFlag: false },
        ],
      },
      {
        id: "o2",
        title: "Governor",
        candidates: [
          { id: "c4", name: "Sam Torres", party: "Democrat", incumbentFlag: true },
          { id: "c5", name: "Chris Morgan", party: "Republican", incumbentFlag: false },
        ],
      },
      {
        id: "o3",
        title: "State Assembly District 42",
        candidates: [
          { id: "c6", name: "Nina Patel", party: "Democrat", incumbentFlag: false },
          { id: "c7", name: "Marcus Hill", party: "Republican", incumbentFlag: true },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "2025 Primary Election",
    date: "2025-06-03",
    type: "Primary",
    state: "CA",
    registrationDeadline: "2025-05-19",
    earlyVotingStart: "2025-05-10",
    earlyVotingEnd: "2025-06-02",
    offices: [
      {
        id: "o4",
        title: "County Supervisor District 1",
        candidates: [
          { id: "c8", name: "Elena Vasquez", party: "Democrat", incumbentFlag: false },
          { id: "c9", name: "William Reed", party: "Democrat", incumbentFlag: true },
          { id: "c10", name: "Aisha Johnson", party: "Republican", incumbentFlag: false },
        ],
      },
    ],
  },
];

export const MOCK_PARTIES: PoliticalParty[] = [
  {
    id: "1",
    name: "Democratic Party",
    shortName: "DEM",
    color: "#1A4A8A",
    founded: "1828",
    currentLeader: "DNC Chair",
    website: "https://democrats.org",
    description:
      "One of the two major political parties in the United States. Generally advocates for a larger role of government in addressing economic and social issues.",
    corePositions: [
      "Progressive taxation",
      "Expanded social safety nets",
      "Healthcare access",
      "Climate action",
      "Voting rights expansion",
    ],
    icon: "D",
  },
  {
    id: "2",
    name: "Republican Party",
    shortName: "GOP",
    color: "#C41E3A",
    founded: "1854",
    currentLeader: "RNC Chair",
    website: "https://gop.com",
    description:
      "One of the two major political parties in the United States. Generally advocates for limited government, free markets, and traditional values.",
    corePositions: [
      "Lower taxes",
      "Limited government",
      "Free market economics",
      "Second Amendment rights",
      "Strong national defense",
    ],
    icon: "R",
  },
  {
    id: "3",
    name: "Libertarian Party",
    shortName: "LIB",
    color: "#D4AF37",
    founded: "1971",
    currentLeader: "National Chair",
    website: "https://lp.org",
    description:
      "The third largest political party in the U.S. Advocates for minimal government intervention in both personal and economic affairs.",
    corePositions: [
      "Individual liberty",
      "Minimal government",
      "Free markets",
      "Civil liberties",
      "Non-interventionist foreign policy",
    ],
    icon: "L",
  },
  {
    id: "4",
    name: "Green Party",
    shortName: "GRN",
    color: "#2E7D32",
    founded: "1991",
    currentLeader: "Co-Chairs",
    website: "https://gp.org",
    description:
      "Focuses on environmentalism, nonviolence, social justice, and grassroots democracy as its four core values.",
    corePositions: [
      "Environmental protection",
      "Social justice",
      "Non-violence",
      "Grassroots democracy",
      "Decentralization",
    ],
    icon: "G",
  },
  {
    id: "5",
    name: "Independent / No Party",
    shortName: "IND",
    color: "#6B7A8D",
    founded: "N/A",
    currentLeader: "N/A",
    website: "https://ballotpedia.org",
    description:
      "Independent candidates and voters who do not affiliate with a major political party. Views span the full political spectrum.",
    corePositions: [
      "Issue-by-issue positions",
      "Cross-partisan solutions",
      "Voter choice expansion",
    ],
    icon: "I",
  },
];

export const MOCK_BILLS: Bill[] = [
  {
    id: "1",
    billId: "CA-SB-100",
    number: "SB 100",
    title: "Clean Energy and Pollution Reduction Act",
    description:
      "Establishes a goal for California to achieve 100% clean electricity by 2045 and reduces greenhouse gas emissions.",
    status: "Enrolled",
    state: "CA",
    session: "2023-2024",
    lastAction: "Signed by Governor",
    lastActionDate: "2024-03-15",
    sponsors: ["Sen. Maria Garcia", "Asm. David Lee"],
    votes: [
      { date: "2024-02-28", chamber: "Senate", yea: 28, nay: 11, absent: 1, result: "Passed" },
      { date: "2024-03-05", chamber: "Assembly", yea: 54, nay: 25, absent: 1, result: "Passed" },
    ],
    history: [
      { date: "2024-01-10", action: "Introduced in Senate", chamber: "Senate" },
      { date: "2024-02-01", action: "Passed Senate Energy Committee", chamber: "Senate" },
      { date: "2024-02-28", action: "Passed Senate Floor Vote", chamber: "Senate" },
      { date: "2024-03-05", action: "Passed Assembly Floor Vote", chamber: "Assembly" },
      { date: "2024-03-15", action: "Signed by Governor" },
    ],
    source: "LegiScan (mock data)",
  },
  {
    id: "2",
    billId: "CA-AB-2847",
    number: "AB 2847",
    title: "Housing Affordability and Development Act",
    description:
      "Streamlines local approval processes for affordable housing projects and reduces barriers to new construction.",
    status: "In Committee",
    state: "CA",
    session: "2023-2024",
    lastAction: "In Assembly Housing Committee",
    lastActionDate: "2024-04-02",
    sponsors: ["Asm. Jennifer Wong"],
    history: [
      { date: "2024-02-15", action: "Introduced in Assembly", chamber: "Assembly" },
      { date: "2024-03-20", action: "Referred to Housing Committee", chamber: "Assembly" },
    ],
    source: "LegiScan (mock data)",
  },
  {
    id: "3",
    billId: "US-HR-1234",
    number: "H.R. 1234",
    title: "Voting Rights Advancement Act",
    description:
      "Restores and strengthens key provisions of the Voting Rights Act of 1965 and establishes new protections for voters.",
    status: "Passed House",
    state: "US",
    session: "118th Congress",
    lastAction: "Referred to Senate Judiciary Committee",
    lastActionDate: "2024-03-28",
    sponsors: ["Rep. James Wilson (D-GA)", "Rep. Patricia Lee (D-CA)"],
    votes: [
      { date: "2024-03-20", chamber: "House", yea: 220, nay: 210, absent: 5, result: "Passed" },
    ],
    source: "Congress.gov (mock data)",
  },
];

export const MOCK_POLLS: Poll[] = [
  {
    id: "1",
    question: "What do you think is the most important issue facing the country right now?",
    topic: "Economy",
    options: [
      { id: "o1", text: "Economy and inflation", votes: 1847 },
      { id: "o2", text: "Healthcare costs", votes: 1203 },
      { id: "o3", text: "Climate change", votes: 987 },
      { id: "o4", text: "Immigration", votes: 756 },
      { id: "o5", text: "Education", votes: 543 },
    ],
    totalVotes: 5336,
    createdAt: "2025-05-01",
    disclaimer:
      "Polls are for informational engagement only and are not scientific unless explicitly stated.",
  },
  {
    id: "2",
    question: "How satisfied are you with the current state of voting access in your state?",
    topic: "Voting Access",
    options: [
      { id: "o6", text: "Very satisfied", votes: 421 },
      { id: "o7", text: "Somewhat satisfied", votes: 687 },
      { id: "o8", text: "Somewhat dissatisfied", votes: 534 },
      { id: "o9", text: "Very dissatisfied", votes: 398 },
    ],
    totalVotes: 2040,
    createdAt: "2025-05-05",
    disclaimer:
      "Polls are for informational engagement only and are not scientific unless explicitly stated.",
  },
  {
    id: "3",
    question: "Which aspect of the healthcare system needs the most improvement?",
    topic: "Healthcare",
    options: [
      { id: "o10", text: "Affordability of insurance", votes: 2341 },
      { id: "o11", text: "Access to providers", votes: 1123 },
      { id: "o12", text: "Prescription drug costs", votes: 1876 },
      { id: "o13", text: "Mental health services", votes: 998 },
    ],
    totalVotes: 6338,
    createdAt: "2025-05-10",
    disclaimer:
      "Polls are for informational engagement only and are not scientific unless explicitly stated.",
  },
  {
    id: "4",
    question: "How should the U.S. approach climate change legislation?",
    topic: "Climate",
    options: [
      { id: "o14", text: "Aggressive federal mandates", votes: 876 },
      { id: "o15", text: "Market-based incentives", votes: 1234 },
      { id: "o16", text: "State-level decisions only", votes: 543 },
      { id: "o17", text: "International agreements", votes: 432 },
    ],
    totalVotes: 3085,
    createdAt: "2025-05-12",
    disclaimer:
      "Polls are for informational engagement only and are not scientific unless explicitly stated.",
  },
];

export const MOCK_VOTER_INFO: Record<string, VoterInfo> = {
  CA: {
    state: "California",
    registrationDeadline: "15 days before Election Day (online/mail); same-day registration available at polls",
    earlyVotingAllowed: true,
    earlyVotingStart: "28 days before Election Day",
    earlyVotingEnd: "Day before Election Day",
    noExcuseAbsentee: true,
    voterIdRequired: false,
    voterIdTypes: ["Signature verification used instead"],
    onlineRegistration: true,
    sameDayRegistration: true,
    source: "California Secretary of State (mock data)",
  },
  TX: {
    state: "Texas",
    registrationDeadline: "30 days before Election Day",
    earlyVotingAllowed: true,
    earlyVotingStart: "17 days before Election Day",
    earlyVotingEnd: "4 days before Election Day",
    noExcuseAbsentee: false,
    voterIdRequired: true,
    voterIdTypes: ["Texas Driver License", "Texas ID Card", "Handgun License", "Military ID", "U.S. Passport"],
    onlineRegistration: false,
    sameDayRegistration: false,
    source: "Texas Secretary of State (mock data)",
  },
  NY: {
    state: "New York",
    registrationDeadline: "25 days before Election Day",
    earlyVotingAllowed: true,
    earlyVotingStart: "10 days before Election Day",
    earlyVotingEnd: "2 days before Election Day",
    noExcuseAbsentee: true,
    voterIdRequired: false,
    voterIdTypes: ["Signature verification used"],
    onlineRegistration: true,
    sameDayRegistration: false,
    source: "New York Board of Elections (mock data)",
  },
  FL: {
    state: "Florida",
    registrationDeadline: "29 days before Election Day",
    earlyVotingAllowed: true,
    earlyVotingStart: "10 days before Election Day",
    earlyVotingEnd: "3 days before Election Day",
    noExcuseAbsentee: true,
    voterIdRequired: true,
    voterIdTypes: ["Florida Driver License", "Florida ID Card", "U.S. Passport", "Debit/Credit Card with photo", "Student ID"],
    onlineRegistration: true,
    sameDayRegistration: false,
    source: "Florida Division of Elections (mock data)",
  },
};

export const MOCK_POLITICAL_GUIDE: PoliticalGuideSection[] = [
  {
    id: "branches",
    title: "Three Branches of Government",
    icon: "account-balance",
    items: [
      {
        id: "executive",
        title: "Executive Branch",
        content:
          "The Executive Branch is headed by the President of the United States. It includes the Vice President, the Cabinet, and federal agencies. The President enforces laws, commands the military, conducts foreign policy, and appoints federal judges. The President is elected every four years and is limited to two terms.\n\nKey roles: President, Vice President, Cabinet Secretaries, federal agencies (FBI, CIA, NASA, etc.)",
      },
      {
        id: "legislative",
        title: "Legislative Branch (Congress)",
        content:
          "Congress is the lawmaking body of the U.S. government. It is bicameral, meaning it has two chambers:\n\n• Senate: 100 senators (2 per state), serving 6-year terms. The Senate confirms presidential appointments and ratifies treaties.\n\n• House of Representatives: 435 members, with seats apportioned by state population, serving 2-year terms. All revenue bills originate here.\n\nCongress can declare war, control federal spending, and override presidential vetoes with a 2/3 majority.",
      },
      {
        id: "judicial",
        title: "Judicial Branch",
        content:
          "The Judicial Branch interprets laws and ensures they comply with the Constitution. It is headed by the Supreme Court, which consists of 9 justices appointed for life by the President with Senate confirmation.\n\nThe federal court system includes:\n• 94 District Courts (trial courts)\n• 13 Circuit Courts of Appeals\n• 1 Supreme Court (final authority)\n\nJudicial review — the power to strike down unconstitutional laws — was established in Marbury v. Madison (1803).",
      },
      {
        id: "checks",
        title: "Checks and Balances",
        content:
          "The Constitution creates a system of checks and balances to prevent any single branch from becoming too powerful:\n\n• Congress can override presidential vetoes (2/3 majority)\n• The President can veto legislation\n• Courts can strike down laws as unconstitutional\n• The Senate confirms presidential appointments\n• Congress can impeach the President or judges\n• The President appoints Supreme Court justices\n\nThis system ensures power is distributed and each branch can limit the others.",
      },
    ],
  },
  {
    id: "lawmaking",
    title: "How Laws Are Made",
    icon: "gavel",
    items: [
      {
        id: "bill-process",
        title: "How a Bill Becomes Law",
        content:
          "1. Introduction: A bill is introduced in the House or Senate by a member of Congress.\n\n2. Committee Review: The bill is sent to a relevant committee for study, hearings, and possible amendments.\n\n3. Floor Vote: If the committee approves the bill, it goes to the full chamber for debate and a vote.\n\n4. Other Chamber: The bill goes to the other chamber (House or Senate), where it goes through a similar process.\n\n5. Conference Committee: If both chambers pass different versions, a conference committee reconciles the differences.\n\n6. Presidential Action: The President can sign the bill (it becomes law), veto it (Congress can override with 2/3 vote), or do nothing (bill becomes law after 10 days if Congress is in session).",
      },
    ],
  },
  {
    id: "constitution",
    title: "The Constitution",
    icon: "library-books",
    items: [
      {
        id: "constitution-overview",
        title: "U.S. Constitution Overview",
        content:
          "The U.S. Constitution, ratified in 1788, is the supreme law of the United States. It establishes the framework of government, defines the powers of each branch, and protects fundamental rights.\n\nThe Constitution consists of:\n• A Preamble\n• 7 Articles (original text)\n• 27 Amendments\n\nThe first 10 Amendments, known as the Bill of Rights, were ratified in 1791.",
      },
      {
        id: "bill-of-rights",
        title: "Bill of Rights",
        content:
          "The first 10 Amendments to the Constitution protect fundamental rights:\n\n1st: Freedom of religion, speech, press, assembly, and petition\n2nd: Right to keep and bear arms\n3rd: No quartering of soldiers in private homes\n4th: Protection from unreasonable searches and seizures\n5th: Due process rights, no double jeopardy, no self-incrimination\n6th: Right to fair and speedy trial\n7th: Right to jury trial in civil cases\n8th: No cruel and unusual punishment\n9th: Rights not listed in Constitution are retained by people\n10th: Powers not given to federal government are reserved to states",
      },
      {
        id: "key-amendments",
        title: "Key Amendments",
        content:
          "Key Constitutional Amendments beyond the Bill of Rights:\n\n13th (1865): Abolished slavery\n14th (1868): Equal protection and due process; defined citizenship\n15th (1870): Prohibited denying vote based on race\n17th (1913): Direct election of U.S. Senators\n19th (1920): Gave women the right to vote\n24th (1964): Abolished poll taxes\n26th (1971): Lowered voting age to 18",
      },
    ],
  },
  {
    id: "elections",
    title: "Elections & Voting",
    icon: "how-to-vote",
    items: [
      {
        id: "electoral-college",
        title: "Electoral College",
        content:
          "The Electoral College is the system used to elect the President and Vice President. Each state receives electoral votes equal to its total Congressional representation (House seats + 2 Senate seats). Washington D.C. receives 3 electoral votes (23rd Amendment).\n\nTotal electoral votes: 538\nMajority needed to win: 270\n\nIn 48 states, the winner of the popular vote receives all electoral votes (winner-take-all). Maine and Nebraska award electoral votes by congressional district.\n\nIf no candidate reaches 270, the House of Representatives chooses the President.",
      },
      {
        id: "primaries",
        title: "Primaries, Caucuses & General Elections",
        content:
          "Primary Elections: Voters choose their party's nominee for the general election. Types include:\n• Closed primary: Only registered party members may vote\n• Open primary: Any registered voter may participate\n• Blanket/Top-two primary: All candidates on one ballot; top two advance\n\nCaucuses: Community meetings where voters publicly declare support and negotiate until a candidate is chosen. Used in some states like Iowa.\n\nGeneral Election: Held in November in even years. All qualified voters choose among the nominated candidates and any independents on the ballot.",
      },
      {
        id: "voting-rights-history",
        title: "Voting Rights History",
        content:
          "The right to vote in the U.S. has expanded over time:\n\n• 1870: 15th Amendment prohibits denying vote based on race (men)\n• 1920: 19th Amendment grants women the right to vote\n• 1924: Native Americans granted citizenship and voting rights\n• 1965: Voting Rights Act bans discriminatory voting practices\n• 1971: 26th Amendment lowers voting age to 18\n\nDespite progress, challenges to voting access continue to be debated and litigated across the country.",
      },
    ],
  },
  {
    id: "federalism",
    title: "Federal vs. State Government",
    icon: "flag",
    items: [
      {
        id: "federalism-overview",
        title: "Federalism Explained",
        content:
          "The U.S. operates under a federal system, meaning power is shared between the national (federal) government and state governments.\n\nFederal Government Powers (Enumerated):\n• Declare war\n• Regulate interstate commerce\n• Coin money\n• Conduct foreign policy\n• Run the postal service\n\nState Government Powers (Reserved):\n• Education policy\n• Driver's licenses\n• Marriage laws\n• Intrastate commerce\n• Most criminal law\n\nConcurrent Powers (Both levels):\n• Taxation\n• Building roads\n• Establishing courts\n• Borrowing money",
      },
    ],
  },
];
