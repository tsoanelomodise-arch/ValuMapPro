import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property, Substation, PROPERTY_TYPE_COLORS, SUBSTATION_COLOR } from '../../types';
import { 
  X, 
  Zap, 
  Plus,
  Maximize2, 
  Minimize2, 
  Scaling,
  Layers,
  Map as MapIcon,
  FileDown,
  Mountain,
  Globe,
  Compass,
  Search,
  EyeOff
} from 'lucide-react';
import { cn, calculateDistance } from '../../lib/utils';
import MapDetailsOverlay from './MapDetailsOverlay';
import ExportSelectionOverlay from './ExportSelectionOverlay';
import SubstationSearchPanel from './SubstationSearchPanel';

// Fix for default marker icons
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Override default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapComponentProps {
  properties: Property[];
  substations?: Substation[];
  candidateSubstations?: Substation[];
  candidateProperties?: Property[];
  onSelectProperty: (property: Property) => void;
  selectedProperty: Property | null;
  onSelectSubstation?: (substation: Substation) => void;
  selectedSubstation?: Substation | null;
  onAddSubstation?: (substation: Substation) => void;
  onDeleteCandidateSubstation?: (id: string) => void;
  onAddProperty?: (property: Property) => void;
  onDeleteCandidateProperty?: (id: string) => void;
  onDiscoverNearby?: (bounds: { north: number, south: number, east: number, west: number }) => void;
  onDiscoverLand?: (bounds: { north: number, south: number, east: number, west: number }) => void;
  onCancelDiscovery?: () => void;
  onClearCandidates?: () => void;
  isDiscovering?: boolean;
  isDiscoveringLand?: boolean;
  discoveryProgress?: { current: number, total: number, status?: string } | null;
  rulerActive: boolean;
  onRulerActiveChange: (active: boolean) => void;
  onOpenDetails?: (property: Property) => void;
  isFullscreen: boolean;
  onFullscreenChange: (fullscreen: boolean) => void;
  mapCenterOverride?: [number, number] | null;
  isSubstationSearchOpen?: boolean;
  onSubstationSearchClose?: () => void;
}

// Map Event handlers for Leaflet
function MapEvents({ onMove }: { onMove: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onMove(map.getBounds());
    }
  });
  return null;
}

