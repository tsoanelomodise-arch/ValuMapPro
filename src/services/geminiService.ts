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
      model: "gemini-3-flash-preview",
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

    console.log("Substation Search Response:", response);
    const text = response.text || '';
    try {
      const jsonContent = text.includes('```json') 
        ? text.split('```json')[1].split('```')[0].trim() 
        : text.includes('```') 
          ? text.split('```')[1].split('```')[0].trim()
          : text.trim();
          
      const parsed = JSON.parse(jsonContent || '{"substations": []}');
      return parsed.substations || [];
    } catch (e) {
      console.error("Failed to parse Gemini substation search response:", text);
      return [];
    }
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
      model: "gemini-3-flash-preview",
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

    console.log("Substation Area Discovery Response:", response);
    const text = response.text || '';
    try {
      const jsonContent = text.includes('```json') 
        ? text.split('```json')[1].split('```')[0].trim() 
        : text.includes('```') 
          ? text.split('```')[1].split('```')[0].trim()
          : text.trim();
          
      const parsed = JSON.parse(jsonContent || '{"substations": []}');
      return parsed.substations || [];
    } catch (e) {
      console.error("Failed to parse Gemini substation area response:", text);
      return [];
    }
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
      model: "gemini-3-flash-preview",
      contents: `Search for 5-10 actual vacant land, residential stands, or agricultural land for sale located in or near this area in South Africa:
      Bounding Box - North: ${north}, South: ${south}, East: ${east}, West: ${west}
      
      Look for listings on Property24 and Private Property.
      
      Return details for each: title (name), description, listing URL, address (street, suburb, city, province), coordinates [lat, lng], stand size (m2), and price (ZAR). 
      Important: Ensure coordinates are accurate for South Africa (lat ~ -20 to -35).
      If no listings are found exactly inside bounds, prioritize findings in the surrounding suburbs of this region.`,
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
                    },
                    required: ["suburb", "city"]
                  },
                  coordinates: { 
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER }
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

    console.log("Gemini Land Discovery Response:", response);
    const text = response.text || '';
    
    if (!text) {
      console.warn("Gemini returned empty text. Candidates:", response.candidates);
      if (response.candidates?.[0]?.finishReason) {
        console.warn("Finish Reason:", response.candidates[0].finishReason);
      }
    }

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
      model: "gemini-3-flash-preview",
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

    console.log("Property Import Response:", response);
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
      model: "gemini-3-flash-preview",
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

    console.log("Substation Detail Response:", response);
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
