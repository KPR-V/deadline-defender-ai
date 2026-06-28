import { generateValidatedJson } from "../server/gemini";
import { ProcrastinationStats } from "../behavior/statsEngine";
import { z } from "zod";

export async function generateProcrastinationInsights(
  stats: ProcrastinationStats,
): Promise<string[]> {
  try {
    const prompt = `
You are a behavior analyst AI helping a user understand their procrastination patterns.
Based on the following statistics, generate 3-4 short, punchy, friendly insights about their behavior.
Make it sound encouraging but direct. Use bullet points. Each bullet should be 1 sentence.

Data:
- Reminder Response Rate: ${Math.round(stats.reminderResponseRate || 0)}%
- Focus Block Completion Rate: ${Math.round(stats.focusBlockCompletionRate || 0)}%
- Rescue Success Rate: ${Math.round(stats.rescueSuccessRate || 0)}%
- Completion Time of Day: Morning (${stats.completionTimeOfDay?.morning ?? 0}), Afternoon (${stats.completionTimeOfDay?.afternoon ?? 0}), Evening (${stats.completionTimeOfDay?.evening ?? 0}), Night (${stats.completionTimeOfDay?.night ?? 0})
- Most delayed category counts: ${JSON.stringify(stats.categoryDelays || {})}

Example insights:
- "You usually complete tasks at night, meaning you might be a night owl."
- "You ignored 4 morning reminders this week, maybe you're not a morning person."
- "Your rescue success rate is 67%, you do well under extreme pressure!"
    `;

    const parsed = await generateValidatedJson(prompt, z.array(z.string()), "Return ONLY a JSON array of strings.");
    return parsed;
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return ["We need more data to generate insights for you."];
  }
}