// Controller for map movement
function MapController({ center, zoom }: { center: [number, number], zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0])) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapComponent(props: MapComponentProps) {
  const {
    properties,
    substations = [],
    candidateSubstations = [],
    candidateProperties = [],
    onSelectProperty,
    selectedProperty,
    onSelectSubstation,
    selectedSubstation,
    onAddSubstation,
    onDeleteCandidateSubstation,
    onAddProperty,
    onDeleteCandidateProperty,
    rulerActive,
    onRulerActiveChange,
    onOpenDetails,
    isFullscreen,
    onFullscreenChange,
    onDiscoverNearby,
    onDiscoverLand,
    onCancelDiscovery,
    onClearCandidates,
    isDiscovering,
    isDiscoveringLand,
    discoveryProgress,
    mapCenterOverride,
    isSubstationSearchOpen = false,
    onSubstationSearchClose
  } = props;

  const [selectedBasemapId, setSelectedBasemapId] = useState<'streets' | 'satellite' | 'terrain' | 'hybrid'>('streets');
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

  // Sync with prop if it changes
  useEffect(() => {
    if (isSubstationSearchOpen) {
      setIsSearchPanelOpen(true);
    }
  }, [isSubstationSearchOpen]);

  // Notify parent when closed locally
  const handleCloseSearch = () => {
    setIsSearchPanelOpen(false);
    onSubstationSearchClose?.();
  };
  const [rulerPoints, setRulerPoints] = useState<[number, number][]>([]);
  const [rulerDistance, setRulerDistance] = useState<number | null>(null);
  const [showDiscoveryOverlay, setShowDiscoveryOverlay] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  // Basemap URLs
  const basemaps = {
    streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    hybrid: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
  };

  const initialCenter: [number, number] = useMemo(() => {
    if (selectedProperty) return [selectedProperty.coordinates[0], selectedProperty.coordinates[1]];
    if (properties.length > 0) return [properties[0].coordinates[0], properties[0].coordinates[1]];
    return [-26.1311, 28.0536]; // Johannesburg
  }, []);

  const currentCenter: [number, number] = useMemo(() => {
    if (mapCenterOverride) return mapCenterOverride;
    if (selectedProperty) return [selectedProperty.coordinates[0], selectedProperty.coordinates[1]];
    if (selectedSubstation) return [selectedSubstation.coordinates[0], selectedSubstation.coordinates[1]];
    return initialCenter;
  }, [selectedProperty, selectedSubstation, mapCenterOverride, initialCenter]);

  // Distance calculations for property-substation lines
  const propertyDistances = useMemo(() => {
    if (substations.length === 0) return [];
    const allProps = [...properties, ...candidateProperties];
    return allProps.map(property => {
      let minDistance = Infinity;
      let closestSub = substations[0];
      substations.forEach(sub => {
        const d = calculateDistance(property.coordinates[0], property.coordinates[1], sub.coordinates[0], sub.coordinates[1]);
        if (d < minDistance) {
          minDistance = d;
          closestSub = sub;
        }
      });
      return { property, substation: closestSub, distance: minDistance };
    });
  }, [properties, candidateProperties, substations]);

  // Create custom icons
  const createSubstationIcon = (sub: Substation, isSelected: boolean) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex items-center justify-center ${isSelected ? 'scale-125' : 'hover:scale-110'} transition-all duration-300">
          <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full blur-md ${isSelected ? 'animate-pulse' : ''}"></div>
          <svg width="24" height="34" viewBox="0 0 24 34" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2))">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="${SUBSTATION_COLOR}" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="3.5" fill="white" opacity="0.9"/>
          </svg>
          <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded border border-blue-200 shadow-sm whitespace-nowrap">
            <span class="text-[8px] font-bold text-blue-700 uppercase tracking-tighter">${sub.name}</span>
          </div>
        </div>
      `,
      iconSize: [24, 34],
      iconAnchor: [12, 34],
    });
  };

  const createPropertyIcon = (prop: Property, isSelected: boolean, dist?: string, price?: string) => {
    const color = PROPERTY_TYPE_COLORS[prop.type] || '#4285F4';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex flex-col items-center ${isSelected ? 'scale-125' : 'hover:scale-110'} transition-all duration-300">
          <svg width="24" height="34" viewBox="0 0 24 34" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2))">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="3.5" fill="white" opacity="0.9"/>
          </svg>
          <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center gap-0.5 w-[100px]">
            <div class="px-1 py-0 bg-white/80 rounded backdrop-blur-sm border border-slate-100 shadow-sm text-center">
              <span class="text-[7px] font-bold uppercase whitespace-nowrap block truncate leading-tight" style="color: ${color}">${prop.name}</span>
            </div>
            ${dist || price ? `
              <div class="flex gap-1 justify-center">
                ${dist ? `<span class="text-[7px] font-black italic text-red-600 bg-white/90 px-1 rounded shadow-sm">${dist}</span>` : ''}
                ${price ? `<span class="text-[7px] font-bold text-slate-700 bg-white/90 px-1 rounded shadow-sm">${price}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `,
      iconSize: [24, 34],
      iconAnchor: [12, 34],
    });
  };

  const createCandidateIcon = (item: any, isProperty: boolean, isSelected: boolean) => {
    const color = isProperty ? '#059669' : '#475569';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative group cursor-pointer ${isSelected ? 'scale-110' : ''}">
           <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-500/20 rounded-full blur-md animate-pulse"></div>
           <svg width="24" height="34" viewBox="0 0 24 34" fill="none" style="filter: drop-shadow(0 2px 10px rgba(0,0,0,0.3))" class="relative z-10 transition-transform group-hover:scale-110">
              <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="${color}" stroke="white" stroke-width="2"/>
              <path d="M12 8V16M8 12H16" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
           </svg>
           <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 z-10 max-w-[100px] text-center">
              <span class="text-[8px] font-black uppercase whitespace-nowrap block truncate ${isProperty ? 'text-emerald-700' : 'text-slate-700'}">${item.name}</span>
           </div>
        </div>
      `,
      iconSize: [24, 34],
      iconAnchor: [12, 34],
    });
  };

  const handleDiscover = () => {
    if (!mapRef.current || !onDiscoverNearby) return;
    const bounds = mapRef.current.getBounds();
    onDiscoverNearby({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    });
  };

  const handleRulerClick = (e: L.LeafletMouseEvent) => {
    if (!rulerActive) return;
    const { lat, lng } = e.latlng;
    setRulerPoints(prev => {
      const next: [number, number][] = [...prev, [lat, lng]];
      if (next.length >= 2) {
        const d = calculateDistance(next[0][0], next[0][1], next[1][0], next[1][1]);
        setRulerDistance(d);
        return [next[0], next[1]]; // Keep two points for simple line
      }
      return next;
    });
  };

  const RulerEvents = () => {
    useMapEvents({
      click: handleRulerClick
    });
    return null;
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      {isSearchPanelOpen && (
        <SubstationSearchPanel 
          onAdd={onAddSubstation ? (data) => {
            if (data.payload) {
              if (Array.isArray(data.payload)) {
                data.payload.forEach(s => onAddSubstation(s));
              } else {
                onAddSubstation(data.payload);
              }
            }
          } : () => {}}
          onClose={handleCloseSearch}
          isSubmitting={false}
        />
      )}
      <MapContainer 
        center={initialCenter} 
        zoom={13} 
        scrollWheelZoom={true}
        className="w-full h-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={basemaps[selectedBasemapId]}
        />
        
        <MapController center={currentCenter} />
        {rulerActive && <RulerEvents />}

        {/* Existing Substations */}
        {substations.map(sub => (
          <Marker 
            key={sub.id} 
            position={[sub.coordinates[0], sub.coordinates[1]]}
            icon={createSubstationIcon(sub, selectedSubstation?.id === sub.id)}
            eventHandlers={{
              click: () => onSelectSubstation?.(sub)
            }}
          />
        ))}

        {/* Existing Properties */}
        {properties.map(p => {
          const distInfo = propertyDistances.find(d => d.property.id === p.id);
          return (
            <Marker 
              key={p.id} 
              position={[p.coordinates[0], p.coordinates[1]]}
              icon={createPropertyIcon(
                p, 
                selectedProperty?.id === p.id, 
                distInfo ? `${distInfo.distance.toFixed(1)}km` : undefined,
                p.financials?.purchasePrice ? `R${(p.financials.purchasePrice / 1000000).toFixed(1)}M` : undefined
              )}
              eventHandlers={{
                click: () => onSelectProperty(p)
              }}
            />
          );
        })}

        {/* Candidate Substations */}
        {candidateSubstations.map(sub => (
          <Marker 
            key={sub.id}
            position={[sub.coordinates[0], sub.coordinates[1]]}
            icon={createCandidateIcon(sub, false, selectedSubstation?.id === sub.id)}
            eventHandlers={{
              click: () => onSelectSubstation?.(sub)
            }}
          >
            <Popup className="candidate-popup">
              <div className="p-3 min-w-[200px]">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                     <Zap className="w-3.5 h-3.5 text-slate-400" />
                   </div>
                   <div>
                     <p className="font-black text-xs m-0 text-slate-900 uppercase tracking-tight leading-none">{sub.name}</p>
                     <p className="text-[8px] text-slate-400 m-0 uppercase font-bold tracking-widest mt-1">Discovery Listing</p>
                   </div>
                 </div>
                 <div className="flex flex-col gap-2 mt-4">
                   <button 
                     onClick={() => onAddSubstation?.(sub)}
                     className="w-full bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                   >
                     Confirm & Import
                   </button>
                   <button 
                     onClick={() => onDeleteCandidateSubstation?.(sub.id)}
                     className="w-full bg-white border border-slate-200 text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                   >
                     Discard
                   </button>
                 </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Candidate Properties */}
        {candidateProperties.map(p => (
           <Marker 
            key={p.id}
            position={[p.coordinates[0], p.coordinates[1]]}
            icon={createCandidateIcon(p, true, selectedProperty?.id === p.id)}
            eventHandlers={{
              click: () => onSelectProperty(p)
            }}
          >
            <Popup className="candidate-popup">
               <div className="p-3 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Mountain className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-black text-xs m-0 text-slate-900 uppercase tracking-tight leading-none">{p.name}</p>
                      <p className="text-[8px] text-slate-400 m-0 uppercase font-bold tracking-widest mt-1">Discovery Listing</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <button 
                      onClick={() => onAddProperty?.(p)}
                      className="w-full bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Confirm & Import
                    </button>
                    <button 
                      onClick={() => onDeleteCandidateProperty?.(p.id)}
                      className="w-full bg-white border border-slate-200 text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Discard
                    </button>
                  </div>
               </div>
            </Popup>
          </Marker>
        ))}

        {/* Distance Lines */}
        {!rulerActive && propertyDistances.map(d => (
           <Polyline 
             key={`line-${d.property.id}`}
             positions={[
               [d.property.coordinates[0], d.property.coordinates[1]],
               [d.substation.coordinates[0], d.substation.coordinates[1]]
             ]}
             color="#4285F4"
             opacity={0.6}
             weight={1}
             interactive={false}
           />
        ))}

        {/* Search Accuracy Grid Mask (Simulated radius) */}
        {selectedSubstation && (
           <Circle 
             center={[selectedSubstation.coordinates[0], selectedSubstation.coordinates[1]]}
             radius={1000} // 1km target radius
             fillColor="#4F46E5"
             fillOpacity={0.05}
             color="#4F46E5"
             opacity={0.2}
             weight={1}
             interactive={false}
           />
        )}

        {/* Ruler Line */}
        {rulerActive && rulerPoints.length === 2 && (
           <Polyline 
             positions={rulerPoints}
             color="#EF4444"
             weight={3}
             opacity={1}
           />
        )}
      </MapContainer>

      {/* UI Overlays */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-1 flex items-center">
            <button 
              onClick={() => setSelectedBasemapId('streets')}
              className={cn("p-2 rounded-xl transition-all", selectedBasemapId === 'streets' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}
              title="Standard View"
            >
              <MapIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSelectedBasemapId('hybrid')}
              className={cn("p-2 rounded-xl transition-all", selectedBasemapId === 'hybrid' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}
              title="Satellite"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSelectedBasemapId('terrain')}
              className={cn("p-2 rounded-xl transition-all", selectedBasemapId === 'terrain' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}
              title="Terrain"
            >
              <Mountain className="w-5 h-5" />
            </button>
        </div>

        <button 
          onClick={() => onRulerActiveChange(!rulerActive)}
          className={cn(
            "p-3 rounded-2xl shadow-xl border transition-all flex items-center justify-center",
            rulerActive ? "bg-red-600 text-white border-red-500 animate-pulse" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
          title="Measurement Tool"
        >
          <Scaling className="w-5 h-5" />
        </button>

        <button 
          onClick={() => {
            const center = currentCenter;
            const url = `https://earth.google.com/web/search/${center[0]},${center[1]}`;
            window.open(url, '_blank');
          }}
          className="p-3 rounded-2xl shadow-xl border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center justify-center"
          title="Open in Google Earth"
        >
          <Compass className="w-5 h-5" />
        </button>

        <button 
          onClick={() => onFullscreenChange(!isFullscreen)}
          className="p-3 rounded-2xl shadow-xl border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center justify-center"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Discovery Trigger Overlay */}
      {showDiscoveryOverlay && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] group">
          <div className="relative bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 flex items-center gap-6 min-w-[400px]">
            {/* Close button for the overlay */}
            <button 
              onClick={() => {
                setShowDiscoveryOverlay(false);
                onCancelDiscovery?.();
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              title="Dismiss Discovery Overlay"
            >
              <X className="w-3.5 h-3.5" />
            </button>

          <div className="flex flex-col">
            <span className="text-[10px] font-black italic text-indigo-600 uppercase tracking-widest mb-1">Discovery Mode</span>
            <div className="flex items-center gap-2">
               <Zap className={cn("w-4 h-4", isDiscovering ? "text-indigo-500 animate-pulse" : "text-slate-400")} />
               <div className="flex flex-col">
                 <span className="text-sm font-black text-slate-800 tracking-tight leading-none">
                   {isDiscovering ? 'Scanning for Substations...' : 'Spatial Catalog Explorer'}
                 </span>
                 <span className="text-[10px] text-slate-500 font-medium">Advanced Infrastructure Discovery</span>
               </div>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-200" />

          <div className="flex gap-2">
            {!isDiscovering ? (
              <div className="flex gap-2">
                <button 
                  onClick={handleDiscover}
                  className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-200"
                  title="Scan map area"
                >
                  <Search className="w-4 h-4 text-indigo-400" />
                  Scanner
                </button>
                <button 
                  onClick={() => setIsSearchPanelOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                >
                  <Plus className="w-4 h-4" />
                  Search By Name
                </button>
              </div>
            ) : (
              <button 
                onClick={onCancelDiscovery}
                className="bg-red-50 text-red-600 border border-red-100 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-red-100"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}

            {(candidateSubstations.length > 0 || candidateProperties.length > 0) && (
              <button 
                onClick={onClearCandidates}
                className="bg-white border border-slate-200 text-slate-500 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <EyeOff className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {rulerActive && rulerDistance && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000]">
           <div className="bg-red-600 text-white px-4 py-2 rounded-full shadow-2xl font-black text-sm flex items-center gap-3 border-2 border-white/20">
              <Scaling className="w-4 h-4" />
              <span>MEASUREMENT: {rulerDistance.toFixed(2)} KM</span>
              <button onClick={() => { setRulerPoints([]); setRulerDistance(null); }} className="hover:bg-red-500 rounded p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
           </div>
        </div>
      )}

      <MapDetailsOverlay 
        property={selectedProperty}
        substation={selectedSubstation}
        closestSubstationInfo={selectedProperty ? propertyDistances.find(d => d.property.id === selectedProperty.id) || null : null}
        isFullscreen={isFullscreen}
        onCloseProperty={() => onSelectProperty(null as any)}
        onCloseSubstation={() => onSelectSubstation?.(null as any)}
        onOpenDetails={onOpenDetails || (() => {})}
        onDiscoverLand={onDiscoverLand}
        isDiscoveringLand={isDiscoveringLand}
        discoveryProgress={discoveryProgress}
      />
    </div>
  );
}
