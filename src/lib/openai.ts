import OpenAI from "openai";
import type { Intent } from "./types";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for demo purposes
});

export async function parseCommandWithGPT(text: string): Promise<Intent[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a robot command parser. Convert natural language commands (Korean/English) into structured robot intents.

Available objects in scene:
- "red box" (빨간 상자, 빨간색, red, 빨강)
- "blue ball" (파란 공, 파란색, blue, 파랑)
- "green cylinder" (초록 실린더, 초록색, green, 초록)

Available commands:
- pick <object>: Pick up object by name or color (빨간색, 초록색 = just color name)
- drop: Drop held object (내려놓다, 내리다)
- wave [side]: Wave arm
- reset: Return to default pose

IMPORTANT:
1. For MULTIPLE actions (A하고 B해, A then B), return ARRAY with multiple intents in sequence
2. When user says only color (빨간색, 초록색), use objectName with just the color
3. Sequential commands like "빨간색 내리고 초록색 주워" = drop THEN pick

Respond ONLY with valid JSON ARRAY:
[
  {
    "type": "pick" | "drop" | "wave" | "reset" | "pose" | "unknown",
    "objectName"?: string (for pick - can be "red", "green", "blue", "red box", etc.),
    "side"?: "left" | "right" (for wave),
    "text": "original input"
  }
]

Examples:
- "초록색 주워" -> [{"type":"pick","objectName":"green","text":"초록색 주워"}]
- "빨간색 집어" -> [{"type":"pick","objectName":"red","text":"빨간색 집어"}]
- "pick up the red box" -> [{"type":"pick","objectName":"red box","text":"pick up the red box"}]
- "파란 공 주워" -> [{"type":"pick","objectName":"blue ball","text":"파란 공 주워"}]
- "내려놓아" -> [{"type":"drop","text":"내려놓아"}]
- "drop" -> [{"type":"drop","text":"drop"}]
- "빨간색 내리고 초록색 주워" -> [{"type":"drop","text":"빨간색 내리고 초록색 주워"},{"type":"pick","objectName":"green","text":"빨간색 내리고 초록색 주워"}]
- "빨간색 내려놓고 파란색 들어" -> [{"type":"drop","text":"..."},{"type":"pick","objectName":"blue","text":"..."}]
- "wave right" -> [{"type":"wave","side":"right","text":"wave right"}]`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return [{ type: "unknown", text }];
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    // Ensure it's an array
    const intents = Array.isArray(parsed) ? parsed : [parsed];
    return intents.map(intent => ({ ...intent, text }));
  } catch (error) {
    console.error("GPT parsing error:", error);
    return [{ type: "unknown", text }];
  }
}
