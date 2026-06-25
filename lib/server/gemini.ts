import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "./env";
import { z } from "zod";

let aiInstance: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY || "dummy_key_for_build" });
  }
  return aiInstance;
}

export async function generateValidatedJson<T>(
  prompt: string,
  zodSchema: z.ZodType<T>,
  systemInstruction?: string,
  model = "gemini-2.5-flash"
): Promise<T> {
  const config: any = {
    responseMimeType: "application/json",
  };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  const result = await getAiClient().models.generateContent({
    model: serverEnv.GEMINI_MODEL || model,
    contents: prompt,
    config,
  });

  const text = result.text || "";
  try {
    const parsed = JSON.parse(text);
    return zodSchema.parse(parsed);
  } catch (error) {
    console.error("Gemini JSON parse or validation failed:", error);
    console.log("Raw output:", text);
    // basic retry
    const retryPrompt = `${prompt}\n\nPrevious response failed validation. Please ensure STRICT JSON matching the exact schema. Return ONLY valid JSON, without any markdown formatting.\nError: ${error instanceof Error ? error.message : String(error)}`;
    
    const retryResult = await getAiClient().models.generateContent({
      model: serverEnv.GEMINI_MODEL || model,
      contents: retryPrompt,
      config,
    });
    
    const retryText = retryResult.text || "";
    try {
      const retryParsed = JSON.parse(retryText);
      return zodSchema.parse(retryParsed);
    } catch (retryError) {
      console.error("Retry failed:", retryError);
      throw retryError;
    }
  }
}
