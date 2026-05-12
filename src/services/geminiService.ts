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
    contents: [{ role: 'user', parts: [{ text: `Search for real Eskom or Municipal electrical substations in or near "${area}", South Africa.
      
      TECHNICAL DISCOVERY PROTOCOL:
      1. Use Google Search grounding to find official Eskom or Municipal infrastructure lists for "${area}".
      2. Cross-reference with technical maps and Google Earth landmarks to ensure precision.
      3. If "${area}" is a small suburb or street, search for the larger surrounding region (e.g. city or district) to ensure useful results are returned.
      
      CRITICAL VALIDATION:
      - Coordinates MUST be precise [lat, lng].
      - Substations MUST be real physical entities (e.g., "Bryant Substation", "Centurion Central").
      - If no precise substations are found in the immediate area, return the nearest major transmission substations.
      
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

  return (data?.substations || []).filter(s => s.name && s.address);
}

export async function searchSubstationsByArea(north: number, south: number, east: number, west: number): Promise<AISubstation[]> {
  const data = await generateAIContent<{ substations: AISubstation[] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Find actual Eskom or Municipal electrical substations in South Africa strictly within this geographic bounding box:
      Latitude Range: ${south} to ${north} (South of Equator)
      Longitude Range: ${west} to ${east} (East of Prime Meridian)
      
      CROSS-REFERENCE REQUIREMENT:
      Use Google Search to cross-reference with Google Maps satellite imagery and Google Earth infrastructure data to ensure these substations exist and have precise coordinates.
      
      CRITICAL INSTRUCTION:
      1. ONLY return substations that physically exist within THESE bounds. 
      2. Coordinates MUST be precise [lat, lng] verified against Google Maps.
      3. Verify names and locations using infrastructure records.
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
    contents: [{ role: 'user', parts: [{ text: `Search for high-quality, ACTIVE Vacant Land listings in South Africa.
         
         GEOGRAPHIC FOCUS:
         Latitude: ${south} to ${north}
         Longitude: ${west} to ${east}
         
         UTILITY REQUIREMENTS:
         - Discard listings that are "Sold", "Reserved", or missing a price.
         - Only return listings with comprehensive details (Stand size, price, clear description).
         - SITE FOCUS: site:property24.com OR site:privateproperty.co.za
         
         CRITICAL REGIONAL LOCK:
         - ONLY return listings from South Africa (.co.za or .com).
         - DO NOT RETURN listings from Kenya (property24.co.ke), Nigeria, or any other country.
         
         VULNERABILITY PREVENTION:
         Do not guess URLs. ONLY return real URLs found in search result snippets.
         
         Return JSON: name, type, description, p24Url, address, coordinates [lat, lng], financials.` }]}],
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
                    province: { type: Type.STRING }
                  },
                  required: ["suburb", "city"]
                },
                coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                financials: { 
                  type: Type.OBJECT, 
                  properties: { purchasePrice: { type: Type.NUMBER } },
                  required: ["purchasePrice"]
                },
                specs: {
                  type: Type.OBJECT,
                  properties: { standSize: { type: Type.NUMBER } },
                  required: ["standSize"]
                }
              },
              required: ["name", "description", "address", "coordinates", "p24Url", "financials", "specs"]
            }
          }
        },
        required: ["properties"]
      }
    }
  });

  return (data?.properties || []).filter(p => 
    p.p24Url && 
    p.p24Url.includes('property24.com/for-sale/') && 
    p.financials?.purchasePrice > 0 &&
    p.specs?.standSize > 0 &&
    p.description?.length > 50 &&
    Array.isArray(p.coordinates) && p.coordinates.length === 2
  );
}

export async function findLandListingLinks(north: number, south: number, east: number, west: number, anchorSubstation?: Substation): Promise<string[]> {
  const hasValidCoords = anchorSubstation?.coordinates && 
                        Array.isArray(anchorSubstation.coordinates) && 
                        anchorSubstation.coordinates.length >= 2;

  const substationContext = hasValidCoords
    ? `\nCRITICAL TARGET: You MUST find currently active VACANT LAND listings specifically within a 3km radius of the "${anchorSubstation.name}" substation located at ${anchorSubstation.coordinates[0]}, ${anchorSubstation.coordinates[1]}.`
    : "";

  const searchQuery = hasValidCoords
    ? `(site:property24.com OR site:privateproperty.co.za) "vacant land" for sale near "${anchorSubstation.address}"`
    : `(site:property24.com OR site:privateproperty.co.za) "vacant land" for sale South Africa ${north}..${south} latitude ${east}..${west} longitude`;

  const data = await generateAIContent<{ links: string[] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Find up to 5 direct URLs for ACTIVE Vacant Land or Farm listings in South Africa.
      
      SEARCH QUERY: ${searchQuery}
      
      VERIFICATION PROTOCOL:
      1. ONLY return URLs from property24.com (SA) or privateproperty.co.za.
      2. If you are not 100% sure the URL is a real, active listing, DO NOT return it.
      3. CRITICAL: EXCLUDE property24.co.ke (Kenya) and property24.com.ng (Nigeria).
      ${substationContext}
      
      REQUIREMENT: Return ONLY direct URLs to detail pages.` }]}],
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

  return (data?.links || []).filter(link => 
    (link.includes('property24.com/for-sale/') || link.includes('privateproperty.co.za/for-sale/')) && 
    !link.includes('.co.ke') &&
    !link.includes('.com.ng') &&
    !link.includes('property24.co.ke') &&
    !link.includes('/search/') // Avoid search result pages
  );
}

