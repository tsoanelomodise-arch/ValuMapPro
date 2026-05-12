# Release Notes

- **v1.1 (2026-05-09)**: Google Maps Platform Integration.
  - Replaced Leaflet with `@vis.gl/react-google-maps` for superior spatial accuracy and Google Earth imagery.
  - Implemented Advanced Marker components for properties and substations with embedded status labels.
  - Enhanced AI grounding prompts to explicitly cross-reference Google Earth and Google Maps satellite data.
  - Added dedicated "Earth View" basemaps and a deep-link to Google Earth Web for every substation.
  - Optimized map export functionality for Google Maps canvas rendering.
  - Fixed coordinate validation and discovery bounds for 1km proximity accuracy.
  - Added persistent close/dismiss button to Discovery Mode overlay.
  - Fixed substation multi-select deletion bug where discovered (candidate) stations were not being properly removed from the spatial index.

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

- **v1.9 (2026-05-11)**: User Intelligence & Documentation.
  - Enhanced User Guide: Implemented a detailed system overview section describing the platform's focus on South African infrastructure planning and AI-grounded spatial precision.
  - Strategic Descriptions: Added clear definitions for "AI Grounding" and "Spatial Precision" within the help system to improve user onboarding.
  - Persistent UI Controls: Added a dismissable close button to the Discovery Mode overlay to allow for cleaner map visualization during spatial analysis.
  - Fixed regression where the `Globe` icon was not imported in the User Guide modal.

- **v2.0 (2026-05-11)**: Spatial Engine Restoration.
  - Reverted the map engine to Leaflet (OpenStreetMap) to ensure stability and cross-platform reliability.
  - Re-implemented high-performance Marker, Polyline, and Circle components using `react-leaflet`.
  - Optimized viewport handling: Resolved "gray tile" and rendering issues during structural index resizing.
  - Retained advanced features: Ruler measuring, 1km discovery radius visualization, and Earth View integrations remain functional within the restored engine.
  - Removed dependency on Google Maps Platform API keys to prevent service interruptions.

- **v2.1 (2026-05-11)**: UI/UX Refinement.
  - Implemented Fullscreen Mode: Re-enabled the mission-critical fullscreen toggle for the Spatial Intelligence View.
  - Restored dynamic layout: Fullscreen mode now correctly hides the Sidebar, AppHeader, and Spatial Index to maximize map real estate.
  - Improved UI Overlays: Added high-visibility toggles for measurement, satellite, and fullscreen modes in the leaflet engine.
  - Fixed regression where markers were occasionally obscured by candidate popups in high-density areas.

- **v2.2 (2026-05-11)**: Discovery Accuracy & Hallucination Prevention.
  - Hardened AI Prompts: Implemented strict verification protocols for Property24 listings to prevent the generation of non-existent URLs.
  - Search Tool Primacy: Forced the AI engine to exclusively return listings found within the active Google Search result stream.
  - Improved Data Verification: Added HTML-level availability checks during property import to identify and discard stale listings.
  - Precise Coordinate Mandate: Removed approximate coordinate jitter logic; candidates are now only accepted if high-precision GPS data is verifiable.
  - Data Utility Thresholding: Implemented a mandatory "Usable Information" filter. Any Property24 listing missing critical evaluation data (Price, Stand Size, or Description > 50 chars) is automatically discarded.
  - Hardened Extraction Schema: Forced the AI engine to treat financial and physical specification fields as "Required" to prevent the import of empty property shells.
  - Improved Proxy Diagnostics: Enhanced logging for failed proxy fetches to better distinguish between network issues and stale listings.

- **v2.6 (2026-05-12)**: Infrastructure Search Hardening.
  - Refactored AI Substation Search with "Technical Discovery Protocol" to improve reliability for niche location queries (e.g., street-level searches).
  - Implemented regional fallbacks for AI search: the system now broader its scan to the surrounding district if immediate results are sparse.
  - Hardened JSON extraction logic to prevent "Search Hallucination" on the published production build.
  - Updated UI error messaging to guide users towards more effective location queries.

- **v2.5 (2026-05-11)**: Regional Hardening & Verification Feedback.
  - Implemented strict domain-level filtering to permanently exclude `property24.co.ke` and other non-SA regions.
  - Enhanced Substation Add UI with explicit "Harvesting Coordinates" status messaging.
  - Hardened AI Extraction rules to further prioritize South African localized data.

- **v2.4 (2026-05-11)**: Multi-Source & Regional Integrity.
  - Expanded spatial catalog harvesting to include `privateproperty.co.za`.
  - Hardened regional constraints: Absolute exclusion of non-South African listings (Kenya/Nigeria) via strict URL filtering and AI prompt "locking".
  - Real-time Status Overlay: Implemented granular status reporting during the property harvesting phase (e.g., "Harvesting listing X/Y...").
  - Enhanced UI transparency: The discovery button now displays live verification steps to keep the user informed.

- **v2.3 (2026-05-11)**: Infrastructure Data Integrity.
  - Integrated Google Maps verification for all substation imports.
  - Implemented background AI Search Grounding to cross-reference and correct substation physical addresses.
  - Added real-time user notifications for technical data verification phases.
  - Hardened candidate import logic to ensure 100% address accuracy before formal inclusion in the spatial catalog.
