export interface Representative {
  id: string;
  name: string;
  office: string;
  party: string;
  district: string;
  level: "federal" | "state" | "county" | "city";
  phone?: string;
  email?: string;
  website?: string;
  twitter?: string;
  facebook?: string;
  imageUrl?: string;
  address?: string;
  recentVotes?: VotingRecord[];
  source: string;
}

export interface VotingRecord {
  bill: string;
  vote: "Yea" | "Nay" | "Absent" | "Not Voting";
  date: string;
}

export interface Election {
  id: string;
  name: string;
  date: string;
  type: "General" | "Primary" | "Special" | "Runoff";
  state: string;
  registrationDeadline: string;
  earlyVotingStart?: string;
  earlyVotingEnd?: string;
  absenteeDeadline?: string;
  offices: ElectionOffice[];
}

export interface ElectionOffice {
  id: string;
  title: string;
  district?: string;
  candidates: Candidate[];
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  website?: string;
  twitter?: string;
  facebook?: string;
  incumbentFlag: boolean;
}

export interface PoliticalParty {
  id: string;
  name: string;
  shortName: string;
  color: string;
  founded: string;
  currentLeader: string;
  website: string;
  description: string;
  corePositions: string[];
  icon: string;
}

export interface Bill {
  id: string;
  billId: string;
  number: string;
  title: string;
  description: string;
  status: string;
  state: string;
  session: string;
  lastAction: string;
  lastActionDate: string;
  sponsors: string[];
  votes?: BillVote[];
  history?: BillHistory[];
  textUrl?: string;
  source: string;
}

export interface BillVote {
  date: string;
  chamber: string;
  yea: number;
  nay: number;
  absent: number;
  result: string;
}

export interface BillHistory {
  date: string;
  action: string;
  chamber?: string;
}

export interface Poll {
  id: string;
  question: string;
  topic: string;
  options: PollOption[];
  totalVotes: number;
  createdAt: string;
  expiresAt?: string;
  disclaimer: string;
  userVoted?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface VoterInfo {
  state: string;
  registrationDeadline: string;
  earlyVotingAllowed: boolean;
  earlyVotingStart?: string;
  earlyVotingEnd?: string;
  noExcuseAbsentee: boolean;
  voterIdRequired: boolean;
  voterIdTypes?: string[];
  onlineRegistration: boolean;
  sameDayRegistration: boolean;
  source: string;
}

export interface PoliticalGuideSection {
  id: string;
  title: string;
  icon: string;
  items: PoliticalGuideItem[];
}

export interface PoliticalGuideItem {
  id: string;
  title: string;
  content: string;
}

export type PollTopic =
  | "Economy"
  | "Healthcare"
  | "Immigration"
  | "Education"
  | "Climate"
  | "Foreign Policy"
  | "Technology"
  | "Voting Access"
  | "All";
