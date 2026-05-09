import { GoogleGenAI, Type } from "@google/genai";
import { Property, Substation } from "../types";

const getAI = () => {
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || "";
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined in the environment. AI features will fail. Ensure the API key is set in AI Studio Settings.");
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
      model: "gemini-3-flash-preview",
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
      model: "gemini-3-flash-preview",
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
      model: "gemini-3-flash-preview",
      contents: `Search for 5-10 actual VACANT LAND, UNIMPROVED PLOT, or FARM listings for sale in South Africa.
      Geographic Focus: Area around Latitude ${north} to ${south} and Longitude ${west} to ${east}.
      
      CRITICAL: ONLY return vacant land, plots, or agricultural farms. EXCLUDE residential houses, apartments, office buildings, or developed retail space.
      
      Look for listings on Property24 (property24.com) and Private Property (privateproperty.co.za).`,
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
                  type: { type: Type.STRING, enum: ['Vacant Land', 'Agricultural'] },
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
                required: ["name", "address", "coordinates", "p24Url", "type"]
              }
            }
          },
          required: ["properties"]
        }
      }
    });

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

export async function findLandListingLinks(north: number, south: number, east: number, west: number, anchorSubstation?: Substation): Promise<string[]> {
  const ai = getAI();
  if (!ai) return [];

  const hasValidCoords = anchorSubstation?.coordinates && 
                        Array.isArray(anchorSubstation.coordinates) && 
                        anchorSubstation.coordinates.length >= 2;

  const substationContext = hasValidCoords
    ? `\nCRITICAL TARGET: You MUST find VACANT LAND, UNIMPROVED PLOTS, or FARMS specifically within a 3km radius of the "${anchorSubstation.name}" substation located at ${anchorSubstation.coordinates[0]}, ${anchorSubstation.coordinates[1]}. This is an anchor point. Prioritize listings that mention proximity to electrical infrastructure or this specific station if possible.
       STRICT EXCLUSION: Do NOT return links to houses, apartments, or commercial buildings.`
    : "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for actual VACANT LAND, UNIMPROVED PLOT, or FARM listings for sale in South Africa near this area:
      Latitude ${north} to ${south}, Longitude ${west} to ${east}.${substationContext}
      
      Focus on Property24 (property24.com) and Private Property.
      
      CRITICAL: EXCLUDE all residential houses, townhouses, apartments, and developed commercial properties. We only want undeveloped land or farms.
      
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
    let promptPrefix = `Find and extract details for South African property listing: ${input}. Use Google Search.`;
    let tools: any[] = [{ googleSearch: {} }];

    // If input is a URL, try to fetch content directly via our proxy
    if (input.startsWith('http') && (input.includes('property24.com') || input.includes('privateproperty.co.za'))) {
      try {
        console.log(`[AI] Attempting proxy fetch for: ${input}`);
        const response = await fetch(`/api/fetch-listing?url=${encodeURIComponent(input)}`);
        if (response.ok) {
          const content = await response.text();
          
          // Basic validation: Is this actually a listing page or just our own app's HTML (fallback)?
          const isListing = content.toLowerCase().includes('property') || 
                            content.toLowerCase().includes('listing') || 
                            content.toLowerCase().includes('price');
          
          if (isListing && content.length > 500) {
            console.log(`[AI] Proxy fetch success, content length: ${content.length}`);
            promptPrefix = `Extract property details from the following South African property listing page content.
            URL: ${input}
            CONTENT:
            ${content.substring(0, 15000)} // Buffer limit for Gemini
            `;
            tools = []; // Don't need search if we have the content
          } else {
            console.warn(`[AI] Proxy returned suspicious content (likely fallback HTML). Falling back to Search Grounding.`);
          }
        } else {
          console.warn(`[AI] Proxy fetch returned status ${response.status}. Falling back to Search Grounding.`);
        }
      } catch (proxyError) {
        console.warn("[AI] Proxy fetch failed (likely CPanel/static host). Falling back to Search Grounding:", proxyError);
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${promptPrefix}
      Extract to JSON: name, type, description, p24Url, agent(Listing Agent name), agentPhone, address(street, suburb, city, province, country), coordinates[lat, lng], specs(standSize, titleType), financials(price, marketValue).
      
      STRICT REQUIREMENT: This tool is ONLY for VACANT LAND, PLOTS, and FARMS. 
      If the property is a residential house (with bedrooms/bathrooms mentioned as a primary feature), apartment, or office block, DO NOT label it as 'Residential'. 
      We prefer everything to be classified as either 'Vacant Land' (unimproved) or 'Agricultural' (farms).
      
      If it's a Property24 listing, find the specific coordinates for that address. COORDINATES ARE OPTIONAL: If the address is obfuscated or coordinates are hard to find, focus on name/price/agent and leave coordinates as null.`,
      config: {
        responseMimeType: "application/json",
        tools: tools,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            agent: { type: Type.STRING },
            agentPhone: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['Vacant Land', 'Agricultural'] },
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
            coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER }, nullable: true },
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
          required: ["name", "type", "address"]
        }
      }
    });

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
      model: "gemini-3-flash-preview",
      contents: `Find technical details for South African electrical substation (${type}: ${value}). 
      Be specific. Find its exact location (Latitude, Longitude), owner (Eskom or City Power/municipality), and technical specs (Voltage in kV, Capacity in MVA).
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
