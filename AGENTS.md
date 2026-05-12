# PropScope Agent Rules

This project is a professional property evaluation tool for solar/electrical infrastructure in South Africa.

## Core System Architecture
- **Tech Stack**: React 19, Vite, Leaflet, Express (for API proxying), Gemini AI (Grounding).
- **AI Model**: **MUST** use `gemini-3-flash-preview` for search grounding. It has proven significantly more reliable for finding South African property and substation data than older models.
- **Coordinate Handling**: Always verify coordinates are valid arrays `[lat, lng]` before using them in map functions.
- **Vite Setup**: The map uses `react-leaflet`. Ensure container size is controlled during sliding animations to prevent leaflet "gray tiles" or viewport issues.

## Environment Variables
- `GEMINI_API_KEY`: Required for AI search and data extraction.

## Agent Update Rules
- **Maintenance Log**: Every time you perform significant refactors or add features, you MUST append a new entry to the `RELEASE_NOTES.md` file (or equivalent) to maintain a transparent record of the system evolution.
- **Lock Down**: This system's core map and coordinate handling are in a "Locked" state. Major deviations from the `MapComponent.tsx` architecture require explicit justification.

## Release History
- **v2.7 (2026-05-12)**: Clean Slate Deployment.
  - Removed all mock data from initial state.
  - Switched Reset to Clear Catalog (complete wipe).
- **v2.6 (2026-05-12)**: Infrastructure Search Hardening.
  - Hardened AI Substation search grounding.
  - Implemented "Technical Discovery Protocol" for niche areas.
- **v2.4 (2026-05-11)**: Multi-Source Regional Lockdown.
  - Integrated `privateproperty.co.za` support.
  - Hardened South African regional filters for all harvesting operations.
  - Added real-time discovery status reporting.
  - Implemented Google Maps verification for infrastructure imports.
