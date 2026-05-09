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
