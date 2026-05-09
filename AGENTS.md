# PropScope Agent Rules

This project is a professional property evaluation tool for solar/electrical infrastructure in South Africa.

## Core System Architecture
- **Tech Stack**: React 19, Vite, Leaflet, Express (for API proxying), Gemini AI (Grounding).
- **AI Model**: **MUST** use `gemini-3-flash-preview` for search grounding. It has proven significantly more reliable for finding South African property and substation data than older models.
- **Coordinate Handling**: Always verify coordinates are valid arrays `[lat, lng]` before using them in map functions.
- **Vite Setup**: The map uses `react-leaflet`. Ensure container size is controlled during sliding animations to prevent leaflet "gray tiles" or viewport issues.

## Environment Variables
- `GEMINI_API_KEY`: Required for AI search and data extraction.

## Critical UX Patterns
- **Sliding Panels**: The `SpatialCatalog` uses a width-based transition. Do not use `transform: translateX` if accurate bounds calculations are needed on the map during the animation.
- **Substation Search**: Uses Gemini with the `googleSearch` tool. Be descriptive in prompts to get specific kV/MVA ratings.
