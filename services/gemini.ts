import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

// Initialize ONLY if API key exists to prevent crashing
if (process.env.API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const askSafetyAssistant = async (query: string): Promise<string> => {
  if (!genAI) {
    return "I'm sorry, I cannot access the safety database right now. Please check your network or API configuration.";
  }

  try {
    const model = "gemini-2.5-flash";
    const prompt = `You are CrowdGuard AI, a safety assistant. Provide a concise, helpful, and calm answer to the following safety-related question or situation: "${query}". Keep it under 100 words. Prioritize immediate safety actions.`;

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "I couldn't process that request. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting. Please try again later.";
  }
};
