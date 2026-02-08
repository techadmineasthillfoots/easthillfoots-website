
import { GoogleGenAI, Type } from "@google/genai";

// Cache keys
const CACHE_KEY = 'church_inspiration_cache';
const CACHE_DATE_KEY = 'church_inspiration_date';

export const getDailyInspiration = async () => {
  const today = new Date().toDateString();
  const cachedDate = localStorage.getItem(CACHE_DATE_KEY);
  const cachedData = localStorage.getItem(CACHE_KEY);

  // Return cached data if it exists and is from today
  if (cachedDate === today && cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.error("Error parsing cached inspiration", e);
    }
  }

  try {
    // Fix: Initialize GoogleGenAI using process.env.API_KEY directly as per strict SDK guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Provide a unique, uplifting inspirational message (2-3 sentences) that addresses common daily struggles like stress, anxiety, grief, loneliness, or doubt. The tone should be compassionate and grounded. Support this message with a relevant Bible reference and the text of the verse itself. Return as JSON with keys: "message", "reference", "verseText".',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "The core inspirational message addressing common struggles" },
            reference: { type: Type.STRING, description: "The Bible reference (e.g., Matthew 11:28)" },
            verseText: { type: Type.STRING, description: "The actual text of the referenced verse" }
          },
          required: ["message", "reference", "verseText"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const parsed = JSON.parse(text);
    
    // Save to cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
    localStorage.setItem(CACHE_DATE_KEY, today);
    
    return parsed;
  } catch (error: any) {
    // Stringify error to check for specific status codes if message is missing
    const errorString = JSON.stringify(error) || error?.message || "";
    console.error("Error fetching inspiration:", error);
    
    // High quality fallback
    const fallback = {
      message: "When the weight of the world feels heavy, remember that you don't have to carry it alone. Strength often comes in the quiet moments of turning your worries over to a higher peace.",
      reference: "Matthew 11:28",
      verseText: "Come to me, all you who are weary and burdened, and I will give you rest."
    };

    // If it's a quota error (429) or resource exhausted, cache the fallback for today 
    // to stop hitting the API and annoying the user with repeated log errors.
    if (
      errorString.includes('429') || 
      errorString.includes('RESOURCE_EXHAUSTED') || 
      error?.status === 429
    ) {
      console.warn("Gemini API Quota Exceeded. Caching fallback message for today to prevent further requests.");
      localStorage.setItem(CACHE_KEY, JSON.stringify(fallback));
      localStorage.setItem(CACHE_DATE_KEY, today);
    }

    return fallback;
  }
};

export const refineMissionStatement = async (current: string) => {
  try {
    // Fix: Initialize GoogleGenAI using process.env.API_KEY directly as per strict SDK guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Current mission statement: "${current}". Please refine this to be more professional, welcoming, and focused on the unity of Dollar and Muckhart churches. Keep it concise.`,
    });
    return response.text || current;
  } catch (error) {
    console.error("Error refining mission:", error);
    return current;
  }
};
