import { GoogleGenAI, Type } from "@google/genai";
import { Property, Substation } from "../types";

const getAI = () => {
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || "";
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined in the environment. AI features will fail.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_NAME = "gemini-3-flash-preview";

/**
 * Base parameters for generateContent, extended to include tools and config
 * which are sometimes missing from the SDK's strictly typed interface.
 */
interface ExtendedGenerateParams {
  model: string;
  contents: any[];
  tools?: any[];
  config?: {
    responseMimeType?: string;
    responseSchema?: any;
  };
}

async function generateAIContent<T>(params: ExtendedGenerateParams): Promise<T | null> {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent(params as any);
    const text = response.text;
    if (!text) return null;

    const jsonStr = extractJson(text);
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error(`AI Generation Error [${params.model}]:`, error);
    return null;
  }
}

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
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1).trim();
  }
  return text.trim();
}

export async function searchSubstations(area: string): Promise<AISubstation[]> {
  const data = await generateAIContent<{ substations: AISubstation[] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Find 8-12 actual Eskom or Municipal electrical substations in or near "${area}", South Africa.
      Search for primary distribution substations and infrastructure records for this specific region.
      
      CRITICAL:
      1. Coordinates MUST be precise and in [lat, lng] format.
      2. Verify the substation actually belongs to "${area}".
      3. Names must be real (e.g., "Bryant Substation", "Ekurhuleni North").
      
      Return JSON: name, owner, address, coordinates [lat, lng], voltageKV, mvaCapacity, description.` }]}],
    tools: [{ googleSearch: {} }],
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
                name: { type: Type.STRING },
                owner: { type: Type.STRING },
                address: { type: Type.STRING },
                coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER }, nullable: true },
                voltageKV: { type: Type.NUMBER },
                mvaCapacity: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["name", "address"]
            }
          }
        },
        required: ["substations"]
      }
    }
  });

  return data?.substations || [];
}

export async function searchSubstationsByArea(north: number, south: number, east: number, west: number): Promise<AISubstation[]> {
  const data = await generateAIContent<{ substations: AISubstation[] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Find 10-15 actual Eskom or Municipal electrical substations in South Africa strictly within this geographic bounding box:
      Latitude Range: ${south} to ${north} (South of Equator)
      Longitude Range: ${west} to ${east} (East of Prime Meridian)
      
      CRITICAL INSTRUCTION:
      1. ONLY return substations that physically exist within THESE bounds. 
      2. Coordinates MUST be in [lat, lng] format. Example: [-26.123, 28.456]
      3. Verify names and locations using Google Search.
      4. DO NOT return substations from other provinces or cities if they are outside this box.
      
      Return JSON: name, owner, address, coordinates [lat, lng], voltageKV, mvaCapacity, description.` }]}],
    tools: [{ googleSearch: {} }],
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
                name: { type: Type.STRING },
                owner: { type: Type.STRING },
                address: { type: Type.STRING },
                coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER }, nullable: true },
                voltageKV: { type: Type.NUMBER },
                mvaCapacity: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["name", "address"]
            }
          }
        },
        required: ["substations"]
      }
    }
  });

  return data?.substations || [];
}

export async function searchVacantLandByArea(north: number, south: number, east: number, west: number): Promise<Property[]> {
  const data = await generateAIContent<{ properties: Property[] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Search for 5 actually available VACANT LAND, UNIMPROVED PLOT, or FARM listings for sale in South Africa using:
         site:property24.com
         
         CRITICAL: ONLY use property24.com (South Africa). 
         DO NOT search or return anything from property24.co.ke (Kenya).
         
         Geographic Focus: ${south} S to ${north} S latitude and ${west} E to ${east} E longitude.
         
         STRICT REQUIREMENTS:
         1. ONLY vacant land/plots/farms.
         2. EVERY listing MUST have coordinates [lat, lng].
         3. ONLY include listings that are ACTIVE and AVAILABLE. Exclude anything marked "no longer available".` }]}],
    tools: [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
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
                coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                financials: { type: Type.OBJECT, properties: { purchasePrice: { type: Type.NUMBER } } }
              },
              required: ["name", "address", "coordinates", "p24Url", "type"]
            }
          }
        },
        required: ["properties"]
      }
    }
  });

  return data?.properties || [];
}

export async function findLandListingLinks(north: number, south: number, east: number, west: number, anchorSubstation?: Substation): Promise<string[]> {
  const hasValidCoords = anchorSubstation?.coordinates && 
                        Array.isArray(anchorSubstation.coordinates) && 
                        anchorSubstation.coordinates.length >= 2;

  const substationContext = hasValidCoords
    ? `\nCRITICAL TARGET: You MUST find VACANT LAND, UNIMPROVED PLOTS, or FARMS specifically within a 1km radius of the "${anchorSubstation.name}" substation located at ${anchorSubstation.coordinates[0]}, ${anchorSubstation.coordinates[1]}.`
    : "";

  const searchQuery = hasValidCoords
    ? `site:property24.com VACANT LAND for sale near "${anchorSubstation.name}" ${anchorSubstation.address}`
    : `site:property24.com VACANT LAND for sale South Africa ${north}..${south} latitude ${east}..${west} longitude`;

  const data = await generateAIContent<{ links: string[] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Find up to 5 direct property listing URLs for VACANT LAND or FARMS specifically in South Africa.
      
      SEARCH QUERY: ${searchQuery}
      
      CRITICAL: ONLY use property24.com (South Africa). 
      DO NOT search or return anything from property24.co.ke (Kenya).
      
      ${substationContext}
      REQUIREMENT: Return ONLY direct URLs to Property24 detail pages. No search result pages.` }]}],
    tools: [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          links: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["links"]
      }
    }
  });

  return data?.links || [];
}

