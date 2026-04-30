import { GoogleGenAI, Type } from "@google/genai";
import { Property, PropertyType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function fetchPropertyFromProperty24(listingNumber: string): Promise<Property> {
  // 1. Construct the URL. Usually Property24 detail pages follow a pattern, 
  // but we can try to guess it or use the common mobile-friendly redirect if available.
  // Actually, a very reliable way is to search if we only have the number, 
  // but we'll try a direct URL pattern first.
  const url = `https://www.property24.com/for-sale/details/${listingNumber}`;
  
  // Note: In a real app, we'd use the provided tool to read URL content.
  // Since this is a service called from the frontend, and we have the read_url_content tool 
  // available to the agent, I will implement the logic to call this service 
  // and handle the data extraction via Gemini.
  
  // The actual implementation will be handled by the UI calling an API or we simulate it here
  // but since we are building a full-stack-ish app with the agent's help, 
  // I'll define the interface and let the agent implement the bridge.
  
  throw new Error("Property24 fetching requires url processing");
}

export const propertyExtractorSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the property or complex" },
    type: { type: Type.STRING, description: "One of: Residential, Commercial, Industrial, Agricultural. Never return 'Vacant Land'. If it is an empty stand, infer the zoning/classification from the surrounding properties or intended use." },
    address: {
      type: Type.OBJECT,
      properties: {
        street: { type: Type.STRING },
        suburb: { type: Type.STRING },
        city: { type: Type.STRING },
        country: { type: Type.STRING }
      },
      required: ["street", "suburb", "city", "country"]
    },
    coordinates: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER },
      description: "[latitude, longitude]"
    },
    specs: {
      type: Type.OBJECT,
      properties: {
        bedrooms: { type: Type.NUMBER },
        bathrooms: { type: Type.NUMBER },
        garages: { type: Type.NUMBER },
        carports: { type: Type.NUMBER },
        floorSize: { type: Type.NUMBER },
        standSize: { type: Type.NUMBER },
        titleType: { type: Type.STRING, description: "Sectional title or Full title" },
        floor: { type: Type.STRING }
      }
    },
    financials: {
      type: Type.OBJECT,
      properties: {
        purchasePrice: { type: Type.NUMBER },
        marketValue: { type: Type.NUMBER },
        expectedGrowth: { type: Type.NUMBER },
        bondAmount: { type: Type.NUMBER },
        deposit: { type: Type.NUMBER },
        interestRate: { type: Type.NUMBER },
        termYears: { type: Type.NUMBER },
        income: { type: Type.NUMBER },
        expenses: { type: Type.NUMBER }
      }
    }
  },
  required: ["name", "type", "address", "coordinates", "specs", "financials"]
};
