import type { Representative } from "@/types/politics";
import { getMembers } from "./congressApi";

const CIVIC_API_KEY = process.env.EXPO_PUBLIC_CIVIC_API_KEY;
const BASE_URL = "https://www.googleapis.com/civicinfo/v2/representatives";

export function isCivicMockMode() {
  return !CIVIC_API_KEY;
}

// ── Google Civic Information API response shapes ──────────────────────────────

interface CivicOffice {
  name: string;
  divisionId: string;
  levels?: string[];
  roles?: string[];
  officialIndices: number[];
}

interface CivicChannel {
  type: string;
  id: string;
}

interface CivicOfficial {
  name: string;
  address?: { line1?: string; city?: string; state?: string; zip?: string }[];
  party?: string;
  phones?: string[];
  urls?: string[];
  photoUrl?: string;
  channels?: CivicChannel[];
  emails?: string[];
}

interface CivicResponse {
  offices?: CivicOffice[];
  officials?: CivicOfficial[];
}

// ── State-specific mock data for state / county / city levels ─────────────────

const STATE_MOCK_REPS: Record<string, Representative[]> = {
  CA: [
    { id: "ca-gov", name: "Gavin Newsom", office: "Governor", party: "Democrat", district: "California", level: "state", phone: "(916) 445-2841", website: "https://gov.ca.gov", source: "Sample data" },
    { id: "ca-ltgov", name: "Eleni Kounalakis", office: "Lt. Governor", party: "Democrat", district: "California", level: "state", phone: "(916) 445-8994", website: "https://ltg.ca.gov", source: "Sample data" },
    { id: "ca-s1", name: "Toni Atkins", office: "State Senator", party: "Democrat", district: "39th Senate District", level: "state", phone: "(619) 645-3090", website: "https://sd39.senate.ca.gov", source: "Sample data" },
    { id: "ca-s2", name: "Brian Jones", office: "State Senator", party: "Republican", district: "40th Senate District", level: "state", phone: "(916) 651-4040", website: "https://senate.ca.gov", source: "Sample data" },
    { id: "ca-a1", name: "Isaac Bryan", office: "State Assembly Member", party: "Democrat", district: "55th Assembly District", level: "state", phone: "(916) 319-2055", website: "https://assembly.ca.gov", source: "Sample data" },
    { id: "ca-a2", name: "Diane Dixon", office: "State Assembly Member", party: "Republican", district: "72nd Assembly District", level: "state", phone: "(916) 319-2072", website: "https://assembly.ca.gov", source: "Sample data" },
    { id: "ca-c1", name: "Lindsey Horvath", office: "County Supervisor", party: "Democrat", district: "3rd District — Los Angeles County", level: "county", phone: "(213) 974-3333", website: "https://bos.lacounty.gov", source: "Sample data" },
    { id: "ca-c2", name: "Janice Hahn", office: "County Supervisor", party: "Democrat", district: "4th District — Los Angeles County", level: "county", phone: "(213) 974-4444", website: "https://bos.lacounty.gov", source: "Sample data" },
    { id: "ca-ci1", name: "Bob Blumenfield", office: "City Council Member", party: "Democrat", district: "3rd District — Los Angeles", level: "city", phone: "(818) 756-8501", website: "https://councilmember.blumenfield.com", source: "Sample data" },
    { id: "ca-ci2", name: "Monica Rodriguez", office: "City Council Member", party: "Democrat", district: "7th District — Los Angeles", level: "city", phone: "(213) 485-3337", website: "https://cityclerk.lacity.org", source: "Sample data" },
  ],
  TX: [
    { id: "tx-gov", name: "Greg Abbott", office: "Governor", party: "Republican", district: "Texas", level: "state", phone: "(512) 463-2000", website: "https://gov.texas.gov", source: "Sample data" },
    { id: "tx-ltgov", name: "Dan Patrick", office: "Lt. Governor", party: "Republican", district: "Texas", level: "state", phone: "(512) 463-0001", website: "https://ltgov.texas.gov", source: "Sample data" },
    { id: "tx-s1", name: "Royce West", office: "State Senator", party: "Democrat", district: "23rd Senate District", level: "state", phone: "(214) 467-0123", website: "https://senate.texas.gov", source: "Sample data" },
    { id: "tx-s2", name: "Angela Paxton", office: "State Senator", party: "Republican", district: "8th Senate District", level: "state", phone: "(972) 881-8100", website: "https://senate.texas.gov", source: "Sample data" },
    { id: "tx-a1", name: "Chris Turner", office: "State Representative", party: "Democrat", district: "101st House District", level: "state", phone: "(512) 463-0574", website: "https://house.texas.gov", source: "Sample data" },
    { id: "tx-a2", name: "Jeff Leach", office: "State Representative", party: "Republican", district: "67th House District", level: "state", phone: "(512) 463-0544", website: "https://house.texas.gov", source: "Sample data" },
    { id: "tx-c1", name: "Lina Hidalgo", office: "County Judge", party: "Democrat", district: "Harris County", level: "county", phone: "(713) 755-5000", website: "https://harriscountytx.gov", source: "Sample data" },
    { id: "tx-ci1", name: "Annise Parker", office: "City Council (Fmr. Mayor)", party: "Democrat", district: "At-Large — Houston", level: "city", phone: "(713) 247-2200", website: "https://houstontx.gov", source: "Sample data" },
  ],
  NY: [
    { id: "ny-gov", name: "Kathy Hochul", office: "Governor", party: "Democrat", district: "New York", level: "state", phone: "(518) 474-8390", website: "https://governor.ny.gov", source: "Sample data" },
    { id: "ny-ltgov", name: "Antonio Delgado", office: "Lt. Governor", party: "Democrat", district: "New York", level: "state", phone: "(518) 402-2292", website: "https://ltgov.ny.gov", source: "Sample data" },
    { id: "ny-s1", name: "Brad Hoylman-Sigal", office: "State Senator", party: "Democrat", district: "27th Senate District", level: "state", phone: "(212) 633-8052", website: "https://nysenate.gov", source: "Sample data" },
    { id: "ny-s2", name: "George Borrello", office: "State Senator", party: "Republican", district: "57th Senate District", level: "state", phone: "(716) 664-4603", website: "https://nysenate.gov", source: "Sample data" },
    { id: "ny-a1", name: "Yuh-Line Niou", office: "State Assembly Member", party: "Democrat", district: "65th Assembly District", level: "state", phone: "(212) 312-1420", website: "https://assembly.state.ny.us", source: "Sample data" },
    { id: "ny-a2", name: "Michael Lawler", office: "State Assembly Member", party: "Republican", district: "97th Assembly District", level: "state", phone: "(845) 705-8640", website: "https://assembly.state.ny.us", source: "Sample data" },
    { id: "ny-c1", name: "Mark Levine", office: "Manhattan Borough President", party: "Democrat", district: "Manhattan", level: "county", phone: "(212) 669-8300", website: "https://manhattanbp.nyc.gov", source: "Sample data" },
    { id: "ny-ci1", name: "Gale Brewer", office: "City Council Member", party: "Democrat", district: "6th District — New York City", level: "city", phone: "(212) 788-7800", website: "https://council.nyc.gov", source: "Sample data" },
  ],
  FL: [
    { id: "fl-gov", name: "Ron DeSantis", office: "Governor", party: "Republican", district: "Florida", level: "state", phone: "(850) 717-9337", website: "https://flgov.com", source: "Sample data" },
    { id: "fl-ltgov", name: "Jeanette Nuñez", office: "Lt. Governor", party: "Republican", district: "Florida", level: "state", phone: "(850) 717-9331", website: "https://flgov.com/lt-governor", source: "Sample data" },
    { id: "fl-s1", name: "Shevrin Jones", office: "State Senator", party: "Democrat", district: "35th Senate District", level: "state", phone: "(954) 967-7100", website: "https://flsenate.gov", source: "Sample data" },
    { id: "fl-s2", name: "Jay Collins", office: "State Senator", party: "Republican", district: "14th Senate District", level: "state", phone: "(813) 558-1450", website: "https://flsenate.gov", source: "Sample data" },
    { id: "fl-a1", name: "Fentrice Driskell", office: "State Representative", party: "Democrat", district: "69th House District", level: "state", phone: "(850) 717-5069", website: "https://myfloridahouse.gov", source: "Sample data" },
    { id: "fl-a2", name: "Bobby Payne", office: "State Representative", party: "Republican", district: "20th House District", level: "state", phone: "(850) 717-5020", website: "https://myfloridahouse.gov", source: "Sample data" },
    { id: "fl-c1", name: "Daniella Levine Cava", office: "County Mayor", party: "Democrat", district: "Miami-Dade County", level: "county", phone: "(305) 375-5071", website: "https://miamidade.gov", source: "Sample data" },
    { id: "fl-ci1", name: "Christine King", office: "City Commissioner", party: "Nonpartisan", district: "Seat 4 — Miami", level: "city", phone: "(305) 250-5300", website: "https://miamigov.com", source: "Sample data" },
  ],
  IL: [
    { id: "il-gov", name: "JB Pritzker", office: "Governor", party: "Democrat", district: "Illinois", level: "state", phone: "(217) 782-0244", website: "https://illinois.gov/government/governor", source: "Sample data" },
    { id: "il-ltgov", name: "Juliana Stratton", office: "Lt. Governor", party: "Democrat", district: "Illinois", level: "state", phone: "(217) 782-7884", website: "https://www2.illinois.gov/ltg", source: "Sample data" },
    { id: "il-s1", name: "Sara Feigenholtz", office: "State Senator", party: "Democrat", district: "6th Senate District", level: "state", phone: "(773) 296-4141", website: "https://ilga.gov", source: "Sample data" },
    { id: "il-s2", name: "Jason Barickman", office: "State Senator", party: "Republican", district: "53rd Senate District", level: "state", phone: "(309) 662-0793", website: "https://ilga.gov", source: "Sample data" },
    { id: "il-a1", name: "Kam Buckner", office: "State Representative", party: "Democrat", district: "26th House District", level: "state", phone: "(312) 386-0993", website: "https://ilga.gov", source: "Sample data" },
    { id: "il-a2", name: "Tom Weber", office: "State Representative", party: "Republican", district: "64th House District", level: "state", phone: "(815) 385-1010", website: "https://ilga.gov", source: "Sample data" },
    { id: "il-c1", name: "Toni Preckwinkle", office: "County Board President", party: "Democrat", district: "Cook County", level: "county", phone: "(312) 603-6400", website: "https://cookcountyil.gov", source: "Sample data" },
    { id: "il-ci1", name: "Walter Burnett Jr.", office: "Alderman", party: "Democrat", district: "27th Ward — Chicago", level: "city", phone: "(312) 744-6098", website: "https://chicago.gov", source: "Sample data" },
  ],
  PA: [
    { id: "pa-gov", name: "Josh Shapiro", office: "Governor", party: "Democrat", district: "Pennsylvania", level: "state", phone: "(717) 787-2500", website: "https://governor.pa.gov", source: "Sample data" },
    { id: "pa-ltgov", name: "Austin Davis", office: "Lt. Governor", party: "Democrat", district: "Pennsylvania", level: "state", phone: "(717) 787-3300", website: "https://governor.pa.gov/lt-governor", source: "Sample data" },
    { id: "pa-s1", name: "Nikil Saval", office: "State Senator", party: "Democrat", district: "1st Senate District", level: "state", phone: "(215) 965-0197", website: "https://pasenate.com", source: "Sample data" },
    { id: "pa-s2", name: "Camera Bartolotta", office: "State Senator", party: "Republican", district: "46th Senate District", level: "state", phone: "(724) 746-3120", website: "https://pasenate.com", source: "Sample data" },
    { id: "pa-a1", name: "Malcolm Kenyatta", office: "State Representative", party: "Democrat", district: "181st House District", level: "state", phone: "(215) 291-5643", website: "https://pahousedems.com", source: "Sample data" },
    { id: "pa-a2", name: "Ryan Warner", office: "State Representative", party: "Republican", district: "52nd House District", level: "state", phone: "(724) 785-0210", website: "https://pagop.org", source: "Sample data" },
    { id: "pa-c1", name: "Kevin Boyle", office: "County Commissioner", party: "Democrat", district: "Philadelphia County", level: "county", phone: "(215) 686-1776", website: "https://phila.gov", source: "Sample data" },
    { id: "pa-ci1", name: "Kenyatta Johnson", office: "City Council Member", party: "Democrat", district: "2nd District — Philadelphia", level: "city", phone: "(215) 686-3412", website: "https://phlcouncil.com", source: "Sample data" },
  ],
  OH: [
    { id: "oh-gov", name: "Mike DeWine", office: "Governor", party: "Republican", district: "Ohio", level: "state", phone: "(614) 644-4357", website: "https://governor.ohio.gov", source: "Sample data" },
    { id: "oh-ltgov", name: "Jon Husted", office: "Lt. Governor", party: "Republican", district: "Ohio", level: "state", phone: "(614) 644-4357", website: "https://governor.ohio.gov/lieutenant-governor", source: "Sample data" },
    { id: "oh-s1", name: "Hearcel Craig", office: "State Senator", party: "Democrat", district: "15th Senate District", level: "state", phone: "(614) 466-5131", website: "https://ohiosenate.gov", source: "Sample data" },
    { id: "oh-s2", name: "Matt Huffman", office: "State Senator (President)", party: "Republican", district: "12th Senate District", level: "state", phone: "(419) 222-7949", website: "https://ohiosenate.gov", source: "Sample data" },
    { id: "oh-a1", name: "Bride Rose Sweeney", office: "State Representative", party: "Democrat", district: "14th House District", level: "state", phone: "(614) 466-1366", website: "https://ohiohouse.gov", source: "Sample data" },
    { id: "oh-a2", name: "Derek Merrin", office: "State Representative", party: "Republican", district: "47th House District", level: "state", phone: "(614) 644-6027", website: "https://ohiohouse.gov", source: "Sample data" },
    { id: "oh-c1", name: "Elliot Kolby", office: "County Commissioner", party: "Democrat", district: "Cuyahoga County", level: "county", phone: "(216) 443-7200", website: "https://cuyahogacounty.us", source: "Sample data" },
    { id: "oh-ci1", name: "Justin Bibb", office: "Mayor", party: "Democrat", district: "Cleveland", level: "city", phone: "(216) 664-2000", website: "https://clevelandohio.gov", source: "Sample data" },
  ],
  GA: [
    { id: "ga-gov", name: "Brian Kemp", office: "Governor", party: "Republican", district: "Georgia", level: "state", phone: "(404) 656-1776", website: "https://gov.georgia.gov", source: "Sample data" },
    { id: "ga-ltgov", name: "Burt Jones", office: "Lt. Governor", party: "Republican", district: "Georgia", level: "state", phone: "(404) 656-5030", website: "https://ltgov.georgia.gov", source: "Sample data" },
    { id: "ga-s1", name: "Elena Parent", office: "State Senator", party: "Democrat", district: "42nd Senate District", level: "state", phone: "(404) 463-1383", website: "https://senate.georgia.gov", source: "Sample data" },
    { id: "ga-s2", name: "Butch Miller", office: "State Senator", party: "Republican", district: "49th Senate District", level: "state", phone: "(770) 532-7717", website: "https://senate.georgia.gov", source: "Sample data" },
    { id: "ga-a1", name: "Park Cannon", office: "State Representative", party: "Democrat", district: "58th House District", level: "state", phone: "(404) 656-0220", website: "https://house.georgia.gov", source: "Sample data" },
    { id: "ga-a2", name: "Brett Harrell", office: "State Representative", party: "Republican", district: "106th House District", level: "state", phone: "(404) 656-0213", website: "https://house.georgia.gov", source: "Sample data" },
    { id: "ga-c1", name: "Robb Pitts", office: "County Commission Chair", party: "Democrat", district: "Fulton County", level: "county", phone: "(404) 612-8200", website: "https://fultoncountyga.gov", source: "Sample data" },
    { id: "ga-ci1", name: "Andre Dickens", office: "Mayor", party: "Democrat", district: "Atlanta", level: "city", phone: "(404) 330-6100", website: "https://atlantaga.gov", source: "Sample data" },
  ],
  AZ: [
    { id: "az-gov", name: "Katie Hobbs", office: "Governor", party: "Democrat", district: "Arizona", level: "state", phone: "(602) 542-4331", website: "https://azgovernor.gov", source: "Sample data" },
    { id: "az-sos", name: "Adrian Fontes", office: "Secretary of State", party: "Democrat", district: "Arizona", level: "state", phone: "(602) 542-4285", website: "https://azsos.gov", source: "Sample data" },
    { id: "az-s1", name: "Mitzi Epstein", office: "State Senator", party: "Democrat", district: "12th Senate District", level: "state", phone: "(602) 926-5487", website: "https://azleg.gov", source: "Sample data" },
    { id: "az-s2", name: "Sonny Borrelli", office: "State Senator", party: "Republican", district: "30th Senate District", level: "state", phone: "(602) 926-5051", website: "https://azleg.gov", source: "Sample data" },
    { id: "az-a1", name: "Analise Ortiz", office: "State Representative", party: "Democrat", district: "22nd House District", level: "state", phone: "(602) 926-5288", website: "https://azleg.gov", source: "Sample data" },
    { id: "az-a2", name: "David Cook", office: "State Representative", party: "Republican", district: "7th House District", level: "state", phone: "(602) 926-4916", website: "https://azleg.gov", source: "Sample data" },
    { id: "az-c1", name: "Tom Galvin", office: "County Supervisor", party: "Republican", district: "District 3 — Maricopa County", level: "county", phone: "(602) 506-3415", website: "https://maricopa.gov", source: "Sample data" },
    { id: "az-ci1", name: "Kate Gallego", office: "Mayor", party: "Democrat", district: "Phoenix", level: "city", phone: "(602) 262-7111", website: "https://phoenix.gov", source: "Sample data" },
  ],
  CO: [
    { id: "co-gov", name: "Jared Polis", office: "Governor", party: "Democrat", district: "Colorado", level: "state", phone: "(303) 866-2471", website: "https://colorado.gov/governor", source: "Sample data" },
    { id: "co-ltgov", name: "Dianne Primavera", office: "Lt. Governor", party: "Democrat", district: "Colorado", level: "state", phone: "(303) 866-2087", website: "https://colorado.gov/ltgovernor", source: "Sample data" },
    { id: "co-s1", name: "James Coleman", office: "State Senator", party: "Democrat", district: "33rd Senate District", level: "state", phone: "(303) 866-4880", website: "https://leg.colorado.gov", source: "Sample data" },
    { id: "co-s2", name: "Bob Gardner", office: "State Senator", party: "Republican", district: "12th Senate District", level: "state", phone: "(719) 444-0884", website: "https://leg.colorado.gov", source: "Sample data" },
    { id: "co-a1", name: "Serena Gonzales-Gutierrez", office: "State Representative", party: "Democrat", district: "4th House District", level: "state", phone: "(303) 866-2967", website: "https://leg.colorado.gov", source: "Sample data" },
    { id: "co-a2", name: "Rod Bockenfeld", office: "State Representative", party: "Republican", district: "56th House District", level: "state", phone: "(303) 866-2191", website: "https://leg.colorado.gov", source: "Sample data" },
    { id: "co-c1", name: "Amanda Sawyer", office: "County Commissioner", party: "Nonpartisan", district: "Denver County", level: "county", phone: "(720) 913-8000", website: "https://denvergov.org", source: "Sample data" },
    { id: "co-ci1", name: "Mike Johnston", office: "Mayor", party: "Democrat", district: "Denver", level: "city", phone: "(720) 865-9000", website: "https://denvergov.org", source: "Sample data" },
  ],
  WA: [
    { id: "wa-gov", name: "Bob Ferguson", office: "Governor", party: "Democrat", district: "Washington", level: "state", phone: "(360) 902-4111", website: "https://governor.wa.gov", source: "Sample data" },
    { id: "wa-ltgov", name: "Denny Heck", office: "Lt. Governor", party: "Democrat", district: "Washington", level: "state", phone: "(360) 786-7700", website: "https://ltgov.wa.gov", source: "Sample data" },
    { id: "wa-s1", name: "Patty Kuderer", office: "State Senator", party: "Democrat", district: "48th Senate District", level: "state", phone: "(425) 453-4609", website: "https://leg.wa.gov", source: "Sample data" },
    { id: "wa-s2", name: "Keith Wagoner", office: "State Senator", party: "Republican", district: "39th Senate District", level: "state", phone: "(360) 786-7676", website: "https://leg.wa.gov", source: "Sample data" },
    { id: "wa-a1", name: "Mia Gregerson", office: "State Representative", party: "Democrat", district: "33rd House District", level: "state", phone: "(360) 786-7838", website: "https://leg.wa.gov", source: "Sample data" },
    { id: "wa-a2", name: "Jim Walsh", office: "State Representative", party: "Republican", district: "19th House District", level: "state", phone: "(360) 786-7806", website: "https://leg.wa.gov", source: "Sample data" },
    { id: "wa-c1", name: "Claudia Balducci", office: "County Council Member", party: "Democrat", district: "District 6 — King County", level: "county", phone: "(206) 477-1006", website: "https://kingcounty.gov", source: "Sample data" },
    { id: "wa-ci1", name: "Bruce Harrell", office: "Mayor", party: "Democrat", district: "Seattle", level: "city", phone: "(206) 684-4000", website: "https://seattle.gov", source: "Sample data" },
  ],
  MI: [
    { id: "mi-gov", name: "Gretchen Whitmer", office: "Governor", party: "Democrat", district: "Michigan", level: "state", phone: "(517) 335-7858", website: "https://michigan.gov/whitmer", source: "Sample data" },
    { id: "mi-ltgov", name: "Garlin Gilchrist II", office: "Lt. Governor", party: "Democrat", district: "Michigan", level: "state", phone: "(517) 335-7858", website: "https://michigan.gov/ltgov", source: "Sample data" },
    { id: "mi-s1", name: "Mallory McMorrow", office: "State Senator", party: "Democrat", district: "13th Senate District", level: "state", phone: "(517) 373-2523", website: "https://senate.michigan.gov", source: "Sample data" },
    { id: "mi-s2", name: "Ed McBroom", office: "State Senator", party: "Republican", district: "4th Senate District", level: "state", phone: "(906) 225-0490", website: "https://senate.michigan.gov", source: "Sample data" },
    { id: "mi-a1", name: "Erin Byrnes", office: "State Representative", party: "Democrat", district: "6th House District", level: "state", phone: "(517) 373-7557", website: "https://house.michigan.gov", source: "Sample data" },
    { id: "mi-a2", name: "Andrew Beeler", office: "State Representative", party: "Republican", district: "83rd House District", level: "state", phone: "(517) 373-0836", website: "https://house.michigan.gov", source: "Sample data" },
    { id: "mi-c1", name: "Melissa Daub", office: "County Commissioner", party: "Democrat", district: "Wayne County", level: "county", phone: "(313) 224-5840", website: "https://waynecounty.com", source: "Sample data" },
    { id: "mi-ci1", name: "Mike Duggan", office: "Mayor", party: "Democrat", district: "Detroit", level: "city", phone: "(313) 224-3400", website: "https://detroitmi.gov", source: "Sample data" },
  ],
  VA: [
    { id: "va-gov", name: "Glenn Youngkin", office: "Governor", party: "Republican", district: "Virginia", level: "state", phone: "(804) 786-2211", website: "https://governor.virginia.gov", source: "Sample data" },
    { id: "va-ltgov", name: "Winsome Earle-Sears", office: "Lt. Governor", party: "Republican", district: "Virginia", level: "state", phone: "(804) 786-2078", website: "https://ltgov.virginia.gov", source: "Sample data" },
    { id: "va-s1", name: "Jennifer Boysko", office: "State Senator", party: "Democrat", district: "33rd Senate District", level: "state", phone: "(703) 437-5252", website: "https://virginiageneralassembly.gov", source: "Sample data" },
    { id: "va-s2", name: "Mark Obenshain", office: "State Senator", party: "Republican", district: "26th Senate District", level: "state", phone: "(540) 432-1817", website: "https://virginiageneralassembly.gov", source: "Sample data" },
    { id: "va-a1", name: "Rip Sullivan", office: "Delegate", party: "Democrat", district: "48th House District", level: "state", phone: "(571) 507-7110", website: "https://virginiageneralassembly.gov", source: "Sample data" },
    { id: "va-a2", name: "Nick Freitas", office: "Delegate", party: "Republican", district: "30th House District", level: "state", phone: "(540) 752-6097", website: "https://virginiageneralassembly.gov", source: "Sample data" },
    { id: "va-c1", name: "Phyllis Randall", office: "Board of Supervisors Chair", party: "Democrat", district: "Loudoun County", level: "county", phone: "(703) 777-0204", website: "https://loudoun.gov", source: "Sample data" },
    { id: "va-ci1", name: "Amy Brecount", office: "City Council Member", party: "Democrat", district: "At-Large — Arlington", level: "city", phone: "(703) 228-3130", website: "https://arlingtonva.us", source: "Sample data" },
  ],
  NC: [
    { id: "nc-gov", name: "Josh Stein", office: "Governor", party: "Democrat", district: "North Carolina", level: "state", phone: "(919) 814-2000", website: "https://governor.nc.gov", source: "Sample data" },
    { id: "nc-ltgov", name: "Rachel Hunt", office: "Lt. Governor", party: "Democrat", district: "North Carolina", level: "state", phone: "(919) 814-3680", website: "https://ltgov.nc.gov", source: "Sample data" },
    { id: "nc-s1", name: "Natasha Marcus", office: "State Senator", party: "Democrat", district: "41st Senate District", level: "state", phone: "(919) 733-5650", website: "https://ncleg.gov", source: "Sample data" },
    { id: "nc-s2", name: "Phil Berger", office: "State Senator (President Pro Tem)", party: "Republican", district: "30th Senate District", level: "state", phone: "(336) 342-5038", website: "https://ncleg.gov", source: "Sample data" },
    { id: "nc-a1", name: "Terry Brown Jr.", office: "State Representative", party: "Democrat", district: "92nd House District", level: "state", phone: "(919) 733-5827", website: "https://ncleg.gov", source: "Sample data" },
    { id: "nc-a2", name: "Jason Saine", office: "State Representative", party: "Republican", district: "97th House District", level: "state", phone: "(704) 942-3232", website: "https://ncleg.gov", source: "Sample data" },
    { id: "nc-c1", name: "Laura Meier", office: "County Commissioner", party: "Democrat", district: "Wake County", level: "county", phone: "(919) 856-6160", website: "https://wakegov.com", source: "Sample data" },
    { id: "nc-ci1", name: "Vi Lyles", office: "Mayor", party: "Democrat", district: "Charlotte", level: "city", phone: "(704) 336-2241", website: "https://charlottenc.gov", source: "Sample data" },
  ],
  NJ: [
    { id: "nj-gov", name: "Phil Murphy", office: "Governor", party: "Democrat", district: "New Jersey", level: "state", phone: "(609) 292-6000", website: "https://nj.gov/governor", source: "Sample data" },
    { id: "nj-ltgov", name: "Tahesha Way", office: "Lt. Governor", party: "Democrat", district: "New Jersey", level: "state", phone: "(609) 292-6000", website: "https://nj.gov/governor/lt", source: "Sample data" },
    { id: "nj-s1", name: "Vin Gopal", office: "State Senator", party: "Democrat", district: "11th Senate District", level: "state", phone: "(732) 695-3371", website: "https://njleg.state.nj.us", source: "Sample data" },
    { id: "nj-s2", name: "Mike Testa", office: "State Senator", party: "Republican", district: "1st Senate District", level: "state", phone: "(856) 327-1137", website: "https://njleg.state.nj.us", source: "Sample data" },
    { id: "nj-a1", name: "Shama Haider", office: "State Assemblymember", party: "Democrat", district: "37th Assembly District", level: "state", phone: "(201) 569-7560", website: "https://njleg.state.nj.us", source: "Sample data" },
    { id: "nj-a2", name: "Erik Peterson", office: "State Assemblymember", party: "Republican", district: "23rd Assembly District", level: "state", phone: "(908) 526-0500", website: "https://njleg.state.nj.us", source: "Sample data" },
    { id: "nj-c1", name: "Craig Coughlin", office: "Freeholder", party: "Democrat", district: "Middlesex County", level: "county", phone: "(732) 745-3000", website: "https://co.middlesex.nj.us", source: "Sample data" },
    { id: "nj-ci1", name: "Ras Baraka", office: "Mayor", party: "Democrat", district: "Newark", level: "city", phone: "(973) 733-6400", website: "https://ci.newark.nj.us", source: "Sample data" },
  ],
  OR: [
    { id: "or-gov", name: "Tina Kotek", office: "Governor", party: "Democrat", district: "Oregon", level: "state", phone: "(503) 378-4582", website: "https://oregon.gov/gov", source: "Sample data" },
    { id: "or-sos", name: "Tobias Read", office: "Secretary of State", party: "Democrat", district: "Oregon", level: "state", phone: "(503) 986-1523", website: "https://sos.oregon.gov", source: "Sample data" },
    { id: "or-s1", name: "Elizabeth Steiner", office: "State Senator", party: "Democrat", district: "1st Senate District", level: "state", phone: "(503) 986-1701", website: "https://oregonlegislature.gov", source: "Sample data" },
    { id: "or-s2", name: "Tim Knopp", office: "State Senator", party: "Republican", district: "27th Senate District", level: "state", phone: "(541) 318-1831", website: "https://oregonlegislature.gov", source: "Sample data" },
    { id: "or-a1", name: "Maxine Dexter", office: "State Representative", party: "Democrat", district: "33rd House District", level: "state", phone: "(503) 986-1433", website: "https://oregonlegislature.gov", source: "Sample data" },
    { id: "or-a2", name: "Vikki Breese-Iverson", office: "State Representative", party: "Republican", district: "55th House District", level: "state", phone: "(541) 475-3775", website: "https://oregonlegislature.gov", source: "Sample data" },
    { id: "or-c1", name: "Sharon Meieran", office: "County Commissioner", party: "Democrat", district: "Multnomah County", level: "county", phone: "(503) 988-5220", website: "https://multco.us", source: "Sample data" },
    { id: "or-ci1", name: "Ted Wheeler", office: "Mayor", party: "Democrat", district: "Portland", level: "city", phone: "(503) 823-4120", website: "https://portland.gov", source: "Sample data" },
  ],
  MN: [
    { id: "mn-gov", name: "Tim Walz", office: "Governor", party: "Democrat", district: "Minnesota", level: "state", phone: "(651) 201-3400", website: "https://mn.gov/governor", source: "Sample data" },
    { id: "mn-ltgov", name: "Peggy Flanagan", office: "Lt. Governor", party: "Democrat", district: "Minnesota", level: "state", phone: "(651) 201-3400", website: "https://mn.gov/governor/about/lt-governor", source: "Sample data" },
    { id: "mn-s1", name: "Sandy Pappas", office: "State Senator", party: "Democrat", district: "65th Senate District", level: "state", phone: "(651) 296-1282", website: "https://senate.mn", source: "Sample data" },
    { id: "mn-s2", name: "Mark Johnson", office: "State Senator", party: "Republican", district: "1st Senate District", level: "state", phone: "(218) 386-1085", website: "https://senate.mn", source: "Sample data" },
    { id: "mn-a1", name: "Aisha Gomez", office: "State Representative", party: "Democrat", district: "62B House District", level: "state", phone: "(651) 296-9281", website: "https://house.mn", source: "Sample data" },
    { id: "mn-a2", name: "Pam Novotny", office: "State Representative", party: "Republican", district: "1A House District", level: "state", phone: "(218) 253-3219", website: "https://house.mn", source: "Sample data" },
    { id: "mn-c1", name: "Jan Callison", office: "County Commissioner", party: "Nonpartisan", district: "Hennepin County", level: "county", phone: "(612) 348-7883", website: "https://hennepin.us", source: "Sample data" },
    { id: "mn-ci1", name: "Jacob Frey", office: "Mayor", party: "Democrat", district: "Minneapolis", level: "city", phone: "(612) 673-2100", website: "https://minneapolismn.gov", source: "Sample data" },
  ],
};

