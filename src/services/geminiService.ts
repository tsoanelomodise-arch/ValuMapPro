import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in the environment.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export interface AISubstation {
  name: string;
  address: string;
  coordinates: [number, number];
  description?: string;
  voltageKV?: number;
  mvaCapacity?: number;
}

export async function searchSubstations(area: string): Promise<AISubstation[]> {
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `SEARCH TASK: Find ACTUAL electrical substations in or near ${area}, South Africa.
      
      1. Use Google Search to find current Eskom and municipal substation names.
      2. Identify at least 3-5 major substations if possible.
      3. For each substation, provide:
         - Official Name
         - Approximate Address or Location
         - PRECISE GPS Coordinates as [Latitude, Longitude] (Strictly decimal format, e.g., [-26.123, 28.456])
         - Operating Voltage in kV (e.g., 11, 88, 132, 275, 400)
         - Rated Capacity in MVA
         - A brief technical description
      
      Output ONLY valid JSON according to the schema.`,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            substations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  coordinates: { 
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Array of [latitude, longitude]"
                  },
                  voltageKV: { type: Type.NUMBER },
                  mvaCapacity: { type: Type.NUMBER },
                  description: { type: Type.STRING }
                },
                required: ["name", "address", "coordinates"]
              }
            }
          },
          required: ["substations"]
        }
      }
    });

    const text = response.text;
    return JSON.parse(text || '{"substations": []}').substations || [];
  } catch (error) {
    console.error("Error searching substations with AI:", error);
    return [];
  }
}
