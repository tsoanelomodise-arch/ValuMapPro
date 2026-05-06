import { GoogleGenAI, Type } from "@google/genai";
import { Property } from "../types";

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
  owner?: string;
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
      model: "gemini-flash-latest",
      contents: `Find 3-5 actual electrical substations in or near ${area}, South Africa.
      Return the official name, owner/operator, address, coordinates [lat, lng], voltage (kV), capacity (MVA), and a short description.
      Use Google Search results.`,
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
                  owner: { type: Type.STRING },
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

export async function searchSubstationsByArea(north: number, south: number, east: number, west: number): Promise<AISubstation[]> {
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Find 5-10 actual electrical substations located strictly within this geographic bounding box in South Africa:
      North: ${north}
      South: ${south}
      East: ${east}
      West: ${west}
      
      Return the official name, owner/operator (e.g. Eskom, City of Cape Town, etc.), address, coordinates [lat, lng], voltage (kV), capacity (MVA), and a short description.
      Ensure the coordinates are precise and inside the requested area.
      Use Google Search results.`,
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
                  owner: { type: Type.STRING, description: "The utility or entity that owns the substation" },
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
                required: ["name", "address", "coordinates", "owner"]
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
    console.error("Error discovering substations in area with AI:", error);
    return [];
  }
}

export async function searchVacantLandByArea(north: number, south: number, east: number, west: number): Promise<Property[]> {
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Find 5-10 actual vacant land / residential agricultural land for sale listings strictly within this geographic bounding box in South Africa from Property24 or similar:
      North: ${north}
      South: ${south}
      East: ${east}
      West: ${west}
      
      Return the property details: name (title), type (always 'Vacant Land'), description, p24Url, address (street, suburb, city, province, country), coordinates [lat, lng], standSize (m2), and price (ZAR).
      Ensure the coordinates are precise and inside the requested area.
      Use Google Search results.`,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            properties: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  p24Url: { type: Type.STRING },
                  address: {
                    type: Type.OBJECT,
                    properties: {
                      street: { type: Type.STRING },
                      suburb: { type: Type.STRING },
                      city: { type: Type.STRING },
                      province: { type: Type.STRING },
                      country: { type: Type.STRING }
                    }
                  },
                  coordinates: { 
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Array of [latitude, longitude]"
                  },
                  specs: {
                    type: Type.OBJECT,
                    properties: {
                      standSize: { type: Type.NUMBER },
                      titleType: { type: Type.STRING }
                    }
                  },
                  financials: {
                    type: Type.OBJECT,
                    properties: {
                      purchasePrice: { type: Type.NUMBER },
                      marketValue: { type: Type.NUMBER }
                    }
                  }
                },
                required: ["name", "address", "coordinates", "p24Url"]
              }
            }
          },
          required: ["properties"]
        }
      }
    });

    const text = response.text;
    return JSON.parse(text || '{"properties": []}').properties || [];
  } catch (error) {
    console.error("Error discovering vacant land in area with AI:", error);
    return [];
  }
}