export async function importPropertyListing(input: string): Promise<Property | null> {
  const isP24 = input.includes('property24.com');
  const isP24Kenya = input.includes('property24.co.ke');

  if (isP24Kenya) {
    console.warn("Kenya listings are not allowed:", input);
    return null;
  }

  let html = "";
  if (input.startsWith('http') && isP24) {
    try {
      const fetchRes = await fetch(`/api/fetch-listing?url=${encodeURIComponent(input)}`);
      if (fetchRes.ok) {
        html = await fetchRes.text();
        // More robust availability check
        const isUnavailable = html.includes("The property you are looking for is no longer available") || 
                            html.includes("Property no longer available") ||
                            html.includes("listing-unavailable-message");
        
        if (isUnavailable) {
          console.warn("Property no longer available:", input);
          return null;
        }
      }
    } catch (e) {
      console.warn("Proxy fetch failed", e);
    }
  }

  const promptPrefix = html 
    ? `Extract property details from this Property24 listing page.\nURL: ${input}\nCONTENT:\n${html.substring(0, 25000)}`
    : `Find and extract details for a Property24 South African property listing: ${input}. Use Google Search.`;

  const property = await generateAIContent<Property>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `${promptPrefix}
      Extract to JSON: name, type, description, p24Url, agent, agentPhone, address, coordinates[lat, lng], specs, financials.
      STRICT PROPERTY RULES:
      1. VACANT LAND/PLOTS/FARMS only.
      2. Accurate GPS extraction.
      3. The "p24Url" MUST be exactly: ${input}` }]}],
    tools: html ? [] : [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
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
          coordinatesFlag: { type: Type.STRING, enum: ['precise', 'approximate'] },
          specs: { type: Type.OBJECT, properties: { standSize: { type: Type.NUMBER }, titleType: { type: Type.STRING } } },
          financials: { type: Type.OBJECT, properties: { purchasePrice: { type: Type.NUMBER }, marketValue: { type: Type.NUMBER } } }
        },
        required: ["name", "type", "address"]
      }
    }
  });

  return property;
}

export async function searchSubstationDetails(type: string, value: string): Promise<Substation | null> {
  const substation = await generateAIContent<Substation>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Find precise technical details for South African electrical substation (${type}: ${value}). 
      
      REQUIREMENTS:
      1. Name: Real name (e.g. "Gabbro Substation")
      2. Coordinates: Precise [lat, lng]. MUST be in South Africa (Lat -22 to -35, Lng 16 to 33).
      3. Verify owner (Eskom/Municipal) and voltage level.
      4. Use Google Search to cross-reference infrastructure maps.
      
      Return JSON: name, address, coordinates [lat, lng], status, voltageKV, mvaCapacity.` }]}],
    tools: [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          address: { type: Type.STRING },
          coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER }, nullable: true },
          status: { type: Type.STRING, enum: ['Active', 'Under Maintenance', 'Planned'] },
          capacity: { type: Type.STRING },
          voltageKV: { type: Type.NUMBER },
          mvaCapacity: { type: Type.NUMBER },
          googleMapsUrl: { type: Type.STRING }
        },
        required: ["name", "address", "status"]
      }
    }
  });

  return substation;
}

export async function searchVacantLandByLocationName(location: string): Promise<Property[]> {
  const data = await generateAIContent<{ properties: Property[] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Search for 5 actually available VACANT LAND, UNIMPROVED PLOT, or FARM listings for sale in "${location}", South Africa using:
         site:property24.com
         
         CRITICAL: ONLY use property24.com (South Africa). 
         DO NOT search or return anything from property24.co.ke (Kenya).
         
         STRICT REQUIREMENTS:
         1. ONLY vacant land/plots/farms.
         2. EVERY listing MUST have coordinates [lat, lng].
         3. ONLY include listings that are ACTIVE and AVAILABLE. Exclude anything marked "no longer available".` }]}],
    tools: [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
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
                coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                financials: { type: Type.OBJECT, properties: { purchasePrice: { type: Type.NUMBER } } }
              },
              required: ["name", "address", "coordinates", "p24Url", "type"]
            }
          }
        },
        required: ["properties"]
      }
    }
  });

  return data?.properties || [];
}

export async function geocodeLocation(location: string): Promise<{ name: string, coordinates: [number, number], type?: string } | null> {
  const data = await generateAIContent<{ name: string, type?: string, coordinates: [number, number] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Find the precise Latitude and Longitude coordinates for "${location}" in South Africa. 
      It could be a town, city, suburb, or major point of interest.
      Return JSON: name, coordinates [lat, lng], type (Suburb/City/Town/POI).
      Use Google Search to ensure accuracy.` }]}],
    tools: [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } }
        },
        required: ["name", "coordinates"]
      }
    }
  });

  return data;
}