export async function importPropertyListing(input: string): Promise<Property | null> {
  let processedInput = input.trim();
  
  // If it's a numeric listing number, convert to full P24 URL first
  if (/^\d{5,15}$/.test(processedInput)) {
    processedInput = `https://www.property24.com/for-sale/details/${processedInput}`;
  }

  const isP24SA = processedInput.includes('property24.com');
  const isPrivateProperty = processedInput.includes('privateproperty.co.za');
  const isNonSA = processedInput.includes('.co.ke') || processedInput.includes('.com.ng') || processedInput.includes('property24.co.ke');

  if (isNonSA || (!isP24SA && !isPrivateProperty)) {
    console.warn("Non-South African or unsupported domain listing rejected:", processedInput);
    return null;
  }

  let html = "";
  if (processedInput.startsWith('http') && (isP24SA || isPrivateProperty)) {
    try {
      const fetchRes = await fetch(`/api/fetch-listing?url=${encodeURIComponent(processedInput)}`);
      if (fetchRes.ok) {
        html = await fetchRes.text();
        
        // Check for specific markers in the raw HTML that suggest the listing is gone
        const textLower = html.toLowerCase();
        const isUnavailable = 
          textLower.includes("listing not found") ||
          textLower.includes("property you are looking for is no longer available") || 
          textLower.includes("listing no longer exists") ||
          textLower.includes("listing-unavailable-message") ||
          textLower.includes("property no longer available") ||
          textLower.includes("this listing is no longer available");
        
        if (isUnavailable) {
          console.warn("Property no longer available (detected in HTML):", processedInput);
          return null;
        }
      } else {
        console.warn(`Proxy fetch failed with status: ${fetchRes.status}`);
      }
    } catch (e) {
      console.warn("Proxy fetch failed", e);
    }
  }

  // If we couldn't fetch HTML and it's a URL, we risk hallucination by searching.
  // We'll only allow search as a fallback for listing numbers or if the search can confirm the URL exists.
  const promptPrefix = html 
    ? `EXTRACT HIGH-UTILITY DATA from this South African property listing.
       CRITICAL: If the listing has no price, no description, or no stand size, return null.
       
       URL: ${processedInput}
       CONTENT:\n${html.substring(0, 25000)}`
    : `Find and extract FULL details for South African listing: ${processedInput}. 
       CRITICAL: Discard if the listing is truncated, generic, or missing financials/specs. Only return if confirmed in South Africa.`;

  const property = await generateAIContent<Property>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `${promptPrefix}
      
      STRICT VALIDATION RULES:
      1. PRICE: Must be a specific number, not "POA" or empty.
      2. SPECS: Extract 'standSize' in square meters. (often marked as Erf Size or Land Area).
      3. DESCRIPTION: Must extract at least 3-4 sentences of descriptive text.
      4. IDENTITY: The "p24Url" should be the provided URL: ${processedInput}
      5. COMPLETENESS: If any of [price, coordinates, suburb, description, standSize] are missing or zero, DO NOT RETURN A VALID OBJECT.
      
      Extract to JSON: name, type, description, p24Url, agent, agentPhone, address, coordinates[lat, lng], specs, financials.` }]}],
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
            },
            required: ["suburb", "city"]
          },
          coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          specs: {
            type: Type.OBJECT,
            properties: {
              standSize: { type: Type.NUMBER },
              titleType: { type: Type.STRING }
            },
            required: ["standSize"]
          },
          financials: {
            type: Type.OBJECT,
            properties: {
              purchasePrice: { type: Type.NUMBER },
              rates: { type: Type.NUMBER }
            },
            required: ["purchasePrice"]
          }
        },
        required: ["name", "description", "address", "coordinates", "p24Url", "specs", "financials"]
      }
    }
  });

  // Final sanity check on data quality
  if (property) {
    const hasPrice = property.financials?.purchasePrice && property.financials.purchasePrice > 0;
    const hasSize = property.specs?.standSize && property.specs.standSize > 0;
    const hasDesc = property.description && property.description.length > 50;
    const isSA = property.p24Url?.includes('property24.com/for-sale/') || property.p24Url?.includes('privateproperty.co.za/for-sale/');
    const isNotNonSA = !property.p24Url?.includes('.co.ke') && !property.p24Url?.includes('.com.ng');
    const hasCoords = Array.isArray(property.coordinates) && property.coordinates.length === 2 && !isNaN(property.coordinates[0]);
    
    if (!hasPrice || !hasSize || !hasDesc || !isSA || !isNotNonSA || !hasCoords) {
      console.warn("Discarding low-utility or invalid regional property listing:", input);
      return null;
    }
  }

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

