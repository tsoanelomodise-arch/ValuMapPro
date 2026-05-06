import { GoogleGenAI, Type } from "@google/genai";
import { Property, Substation } from "../types";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. The AI Guided Search might not work in some environments unless configured.");
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

    const text = response.text || '';
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

    const text = response.text || '';
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
      contents: `Find 5-10 actual vacant land / residential agricultural land for sale listings strictly within this geographic bounding box in South Africa (e.g. from Property24, Private Property):
      North: ${north}
      South: ${south}
      East: ${east}
      West: ${west}
      
      Return the property details: name (title), type (always 'Vacant Land'), description, p24Url, address (street, suburb, city, province, country), coordinates [lat, lng], standSize (m2), and price (ZAR).
      Ensure the coordinates are precise and inside the requested area.
      Use Google Search results. If no listings are found exactly in bounds, check the outer suburb.`,
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
                    },
                    required: ["purchasePrice"]
                  }
                },
                required: ["name", "address", "coordinates", "p24Url", "financials"]
              }
            }
          },
          required: ["properties"]
        }
      }
    });

    const text = response.text || '';
    try {
      // Handle potential markdown wrapping just in case
      const jsonContent = text.includes('```json') 
        ? text.split('```json')[1].split('```')[0].trim() 
        : text.includes('```') 
          ? text.split('```')[1].split('```')[0].trim()
          : text.trim();
          
      const parsed = JSON.parse(jsonContent || '{"properties": []}');
      return parsed.properties || [];
    } catch (e) {
      console.error("Failed to parse Gemini discovery response:", text);
      return [];
    }
  } catch (error) {
    console.error("Error discovering vacant land in area with AI:", error);
    return [];
  }
}

export async function importPropertyListing(input: string): Promise<Property | null> {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Find and extract details for SA property: ${input}.
      Extract to JSON: name, type, description, p24Url, agent(Listing Agent name), agentPhone, address(street, suburb, city, province, country), coordinates[lat, lng], specs(standSize, titleType), financials(price, marketValue).
      Use Google Search results.`,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            agent: { type: Type.STRING },
            agentPhone: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['Residential', 'Commercial', 'Industrial', 'Agricultural'] },
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
            coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            specs: {
              type: Type.OBJECT,
              properties: {
                standSize: { type: Type.NUMBER },
                titleType: { type: Type.STRING, enum: ['Sectional title', 'Full title'] }
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
          required: ["name", "type", "address", "coordinates"]
        }
      }
    });

    const text = response.text || '';
    try {
      const jsonContent = text.includes('```json') 
        ? text.split('```json')[1].split('```')[0].trim() 
        : text.includes('```') 
          ? text.split('```')[1].split('```')[0].trim()
          : text.trim();
          
      return JSON.parse(jsonContent);
    } catch (e) {
      console.error("Failed to parse Gemini import response:", text);
      return null;
    }
  } catch (error) {
    console.error("Error importing property with AI:", error);
    return null;
  }
}

export async function searchSubstationDetails(type: string, value: string): Promise<Substation | null> {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Find technical details for South African electrical substation (${type}: ${value}). 
      Need: Name, Address, Coordinates [lat, lng], Status, Voltage (kV), Capacity (MVA).
      Use Google Search results.`,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            address: { type: Type.STRING },
            coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            status: { type: Type.STRING, enum: ['Active', 'Under Maintenance', 'Planned'] },
            capacity: { type: Type.STRING },
            voltageKV: { type: Type.NUMBER },
            mvaCapacity: { type: Type.NUMBER },
            googleMapsUrl: { type: Type.STRING }
          },
          required: ["name", "address", "coordinates", "status"]
        }
      }
    });

    const text = response.text || '';
    try {
      const jsonContent = text.includes('```json') 
        ? text.split('```json')[1].split('```')[0].trim() 
        : text.includes('```') 
          ? text.split('```')[1].split('```')[0].trim()
          : text.trim();
          
      return JSON.parse(jsonContent);
    } catch (e) {
      console.error("Failed to parse Gemini substation details response:", text);
      return null;
    }
  } catch (error) {
    console.error("Error searching substation details with AI:", error);
    return null;
  }
}
