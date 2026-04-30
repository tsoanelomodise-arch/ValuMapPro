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
      contents: `Find real-world Eskom electrical substations located in or around the area: ${area}. 
      Return a list of substations with their names, approximate physical addresses, and precise GPS coordinates (Latitude, Longitude).
      MAKE A SPECIAL EFFORT to find the Operating Voltage (in kV) and Rated Capacity (in MVA) for each.
      Focus on major distribution and transmission substations.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            substations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the substation (e.g. 'Rosebank Substation')" },
                  address: { type: Type.STRING, description: "Approximate physical address or nearby landmark" },
                  coordinates: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Array of exactly two numbers: [latitude, longitude]"
                  },
                  description: { type: Type.STRING, description: "Brief description of the substation's capacity or role" },
                  voltageKV: { type: Type.NUMBER, description: "Operating voltage in kilovolts (kV)" },
                  mvaCapacity: { type: Type.NUMBER, description: "Rated capacity in Megavolt-amperes (MVA)" }
                },
                required: ["name", "address", "coordinates"]
              }
            }
          },
          required: ["substations"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"substations": []}');
    return result.substations || [];
  } catch (error) {
    console.error("Error searching substations with AI:", error);
    return [];
  }
}
