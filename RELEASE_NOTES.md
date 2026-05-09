# Release Notes

- **v1.0 (2026-05-09)**: Initial System Lockdown. 
  - Fixed Leaflet "center/zoom" initialization racing errors.
  - Restricted AI Discovery tools to Vacant Land, Plots, and Farms.
  - Implemented Wide/Narrow toggle for Spatial Catalog.
  - Added coordinate validation safeguards.

- **v1.1 (2026-05-09)**: AI Infrastructure Hardening.
  - Upgraded server-side AI to `@google/generative-ai` for improved reliability.
  - Fixed "Empty Substation" discovery errors by refining search grounding prompts for regional South African areas (East Rand, etc.).
  - Implemented `extractJson` fallback to handle markdown markers in model outputs.
  - Relaxed metadata requirements for substations to prevent extraction failures on low-data candidates.

- **v1.2 (2026-05-09)**: Cross-Portal Integration Fixes.
  - Enabled support for `privateproperty.co.za` URLs in the main property import module.
  - Standardized listing number extraction to handle both Property24 and Private Property URL patterns.
  - Corrected UI labels and validation alerts to reflect multi-portal support (P24 + PP).

- **v1.3 (2026-05-09)**: Geographic Accuracy & URL Integrity.
  - Hardened AI prompts to strictly enforce coordinate-listing-address consistency.
  - Implemented `coordinatesFlag` to identify and warn users of approximated locations in the UI.
  - Fixed portal branding persistence: Original source URLs (P24 vs PP) are now preserved and correctly labeled in the UI.
  - Optimized Sebenza Substation discovery area handling with stricter physical address grounding.

- **v1.4 (2026-05-09)**: Geographic Search Expansion.
  - Implemented Global Location Search: Users can now search for specific Towns, Cities, or Suburbs.
  - Integrated AI-powered Geocoding: Uses Gemini 3 Flash to resolve coordinates for any South African location.
  - Enhanced Header UI: Added a dedicated location search bar next to the catalog filter.
  - Refactored Map Controller: Smooth transitions and center overrides for precise geographic navigation.
