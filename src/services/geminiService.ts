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
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: `Find 8-12 actual Eskom or Municipal electrical substations in or near "${area}", South Africa.
        Search for primary distribution substations and infrastructure records.
        Return JSON: name, owner, address, coordinates [lat, lng], voltageKV, mvaCapacity, description.
        Use Google Search to find real substation names.` }]}],
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
    } as any);

    const data = JSON.parse(extractJson(response.text) || "{}");
    return data.substations || [];
  } catch (error) {
    console.error("Error searching substations:", error);
    return [];
  }
}

export async function searchSubstationsByArea(north: number, south: number, east: number, west: number): Promise<AISubstation[]> {
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: `Find 10-15 actual Eskom or Municipal electrical substations in South Africa within the bounding box: North ${north}, South ${south}, East ${east}, West ${west}.
        If the search area is a broad region, look for major high-voltage transmission and primary distribution substations.
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
    } as any);

    const data = JSON.parse(extractJson(response.text) || "{}");
    return data.substations || [];
  } catch (error) {
    console.error("Error discovering substations:", error);
    return [];
  }
}

export async function searchVacantLandByArea(north: number, south: number, east: number, west: number): Promise<Property[]> {
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: `Search for 5 actually available VACANT LAND, UNIMPROVED PLOT, or FARM listings for sale in South Africa using:
           site:property24.com
           Geographic Focus: Area around Latitude ${north} to ${south} and Longitude ${west} to ${east}.
           
           STRICT REQUIREMENTS:
           1. ONLY vacant land/plots/farms.
           2. EVERY listing MUST have coordinates [lat, lng].` }]}],
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
    } as any);

    const data = JSON.parse(extractJson(response.text) || "{}");
    return data.properties || [];
  } catch (error) {
    console.error("Error discovering land:", error);
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
    ? `\nCRITICAL TARGET: You MUST find VACANT LAND, UNIMPROVED PLOTS, or FARMS specifically within a 1km radius of the "${anchorSubstation.name}" substation located at ${anchorSubstation.coordinates[0]}, ${anchorSubstation.coordinates[1]}.`
    : "";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: `Find up to 5 direct property listing URLs for VACANT LAND or FARMS specifically in South Africa using:
        site:property24.com
        ${north}..${south} latitude, ${west}..${east} longitude ${substationContext}
        REQUIREMENT: Direct URLs to detail pages only. No search results.` }]}],
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
    } as any);

    const data = JSON.parse(extractJson(response.text) || "{}");
    return data.links || [];
  } catch (error) {
    console.error("Error finding land links:", error);
    return [];
  }
}

export async function importPropertyListing(input: string): Promise<Property | null> {
  const ai = getAI();
  if (!ai) return null;

  try {
    let html = "";
    if (input.startsWith('http') && input.includes('property24.com')) {
      try {
        const fetchRes = await fetch(`/api/fetch-listing?url=${encodeURIComponent(input)}`);
        if (fetchRes.ok) html = await fetchRes.text();
      } catch (e) {
        console.warn("Proxy fetch failed", e);
      }
    }

    const promptPrefix = html 
      ? `Extract property details from this Property24 listing page.\nURL: ${input}\nCONTENT:\n${html.substring(0, 25000)}`
      : `Find and extract details for a Property24 South African property listing: ${input}. Use Google Search.`;

    const response = await ai.models.generateContent({
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
    } as any);

    return JSON.parse(extractJson(response.text) || "null");
  } catch (error) {
    console.error("Error importing property:", error);
    return null;
  }
}

export async function searchSubstationDetails(type: string, value: string): Promise<Substation | null> {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: `Find technical details for South African electrical substation (${type}: ${value}). 
        Need: Name, Address, Coordinates [lat, lng], Status, Voltage (kV), Capacity (MVA).
        Use Google Search.` }]}],
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
    } as any);

    return JSON.parse(extractJson(response.text) || "null");
  } catch (error) {
    console.error("Error searching substation details:", error);
    return null;
  }
}

export async function searchVacantLandByLocationName(location: string): Promise<Property[]> {
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: `Search for 5 actually available VACANT LAND, UNIMPROVED PLOT, or FARM listings for sale in "${location}", South Africa using:
           site:property24.com
           
           STRICT REQUIREMENTS:
           1. ONLY vacant land/plots/farms.
           2. EVERY listing MUST have coordinates [lat, lng].` }]}],
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
    } as any);

    const data = JSON.parse(extractJson(response.text) || "{}");
    return data.properties || [];
  } catch (error) {
    console.error("Error discovering land by name:", error);
    return [];
  }
}

export async function geocodeLocation(location: string): Promise<{ name: string, coordinates: [number, number], type?: string } | null> {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
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
    } as any);

    return JSON.parse(extractJson(response.text) || "null");
  } catch (error) {
    console.error("Error geocoding location:", error);
    return null;
  }
}
