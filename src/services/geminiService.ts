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

function extractJson(text: string): string {
  if (!text) return "";
  
  // Try to find JSON in code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  
  // If no code blocks, try to find the first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1).trim();
  }
  
  return text.trim();
}

export async function searchSubstations(area: string): Promise<AISubstation[]> {
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Find 3-5 actual electrical substations in or near ${area}, South Africa.
      Return JSON: name, owner, address, coordinates [lat, lng], voltageKV, mvaCapacity, description.
      Use Google Search.`,
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
    if (!text) {
      console.warn("Substation Search: Gemini returned empty text.", response);
      return [];
    }

    try {
      const jsonContent = extractJson(text);
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
      model: "gemini-flash-latest",
      contents: `Find 5-10 actual electrical substations in South Africa near Latitude ${north} to ${south} and Longitude ${west} to ${east}.
      Return JSON: name, owner (utility), address, coordinates [lat, lng], voltageKV, mvaCapacity.`,
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
    if (!text) {
      console.warn("Substation Area: Gemini returned empty text.", response);
      return [];
    }

    try {
      const jsonContent = extractJson(text);
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
      model: "gemini-flash-latest",
      contents: `Search for 5-10 actual VACANT LAND, RESIDENTIAL STANDS, or AGRICULTURAL LAND listings for sale in South Africa.
      Geographic Focus: Area around Latitude ${north} to ${south} and Longitude ${west} to ${east}.
      
      Look for listings on Property24 (property24.com) and Private Property (privateproperty.co.za).
      
      Return as JSON with:
      - name: Listing title
      - type: 'Vacant Land' or 'Agricultural'
      - description: Brief summary
      - p24Url: Full directo URL to the listing on Property24
      - address: { suburb, city, province, country: 'South Africa' }
      - coordinates: [lat, lng]
      - financials: { purchasePrice: number in ZAR }
      
      Important: Ensure coordinates are accurate for the specific properties found.`,
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
                      suburb: { type: Type.STRING },
                      city: { type: Type.STRING },
                      province: { type: Type.STRING },
                      country: { type: Type.STRING }
                    },
                    required: ["suburb", "city"]
                  },
                  coordinates: { 
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "[lat, lng]"
                  },
                  financials: {
                    type: Type.OBJECT,
                    properties: {
                      purchasePrice: { type: Type.NUMBER }
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
      console.warn("Gemini returned empty text for land discovery.");
      return [];
    }

    try {
      const jsonContent = extractJson(text);
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

export async function findLandListingLinks(north: number, south: number, east: number, west: number, nearbySubstations?: string[]): Promise<string[]> {
  const ai = getAI();
  if (!ai) return [];

  const substationContext = nearbySubstations && nearbySubstations.length > 0 
    ? `\nCRITICAL PRIORITY: You must find listings that are within a 3km maximum radius of these electrical substations: ${nearbySubstations.join(', ')}. This is for a high-priority energy project. If no land is found within 3km of THESE exact stations, broaden search slightly but stay as close as possible.`
    : "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Search for actual VACANT LAND, RESIDENTIAL STANDS, or AGRICULTURAL LAND listings for sale in South Africa inside this area:
      Latitude ${north} to ${south}, Longitude ${west} to ${east}.${substationContext}
      
      Focus on Property24 (property24.com) and Private Property.
      
      Return ONLY a JSON object with a 'links' array containing the full URLs for each property found.`,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            links: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["links"]
        }
      }
    });

    console.log("Gemini Land Link Discovery Response:", response);
    const text = response.text || '';
    if (!text) {
      console.warn("Gemini returned empty text for land link discovery.");
      return [];
    }
    
    try {
      const jsonContent = extractJson(text);
      const parsed = JSON.parse(jsonContent || '{"links": []}');
      return parsed.links || [];
    } catch (e) {
      console.error("Failed to parse Gemini link discovery response:", text);
      return [];
    }
  } catch (error) {
    console.error("Error finding land links with AI:", error);
    return [];
  }
}

export async function importPropertyListing(input: string): Promise<Property | null> {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Find and extract details for South African property listing: ${input}.
      Extract to JSON: name, type, description, p24Url, agent(Listing Agent name), agentPhone, address(street, suburb, city, province, country), coordinates[lat, lng], specs(standSize, titleType), financials(price, marketValue).
      Use Google Search. If it's a Property24 listing, find the specific coordinates for that address.`,
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
    if (!text) {
      console.warn("Property Import: Gemini returned empty text.", response);
      return null;
    }

    try {
      const jsonContent = extractJson(text);
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
      Use Google Search.`,
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
    if (!text) {
      console.warn("Substation Detail: Gemini returned empty text.", response);
      return null;
    }

    try {
      const jsonContent = extractJson(text);
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
