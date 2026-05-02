
export interface AISubstation {
  name: string;
  address: string;
  coordinates: [number, number];
  description?: string;
  voltageKV?: number;
  mvaCapacity?: number;
}

export async function searchSubstations(area: string): Promise<AISubstation[]> {
  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Find real-world Eskom electrical substations located in or around the area: ${area}. 
        Return a list of substations with their names, approximate physical addresses, and precise GPS coordinates (Latitude, Longitude).
        MAKE A SPECIAL EFFORT to find the Operating Voltage (in kV) and Rated Capacity (in MVA) for each.
        Focus on major distribution and transmission substations.`,
        schema: {
          type: "OBJECT",
          properties: {
            substations: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  address: { type: "STRING" },
                  coordinates: {
                    type: "ARRAY",
                    items: { type: "NUMBER" }
                  },
                  description: { type: "STRING" },
                  voltageKV: { type: "NUMBER" },
                  mvaCapacity: { type: "NUMBER" }
                },
                required: ["name", "address", "coordinates"]
              }
            }
          },
          required: ["substations"]
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to search substations");
    }

    const result = await response.json();
    return result.substations || [];
  } catch (error) {
    console.error("Error searching substations with AI:", error);
    return [];
  }
}
