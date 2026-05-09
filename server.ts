import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini on the server
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Helper to extract JSON from AI response (handles markdown markers)
function extractJson(text: string): string | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  return jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text.trim();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // In-memory cache for listing HTML (simple cache to prevent redundant fetches)
  const listingCache = new Map<string, { html: string; timestamp: number }>();
  const CACHE_TTL = 1000 * 60 * 15; // 15 minutes cache

  // API Routes
  app.get("/api/fetch-listing", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    // Check cache
    const cached = listingCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Proxy] Serving from cache: ${url}`);
      return res.send(cached.html);
    }

    try {
      console.log(`[Proxy] Fetching listing starting: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          "DNT": "1",
          "Upgrade-Insecure-Requests": "1"
        },
      });

      console.log(`[Proxy] Target response status: ${response.status} for ${url}`);

      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `The property listing site returned an error (${response.status}).`,
          url: url
        });
      }

      const html = await response.text();
      console.log(`[Proxy] HTML length: ${html.length}`);
      
      // Advanced text extraction to keep payloads manageable for Gemini
      // Strip head, scripts, styles, and other heavy non-content tags
      const cleanedHtml = html
        .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '') // Remove head entirely
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
        .replace(/\s\s+/g, ' ') // Collapse whitespace
        .trim();

      console.log(`[Proxy] Cleaned HTML length: ${cleanedHtml.length}`);
      
      // Store in cache
      listingCache.set(url, { html: cleanedHtml, timestamp: Date.now() });
      
      res.send(cleanedHtml);
    } catch (error) {
      console.error("[Proxy] Error fetching listing:", error);
      res.status(500).json({ 
        error: "Failed to fetch property details. The listing might be private or blocked.",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", aiEnabled: !!process.env.GEMINI_API_KEY });
  });

  // AI Discovery Routes
  app.post("/api/discover/substations", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "AI Key missing" });
    const { north, south, east, west } = req.body;
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Find 10-15 actual Eskom or Municipal electrical substations in South Africa within the bounding box: North ${north}, South ${south}, East ${east}, West ${west}.
        If the search area is a broad region (like "East Rand" or "West Rand"), specifically look for major high-voltage transmission and primary distribution substations.
        Search for utility infrastructure maps, Eskom regional directories, or municipal electricity department lists.
        Return JSON: name, owner (utility like Eskom or Local Municipality), address, coordinates [lat, lng], voltageKV, mvaCapacity.` }]}],
        tools: [{ googleSearchRetrieval: {} } as any],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              substations: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    owner: { type: SchemaType.STRING },
                    address: { type: SchemaType.STRING },
                    coordinates: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER }, nullable: true },
                    voltageKV: { type: SchemaType.NUMBER },
                    mvaCapacity: { type: SchemaType.NUMBER },
                    description: { type: SchemaType.STRING }
                  },
                  required: ["name", "address"]
                }
              }
            },
            required: ["substations"]
          } as any
        }
      });
      res.json(JSON.parse(extractJson(result.response.text()) || "{}"));
    } catch (error) {
      console.error("Discovery error:", error);
      res.status(500).json({ error: "Discovery failed" });
    }
  });

  app.post("/api/discover/land", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "AI Key missing" });
    const { north, south, east, west, substationContext, linksOnly } = req.body;
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const prompt = linksOnly 
        ? `Find up to 5 direct property listing URLs for VACANT LAND or FARMS using:
           site:property24.com OR site:privateproperty.co.za
           ${north}..${south} latitude, ${west}..${east} longitude${substationContext || ""}
           REQUIREMENT: Direct URLs to detail pages only. No search results.`
        : `Search for 5 actually available VACANT LAND, UNIMPROVED PLOT, or FARM listings for sale in South Africa using:
           site:property24.com OR site:privateproperty.co.za
           Geographic Focus: Area around Latitude ${north} to ${south} and Longitude ${west} to ${east}.
           Context: ${substationContext || "Looking for properties near historical or electrical infrastructure."}
           
           STRICT REQUIREMENTS:
           1. ONLY vacant land/plots/farms. NO houses/apartments.
           2. EVERY listing MUST have a valid coordinates [lat, lng] that matches the physical address of the listing (verify via Google Maps within the grounded search).
           3. The "p24Url" field MUST contain the ORIGINAL source URL (either Property24 or Private Property).
           4. Address must include Suburb and City correctly.`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
        tools: [{ googleSearchRetrieval: {} } as any],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: linksOnly ? {
            type: SchemaType.OBJECT,
            properties: {
              links: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ["links"]
          } as any : {
            type: SchemaType.OBJECT,
            properties: {
              properties: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING, enum: ['Vacant Land', 'Agricultural'] },
                    description: { type: SchemaType.STRING },
                    p24Url: { type: SchemaType.STRING, description: "The original source URL (Property24 or Private Property)" },
                    address: {
                      type: SchemaType.OBJECT,
                      properties: {
                        suburb: { type: SchemaType.STRING },
                        city: { type: SchemaType.STRING },
                        province: { type: SchemaType.STRING },
                        country: { type: SchemaType.STRING }
                      },
                      required: ["suburb", "city"]
                    },
                    coordinates: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
                    financials: { type: SchemaType.OBJECT, properties: { purchasePrice: { type: SchemaType.NUMBER } } }
                  },
                  required: ["name", "address", "coordinates", "p24Url", "type"]
                }
              }
            },
            required: ["properties"]
          } as any
        }
      });
      res.json(JSON.parse(extractJson(result.response.text()) || "{}"));
    } catch (error) {
      console.error("Land discovery error:", error);
      res.status(500).json({ error: "Discovery failed" });
    }
  });

  app.post("/api/extract/substation", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "AI Key missing" });
    const { type, value, nameHint } = req.body;
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const prompt = nameHint
        ? `Find 8-12 actual Eskom or Municipal electrical substations in or near "${nameHint}", South Africa.
           Search for primary distribution substations and infrastructure records.
           Return JSON: name, owner, address, coordinates [lat, lng], voltageKV, mvaCapacity, description.
           Use Google Search to find real substation names.`
        : `Find technical details for South African electrical substation (${type}: ${value}). 
           Be specific. Find its exact location (Latitude, Longitude), owner (Eskom or Local Municipality), and technical specs.
           Need: Name, Address, Coordinates [lat, lng], Status, Voltage (kV), Capacity (MVA).
           Use Google Search.` ;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
        tools: [{ googleSearchRetrieval: {} } as any],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: nameHint ? {
            type: SchemaType.OBJECT,
            properties: {
              substations: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    owner: { type: SchemaType.STRING },
                    address: { type: SchemaType.STRING },
                    coordinates: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER }, nullable: true },
                    voltageKV: { type: SchemaType.NUMBER },
                    mvaCapacity: { type: SchemaType.NUMBER },
                    description: { type: SchemaType.STRING }
                  },
                  required: ["name", "address"]
                }
              }
            },
            required: ["substations"]
          } as any : {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              address: { type: SchemaType.STRING },
              coordinates: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER }, nullable: true },
              status: { type: SchemaType.STRING, enum: ['Active', 'Under Maintenance', 'Planned'] },
              capacity: { type: SchemaType.STRING },
              voltageKV: { type: SchemaType.NUMBER },
              mvaCapacity: { type: SchemaType.NUMBER },
              googleMapsUrl: { type: SchemaType.STRING }
            },
            required: ["name", "address", "status"]
          } as any
        }
      });
      res.json(JSON.parse(extractJson(result.response.text()) || "{}"));
    } catch (error) {
      console.error("Substation error:", error);
      res.status(500).json({ error: "Extraction failed" });
    }
  });

  app.post("/api/extract/property", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "AI Key missing" });
    const { input, html } = req.body;
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const promptPrefix = html 
        ? `Extract property details from this South African listing page.\nURL: ${input}\nCONTENT:\n${html.substring(0, 25000)}`
        : `Find and extract details for South African property listing: ${input}. Use Google Search.`;
      
      const parts = [{ text: `${promptPrefix}
      Extract to JSON: name, type, description, p24Url, agent, agentPhone, address, coordinates[lat, lng], specs, financials.
      STRICT PROPERTY RULES:
      1. VACANT LAND/PLOTS/FARMS only.
      2. Accurate GPS extraction. Look for "latitude", "longitude", "googleMapsUrl" or GPS comments in the source.
      3. The "p24Url" MUST be exactly the URL provided as input: ${input}
      4. Ensure Suburb and City are accurate as per the listing content.` }];

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        tools: html ? [] : [{ googleSearchRetrieval: {} } as any],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              agent: { type: SchemaType.STRING },
              agentPhone: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING, enum: ['Vacant Land', 'Agricultural'] },
              description: { type: SchemaType.STRING },
              p24Url: { type: SchemaType.STRING, description: "The original listing URL provided" },
              address: {
                type: SchemaType.OBJECT,
                properties: {
                  street: { type: SchemaType.STRING },
                  suburb: { type: SchemaType.STRING },
                  city: { type: SchemaType.STRING },
                  province: { type: SchemaType.STRING },
                  country: { type: SchemaType.STRING }
                }
              },
              coordinates: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER }, nullable: true },
              specs: { type: SchemaType.OBJECT, properties: { standSize: { type: SchemaType.NUMBER }, titleType: { type: SchemaType.STRING } } },
              financials: { type: SchemaType.OBJECT, properties: { purchasePrice: { type: SchemaType.NUMBER }, marketValue: { type: SchemaType.NUMBER } } }
            },
            required: ["name", "type", "address"]
          } as any
        }
      });
      res.json(JSON.parse(extractJson(result.response.text()) || "{}"));
    } catch (error) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: "Extraction failed" });
    }
  });

  app.post("/api/geocode", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "AI Key missing" });
    const { location } = req.body;
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Find the precise Latitude and Longitude coordinates for "${location}" in South Africa. 
        It could be a town, city, suburb, or major point of interest.
        Return JSON: name, coordinates [lat, lng], type (Suburb/City/Town/POI).
        Use Google Search to ensure accuracy.` }]}],
        tools: [{ googleSearchRetrieval: {} } as any],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING },
              coordinates: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } }
            },
            required: ["name", "coordinates"]
          } as any
        }
      });
      res.json(JSON.parse(extractJson(result.response.text()) || "{}"));
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ error: "Geocoding failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
