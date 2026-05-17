import { MOCK_VOTER_INFO } from "./mockData";
import type { VoterInfo } from "@/types/politics";

export async function getVoterInfo(state: string): Promise<VoterInfo | null> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const info = MOCK_VOTER_INFO[state.toUpperCase()];
  if (!info) {
    return {
      state: state,
      registrationDeadline: "Contact your state election office for deadlines",
      earlyVotingAllowed: false,
      noExcuseAbsentee: false,
      voterIdRequired: false,
      onlineRegistration: false,
      sameDayRegistration: false,
      source: "Please verify with your official state election office",
    };
  }
  return info;
}

export async function checkRegistrationStatus(_state: string): Promise<{
  url: string;
  message: string;
}> {
  const stateUrls: Record<string, string> = {
    CA: "https://voterstatus.sos.ca.gov",
    TX: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
    NY: "https://voterlookup.elections.ny.gov",
    FL: "https://registration.elections.myflorida.com/CheckVoterStatus",
  };
  const url = stateUrls[_state.toUpperCase()] ?? "https://vote.gov/register/";
  return {
    url,
    message:
      "Check your registration status at your state's official election website. This app will open the official government site.",
  };
}

export async function findPollingPlace(_state: string): Promise<{
  url: string;
  message: string;
}> {
  return {
    url: "https://www.vote.gov/polling-place-locator/",
    message:
      "Find your polling place at vote.gov or your state's official election website.",
  };
}
