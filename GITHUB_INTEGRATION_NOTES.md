# GitHub Integration & Deployment Notes

This file tracks the production-ready state of PropScope and any integration requirements for external deployment.

## System Status: LOCKED
**Current Version**: 1.0 (Base System Implementation)
**Last Integrity Audit**: 2026-05-09

### Core Deploy Targets
- **Runtime**: Node.js 18+ / React 19 / Vite
- **Dependencies**: React-Leaflet, Google Generative AI (@google/genai)
- **Required Secrets**: `GEMINI_API_KEY` (MUST be set in CI/CD or Environment settings)

### Integration Rules
- **Map Stability**: The `MapComponent` uses a complex `MapController` and `MapResizeHandler` to ensure Leaflet stability within sliding React panels. Do not remove these without verifying viewport resize events.
- **AI Scope**: Grounding is strictly constrained to South African vacant land and electrical infrastructure.

### Update Log
- **2026-05-09**: 
  - System stabilized for production demo.
  - Added "Expansion" view for Spatial Catalog.
  - Enforced "Vacant Land Only" filtering in Gemini probes.
  - Resolved "Set map center and zoom first" Leaflet race conditions.
  - Refined `/api/fetch-listing` proxy to handle upstream 500/403 errors gracefully and updated headers to bypass basic scraper detection.
  - Enhanced substation modals (Edit, Review, and Map Overlay) with explicit GPS coordinates and Google Maps deep-links.
  - Enforced strict Property24 and Private Property URL retrieval in AI search and extraction logic.
  - Dynamically updated UI labels in modals and evaluation dashboards to reflect the specific listing source (Property24 vs Private Property).
  - Optimized system performance with server-side listing caching (15m TTL) and aggressive HTML cleaning to reduce AI token overhead.
  - Hardened property discovery accuracy by implementing targeted `site:` search operators for South African listing portals.
  - Migrated all AI discovery and extraction logic to the Express backend to ensure 100% reliability in production/deployed environments by leveraging server-side environment variables.
  - Hardened AI response parsing with a robust `extractJson` helper and streamlined model integration using the latest `@google/generative-ai` SDK.
  - Standardized AI search grounding to use `gemini-3-flash-preview` with broad-regional fallback logic for better substation coverage in South African metros.
