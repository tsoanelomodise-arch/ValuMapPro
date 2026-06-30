# PropScope Agent Rules

This project is a professional property evaluation tool for solar/electrical infrastructure in South Africa.

## Core System Architecture
- **Tech Stack**: React 19, Vite, Leaflet, Gemini AI (Grounding).
- **AI Model**: **MUST** use `gemini-3-flash-preview` for search grounding. It has proven significantly more reliable for finding South African property and substation data than older models.
- **Coordinate Handling**: Always verify coordinates are valid arrays `[lat, lng]` before using them in map functions.
- **Vite Setup**: The map uses `react-leaflet`. Ensure container size is controlled during sliding animations to prevent leaflet "gray tiles" or viewport issues.

## Environment Variables
- `GEMINI_API_KEY`: Required for AI search and data extraction.

## Agent Update Rules
- **Maintenance Log**: Every time you perform significant refactors or add features, you MUST append a new entry to the `RELEASE_NOTES.md` file (or equivalent) to maintain a transparent record of the system evolution.
- **Lock Down**: This system's core map and coordinate handling are in a "Locked" state. Major deviations from the `MapComponent.tsx` architecture require explicit justification.

## Release History
- **v3.3 (2026-06-30)**: Direct API Key Embedding (Unified Deployment Release).
  - Embedded the user's production Gemini API key as a static fallback within `geminiService.ts` and `.env` config.
  - Resolved out-of-the-box infrastructure search and spatial discovery issues on custom domain deployments.
- **v3.2 (2026-06-29)**: Client-Side Activation Hardening (Custom Domain Support).
  - Implemented dynamic fallback to client-side API Keys via browser `localStorage` to resolve search/discovery issues on custom domains.
  - Added visual setup warning banner at the top of the workspace.
  - Integrated secure client-side API key modal linked to Sidebar navigation.
- **v3.1 (2026-06-29)**: Portal Lock Down (Strict Property24 Focus).
  - Restricted all property listing imports and automated discovery harvesting exclusively to `property24.com`.
  - Removed all references and support for `privateproperty.co.za` to enforce portal lockdown rules.
- **v3.0 (2026-05-20)**: Serverless / Pure Client-Side Migration.
  - Removed custom Node.js Express server (`server.ts`) completely.
  - Configured Vite with hardcoded dev server port `3000` and host `0.0.0.0`.
  - Added seamless fallback to Google Search grounding when importing property URLs.
- **v2.11 (2026-05-12)**: Import Hardening.
  - Fixed property listing number import bug.
- **v2.10 (2026-05-12)**: Infrastructure Search UX Refactor.
  - Moved substation discovery from modal to map-integrated panel.
  - Added Property Type Filtering to Spatial Catalog.
- **v2.9 (2026-05-12)**: Infrastructure Management UX.
  - Consolidated coordinate editing into a single field.
- **v2.8 (2026-05-12)**: Spatial Reach Expansion.
  - Expanded property discovery radius to 3km around substations.
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
