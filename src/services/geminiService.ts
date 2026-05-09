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
  try {
    const response = await fetch("/api/extract/substation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameHint: area })
    });
    
    if (!response.ok) throw new Error("Server substation search failed");
    const data = await response.json();
    return data.substations || [];
  } catch (error) {
    console.error("Error searching substations:", error);
    return [];
  }
}

export async function searchSubstationsByArea(north: number, south: number, east: number, west: number): Promise<AISubstation[]> {
  try {
    const response = await fetch("/api/discover/substations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ north, south, east, west })
    });
    
    if (!response.ok) throw new Error("Server discovery failed");
    const data = await response.json();
    return data.substations || [];
  } catch (error) {
    console.error("Error discovering substations:", error);
    return [];
  }
}

export async function searchVacantLandByArea(north: number, south: number, east: number, west: number): Promise<Property[]> {
  try {
    const response = await fetch("/api/discover/land", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ north, south, east, west })
    });
    
    if (!response.ok) throw new Error("Server land discovery failed");
    const data = await response.json();
    return data.properties || [];
  } catch (error) {
    console.error("Error discovering land:", error);
    return [];
  }
}

export async function findLandListingLinks(north: number, south: number, east: number, west: number, anchorSubstation?: Substation): Promise<string[]> {
  const hasValidCoords = anchorSubstation?.coordinates && 
                        Array.isArray(anchorSubstation.coordinates) && 
                        anchorSubstation.coordinates.length >= 2;

  const substationContext = hasValidCoords
    ? `\nCRITICAL TARGET: You MUST find VACANT LAND, UNIMPROVED PLOTS, or FARMS specifically within a 3km radius of the "${anchorSubstation.name}" substation located at ${anchorSubstation.coordinates[0]}, ${anchorSubstation.coordinates[1]}. This is an anchor point. Prioritize listings that mention proximity to electrical infrastructure or this specific station if possible.
       STRICT EXCLUSION: Do NOT return links to houses, apartments, or commercial buildings.`
    : "";

  try {
    const response = await fetch("/api/discover/land", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ north, south, east, west, substationContext, linksOnly: true })
    });
    
    if (!response.ok) throw new Error("Server land link discovery failed");
    const data = await response.json();
    return data.links || [];
  } catch (error) {
    console.error("Error finding land links:", error);
    return [];
  }
}

export async function importPropertyListing(input: string): Promise<Property | null> {
  try {
    let html = null;

    // If input is a URL, try to fetch content directly via our proxy
    if (input.startsWith('http') && (input.includes('property24.com') || input.includes('privateproperty.co.za'))) {
      try {
        const response = await fetch(`/api/fetch-listing?url=${encodeURIComponent(input)}`);
        if (response.ok) {
          html = await response.text();
        }
      } catch (proxyError) {
        console.warn("[AI] Proxy fetch failed:", proxyError);
      }
    }

    const response = await fetch("/api/extract/property", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, html })
    });
    
    if (!response.ok) throw new Error("Server extraction failed");
    return await response.json();
  } catch (error) {
    console.error("Error importing property:", error);
    return null;
  }
}

export async function searchSubstationDetails(type: string, value: string): Promise<Substation | null> {
  try {
    const response = await fetch("/api/extract/substation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value })
    });
    
    if (!response.ok) throw new Error("Server substation detail extraction failed");
    return await response.json();
  } catch (error) {
    console.error("Error searching substation details:", error);
    return null;
  }
}

export async function geocodeLocation(location: string): Promise<{ name: string, coordinates: [number, number], type?: string } | null> {
  try {
    const response = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location })
    });
    
    if (!response.ok) throw new Error("Server geocoding failed");
    return await response.json();
  } catch (error) {
    console.error("Error geocoding location:", error);
    return null;
  }
}