export async function verifySubstationAddress(name: string, currentAddress: string): Promise<string> {
  const data = await generateAIContent<{ correctedAddress: string }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Verify the official physical address for the "${name}" substation in South Africa.
      Current hint: ${currentAddress}
      
      Use Google Search and Google Maps to find the confirmed street/area address for this specific electrical infrastructure.
      Return the most accurate version found.
      
      Return JSON: correctedAddress.` }]}],
    tools: [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          correctedAddress: { type: Type.STRING }
        },
        required: ["correctedAddress"]
      }
    }
  });

  return data?.correctedAddress || currentAddress;
}

export async function searchVacantLandByLocationName(location: string): Promise<Property[]> {
  const data = await generateAIContent<{ properties: Property[] }>({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Search for high-quality, ACTIVE Vacant Land listings in "${location}", South Africa.
         
         UTILITY REQUIREMENTS:
         - Discard listings without a clear price or stand size.
         - Only return listings with comprehensive details.
         - SITE FOCUS: site:property24.com OR site:privateproperty.co.za
         
         CRITICAL REGIONAL LOCK:
         - ONLY return listings from South Africa.
         - DO NOT RETURN listings from Kenya (.co.ke), Nigeria, or any other country.
         
         VULNERABILITY PREVENTION:
         Do not guess URLs. ONLY return real URLs found in search result snippets.
         
         Return JSON: name, type, description, p24Url, address, coordinates [lat, lng], financials, specs.` }]}],
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
                    province: { type: Type.STRING }
                  },
                  required: ["suburb", "city"]
                },
                coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                financials: { 
                  type: Type.OBJECT, 
                  properties: { purchasePrice: { type: Type.NUMBER } },
                  required: ["purchasePrice"]
                },
                specs: {
                  type: Type.OBJECT,
                  properties: { standSize: { type: Type.NUMBER } },
                  required: ["standSize"]
                }
              },
              required: ["name", "description", "address", "coordinates", "p24Url", "financials", "specs"]
            }
          }
        },
        required: ["properties"]
      }
    }
  });

  return (data?.properties || []).filter(p => 
    p.p24Url && 
    (p.p24Url.includes('property24.com/for-sale/') || p.p24Url.includes('privateproperty.co.za/for-sale/')) && 
    p.financials?.purchasePrice > 0 &&
    p.specs?.standSize > 0 &&
    p.description?.length > 50 &&
    Array.isArray(p.coordinates) && p.coordinates.length === 2 && !isNaN(p.coordinates[0])
  );
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