// Generic fallback for states not in the lookup above
const GENERIC_STATE_REPS: Representative[] = [
  { id: "gen-gov", name: "Governor", office: "Governor", party: "Unknown", district: "Statewide", level: "state", source: "Sample data" },
  { id: "gen-ltgov", name: "Lt. Governor", office: "Lt. Governor", party: "Unknown", district: "Statewide", level: "state", source: "Sample data" },
  { id: "gen-s1", name: "State Senator (District 1)", office: "State Senator", party: "Democrat", district: "1st Senate District", level: "state", source: "Sample data" },
  { id: "gen-s2", name: "State Senator (District 2)", office: "State Senator", party: "Republican", district: "2nd Senate District", level: "state", source: "Sample data" },
  { id: "gen-a1", name: "State Representative", office: "State Representative", party: "Democrat", district: "House District 10", level: "state", source: "Sample data" },
  { id: "gen-c1", name: "County Commissioner", office: "County Commissioner", party: "Nonpartisan", district: "County District 1", level: "county", source: "Sample data" },
  { id: "gen-ci1", name: "City Council Member", office: "City Council Member", party: "Nonpartisan", district: "Ward 1", level: "city", source: "Sample data" },
];

function getStateMockReps(state: string): Representative[] {
  return STATE_MOCK_REPS[state.toUpperCase()] ?? GENERIC_STATE_REPS;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns all representatives for the given address.
 * Strategy:
 *   1. Try Google Civic Information API (returns all levels in one call)
 *   2. On failure, fetch federal reps from Congress.gov (live) +
 *      state/county/city reps from the rich per-state mock dataset.
 */
export async function getRepresentatives(addr: {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}): Promise<Representative[]> {
  // Attempt 1 — Google Civic (if key present and address is complete enough)
  if (CIVIC_API_KEY) {
    const query = buildAddressQuery(addr);
    if (query) {
      try {
        const url = `${BASE_URL}?key=${CIVIC_API_KEY}&address=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as CivicResponse;
          const mapped = mapCivicResponse(data);
          if (mapped.length > 0) return mapped;
        }
      } catch {
        // fall through to hybrid
      }
    }
  }

  // Attempt 2 — Hybrid: Congress.gov (federal) + per-state mock (state/county/city)
  return fetchHybridReps(addr.state);
}

async function fetchHybridReps(state: string): Promise<Representative[]> {
  let federalReps: Representative[] = [];

  try {
    federalReps = await getMembers(state);
  } catch {
    // If Congress.gov also fails, fall through with empty federal list
  }

  const stateLocalReps = getStateMockReps(state);
  return [...federalReps, ...stateLocalReps];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildAddressQuery(addr: {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}): string {
  const parts = [addr.address, addr.city, addr.state, addr.zipCode].filter(Boolean);
  return parts.join(", ");
}

function mapLevel(levels?: string[]): Representative["level"] {
  if (!levels || levels.length === 0) return "city";
  const l = levels[0];
  if (l === "country") return "federal";
  if (l === "administrativeArea1") return "state";
  if (l === "administrativeArea2") return "county";
  return "city";
}

function normaliseParty(raw?: string): string {
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("democrat")) return "Democrat";
  if (lower.includes("republican")) return "Republican";
  if (lower.includes("libertarian")) return "Libertarian";
  if (lower.includes("independent")) return "Independent";
  if (lower.includes("green")) return "Green";
  if (lower.includes("nonpartisan") || lower.includes("non-partisan")) return "Nonpartisan";
  return raw;
}

function extractDistrict(divisionId: string, officeName: string): string {
  const cdMatch = divisionId.match(/\/cd:(\d+)/);
  if (cdMatch) return `District ${cdMatch[1]}`;
  const slduMatch = divisionId.match(/\/sldu:(.+)$/);
  if (slduMatch) return `State Senate District ${slduMatch[1]}`;
  const sldlMatch = divisionId.match(/\/sldl:(.+)$/);
  if (sldlMatch) return `State Assembly District ${sldlMatch[1]}`;
  const countyMatch = divisionId.match(/\/county:(.+)$/);
  if (countyMatch) return formatSegment(countyMatch[1]) + " County";
  const placeMatch = divisionId.match(/\/place:(.+)$/);
  if (placeMatch) return formatSegment(placeMatch[1]);
  return officeName;
}

function formatSegment(segment: string): string {
  return segment.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapCivicResponse(data: CivicResponse): Representative[] {
  const offices = data.offices ?? [];
  const officials = data.officials ?? [];
  const reps: Representative[] = [];

  for (const office of offices) {
    const level = mapLevel(office.levels);
    const district = extractDistrict(office.divisionId, office.name);

    for (const idx of office.officialIndices) {
      const official = officials[idx];
      if (!official) continue;

      const twitter = official.channels?.find((c) => c.type === "Twitter")?.id;
      const facebook = official.channels?.find((c) => c.type === "Facebook")?.id;

      reps.push({
        id: `civic-${office.divisionId}-${idx}`,
        name: official.name,
        office: office.name,
        party: normaliseParty(official.party),
        district,
        level,
        phone: official.phones?.[0],
        email: official.emails?.[0],
        website: official.urls?.[0],
        imageUrl: official.photoUrl,
        twitter: twitter ? `@${twitter.replace(/^@/, "")}` : undefined,
        facebook,
        source: "Google Civic Information API",
      });
    }
  }

  return reps;
}
