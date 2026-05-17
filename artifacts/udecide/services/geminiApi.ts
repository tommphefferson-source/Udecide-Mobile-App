import { GEMINI_SYSTEM_PROMPT } from "@/utils/constants";
import { fetch } from "expo/fetch";

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

export interface GeminiMessage {
  role: "user" | "model";
  content: string;
}

export interface GeminiResponse {
  text: string;
  error?: string;
}

export async function sendGeminiMessage(
  messages: GeminiMessage[],
  onChunk?: (chunk: string) => void
): Promise<GeminiResponse> {
  if (!API_KEY) {
    const mockResponse = generateMockResponse(messages[messages.length - 1]?.content ?? "");
    if (onChunk) {
      for (const word of mockResponse.split(" ")) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        onChunk(word + " ");
      }
    }
    return { text: mockResponse };
  }

  try {
    const contents = [
      {
        role: "user",
        parts: [{ text: GEMINI_SYSTEM_PROMPT }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I will provide neutral, factual political information as requested." }],
      },
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
    ];

    const res = await fetch(BASE_URL + `?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (onChunk) onChunk(text);
    return { text };
  } catch (err) {
    console.error("[Gemini]", err);
    return {
      text: "",
      error: "Unable to reach the AI service. Please check your API key or try again later.",
    };
  }
}

function generateMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("electoral college")) {
    return "The Electoral College is the formal body that elects the President and Vice President. Each state receives electoral votes equal to its Congressional representation (House seats + 2 Senate seats), totaling 538 votes. A candidate needs 270 to win. In most states, the winner of the popular vote receives all electoral votes (winner-take-all). Maine and Nebraska use a proportional system by congressional district.\n\nSources: U.S. Constitution, Article II; 23rd Amendment\nDate Checked: " + new Date().toLocaleDateString();
  }
  if (lower.includes("fact check") || lower.includes("claim") || lower.includes("true") || lower.includes("false")) {
    return "To fact-check a political claim, I need you to share the specific statement or claim you'd like me to evaluate.\n\nI will assess it using publicly available, nonpartisan sources and provide:\n• Claim summary\n• Verification status\n• Neutral explanation\n• Sources referenced\n• Date checked\n\nPlease share the specific claim you'd like me to review. Note: I do not have real-time internet access. For current events, please also consult fact-checking organizations like PolitiFact, FactCheck.org, or Snopes.";
  }
  if (lower.includes("bill") || lower.includes("legislation") || lower.includes("law")) {
    return "To summarize legislation in plain language, please provide the bill number or name (e.g., 'H.R. 1234' or 'Inflation Reduction Act').\n\nFor any bill, I can help you understand:\n• What the bill proposes to do\n• Who sponsored it\n• What the key provisions are\n• Its current status in Congress\n• Nonpartisan analysis of potential effects\n\nNote: For real-time bill status and full text, visit Congress.gov or your state legislature's official website.";
  }
  if (lower.includes("representative") || lower.includes("senator") || lower.includes("voting record")) {
    return "To look up a representative's voting record, I recommend:\n\n1. Congress.gov — Official record of all House and Senate votes\n2. GovTrack.us — Voting records with nonpartisan analysis\n3. VoteSmart.org — Comprehensive voting records and positions\n\nVoting records are public information and can be searched by representative's name, bill title, or vote date. I can help you interpret what a particular vote means or explain the legislation involved.";
  }

  return "Thank you for your question about U.S. politics and government. I'm UDecide's nonpartisan fact-checking assistant.\n\nI can help you:\n• Understand government processes and how laws are made\n• Summarize legislation in plain language\n• Explain political terms and concepts\n• Look up voting records and representative information\n• Fact-check political claims against public sources\n\nPlease note: I remain strictly neutral and do not endorse any candidate, party, or policy. For the most current information, always verify with official government sources.\n\nWhat would you like to know?";
}
