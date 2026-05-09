# Release Notes

- **v1.1 (2026-05-09)**: Google Maps Platform Integration.
  - Replaced Leaflet with `@vis.gl/react-google-maps` for superior spatial accuracy and Google Earth imagery.
  - Implemented Advanced Marker components for properties and substations with embedded status labels.
  - Enhanced AI grounding prompts to explicitly cross-reference Google Earth and Google Maps satellite data.
  - Added dedicated "Earth View" basemaps and a deep-link to Google Earth Web for every substation.
  - Optimized map export functionality for Google Maps canvas rendering.
  - Fixed coordinate validation and discovery bounds for 1km proximity accuracy.
  - Added persistent close/dismiss button to Discovery Mode overlay.

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

- **v1.5 (2026-05-09)**: Source Exclusive Discovery.
  - Restricted Property Discovery to Property24 only: Removed secondary portal integration from automated search prompts.
  - Optimized AI grounding for P24 listing structures.
  - Standardized URL extraction to ignore non-P24 candidates during broad spatial catalog scans.

- **v1.6 (2026-05-09)**: Spatial Discovery Precision.
  - Reduced Property Discovery radius to 1km around selected substations for high-density accuracy.
  - Visualized Discovery Area: Added a synchronized 1km visual radius ring on the map during land scans.
  - Maintained Substation Discovery: Kept infrastructure discovery parameters at full regional scale while tightening land search focus.

- **v1.8 (2026-05-10)**: System Stability & Core Refactor.
  - Core Refactoring: Performed major architectural cleanup of `App.tsx` by extracting several features into custom hooks (`useDiscovery`, `useImport`, `useNotifications`).
  - AI Service Optimization: Standardized all AI requests through a unified `generateAIContent` helper, reducing code repetition and improving error handling.
  - Search Hardening: Enforced strict `property24.com` filtering across all discovery and textual search tools. Explicitly excluded `property24.co.ke` (Kenya) via code-level filters and updated prompts to maintain South African regional focus.
  - Availability Guard: Implemented automatic detection and exclusion of Property24 listings that are no longer available.
  - Spatial Precision: Strictly reduced land discovery focus to a 1km visual and algorithmic radius from selected substations.
  - Substation Discovery Hardening: Implemented strict coordinate validation and bounding-box filtering for substation discovery to prevent "off-map" placements.
  - Coordinate Correction: Improved heuristic for detecting and fixing swapped or signed-incorrect coordinates from AI models.
  - Improved State Management: Moved persistence logic into separate hooks and stabilized geocoding-led discovery flows.
  - Notification System: Robust notification bus for asynchronous AI feedback.
  - Clean Code Initiative: Removed dead code and standardized coordinated-handling across the stack.

- **v1.7 (2026-05-09)**: Unified Location & Property Search.
  - Enhanced Global Search: The location search bar now automatically triggers a property discovery scan for the geocoded area.
  - Implemented textual property discovery: Users can search for land by suburb or city name, matching the core Property24 user experience.
  - Added notification feedback: Provides real-time status on geocoding and the number of properties discovered in the target locale.
