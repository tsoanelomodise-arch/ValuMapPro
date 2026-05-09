import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef,
  ControlPosition,
  MapControl
} from '@vis.gl/react-google-maps';
import { Property, Substation, PROPERTY_TYPE_COLORS, SUBSTATION_COLOR } from '../../types';
import { 
  Ruler, 
  X, 
  Navigation2, 
  Zap, 
  Check,
  Maximize2, 
  Minimize2, 
  Home,
  Scaling,
  Layers,
  Map as MapIcon,
  ExternalLink,
  FileDown,
  Mountain,
  Settings2,
  ListFilter,
  Eye,
  EyeOff,
  Globe,
  Compass,
  Search
} from 'lucide-react';
import { cn, calculateDistance } from '../../lib/utils';
import MapDetailsOverlay from './MapDetailsOverlay';
import ExportSelectionOverlay from './ExportSelectionOverlay';
import { Polyline } from './Polyline';
import { Circle } from './Circle';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const CLASSIC_RED = '#EA4335';
const ATTRIBUTION = 'gmp_mcp_codeassist_v1_aistudio';

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
  rulerActive: boolean;
  onRulerActiveChange: (active: boolean) => void;
  onOpenDetails?: (property: Property) => void;
  isFullscreen: boolean;
  onFullscreenChange: (fullscreen: boolean) => void;
  mapCenterOverride?: [number, number] | null;
}

// Substation Marker Component
interface SubstationMarkerProps {
  key?: string;
  substation: Substation;
  isSelected: boolean;
  onSelect?: (s: Substation) => void;
}

const SubstationMarker = ({ 
  substation, 
  isSelected, 
  onSelect 
}: SubstationMarkerProps) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: substation.coordinates[0], lng: substation.coordinates[1] }}
        onClick={() => {
          onSelect?.(substation);
          setInfoWindowOpen(true);
        }}
        zIndex={isSelected ? 1000 : 500}
      >
        <div className={cn(
          "relative flex items-center justify-center transition-all duration-300",
          isSelected ? "scale-125" : "hover:scale-110"
        )}>
          <div className="absolute w-8 h-8 bg-blue-500/20 rounded-full blur-md animate-pulse" />
          <svg width="24" height="34" viewBox="0 0 24 34" fill="none" className="drop-shadow-lg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37 18.63 0 12 0Z" fill={SUBSTATION_COLOR} stroke="white" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="3.5" fill="white" opacity="0.9"/>
          </svg>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded border border-blue-200 shadow-sm whitespace-nowrap">
            <span className="text-[8px] font-bold text-blue-700 uppercase tracking-tighter">{substation.name}</span>
          </div>
        </div>
      </AdvancedMarker>
      {infoWindowOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoWindowOpen(false)}>
          <div className="p-1 min-w-[140px]">
             <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-blue-600" />
                <p className="font-bold text-sm leading-none m-0 text-slate-900 uppercase tracking-tight">{substation.name}</p>
              </div>
              <p className="text-[10px] text-slate-500 m-0 uppercase font-bold tracking-widest">{substation.status}</p>
              <p className="text-[11px] text-slate-400 m-0 mt-2 italic">{substation.address}</p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex gap-2">
                <a 
                  href={`https://earth.google.com/web/search/${substation.coordinates[0]},${substation.coordinates[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-black text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <Globe className="w-2.5 h-2.5" />
                  Earth View
                </a>
              </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

// Property Marker Component
interface PropertyMarkerProps {
  key?: string;
  property: Property;
  isSelected: boolean;
  onSelect: (p: Property) => void;
  distanceLabel?: string;
  priceLabel?: string;
}

const PropertyMarker = ({ 
  property, 
  isSelected, 
  onSelect,
  distanceLabel,
  priceLabel
}: PropertyMarkerProps) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const color = PROPERTY_TYPE_COLORS[property.type] || '#4285F4';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: property.coordinates[0], lng: property.coordinates[1] }}
        onClick={() => {
          onSelect(property);
          setInfoWindowOpen(true);
        }}
        zIndex={isSelected ? 1100 : 600}
      >
        <div className={cn(
          "relative flex flex-col items-center transition-all duration-300",
          isSelected ? "scale-125" : "hover:scale-110"
        )}>
          <svg width="24" height="34" viewBox="0 0 24 34" fill="none" className="drop-shadow-lg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37 18.63 0 12 0Z" fill={color} stroke="white" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="3.5" fill="white" opacity="0.9"/>
          </svg>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center gap-0.5 w-[100px]">
            <div className="px-1 py-0 bg-white/80 rounded backdrop-blur-sm border border-slate-100 shadow-sm text-center">
              <span className="text-[7px] font-bold uppercase whitespace-nowrap block truncate leading-tight" style={{ color }}>{property.name}</span>
            </div>
            {(distanceLabel || priceLabel) && (
               <div className="flex gap-1 justify-center">
                  {distanceLabel && <span className="text-[7px] font-black italic text-red-600 bg-white/90 px-1 rounded shadow-sm">{distanceLabel}</span>}
                  {priceLabel && <span className="text-[7px] font-bold text-slate-700 bg-white/90 px-1 rounded shadow-sm">{priceLabel}</span>}
               </div>
            )}
          </div>
        </div>
      </AdvancedMarker>
      {infoWindowOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoWindowOpen(false)}>
           <div className="p-1 min-w-[140px]">
              <p className="font-bold text-sm m-0 text-slate-900">{property.name}</p>
              <p className="text-[10px] text-slate-500 m-0 uppercase font-bold">{property.type}</p>
              <p className="text-[11px] text-slate-400 m-0 mt-1">{property.address.suburb}, {property.address.city}</p>
              <a 
                href={`https://www.google.com/maps?q=${property.coordinates[0]},${property.coordinates[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-bold text-blue-600 mt-2 block"
              >
                View on Google Maps
              </a>
           </div>
        </InfoWindow>
      )}
    </>
  );
};

// Candidate Marker Component
interface CandidateMarkerProps {
  key?: string;
  item: Property | Substation;
  isProperty: boolean;
  isSelected: boolean;
  onAdd: (item: any) => void;
  onDelete: (id: string) => void;
}

const CandidateMarker = ({
  item,
  isProperty,
  isSelected,
  onAdd,
  onDelete
}: CandidateMarkerProps) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const color = isProperty ? '#059669' : '#475569';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: item.coordinates[0], lng: item.coordinates[1] }}
        onClick={() => setInfoWindowOpen(true)}
        zIndex={isSelected ? 1050 : 550}
      >
        <div className="relative group cursor-pointer">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-500/20 rounded-full blur-md animate-pulse" />
           <svg width="24" height="34" viewBox="0 0 24 34" fill="none" className="drop-shadow-2xl relative z-10 transition-transform group-hover:scale-110">
              <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37 18.63 0 12 0Z" fill={color} stroke="white" strokeWidth="2"/>
              <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
           </svg>
           <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 z-10 max-w-[100px] text-center">
              <span className={cn("text-[8px] font-black uppercase whitespace-nowrap block truncate", isProperty ? "text-emerald-700" : "text-slate-700")}>{item.name}</span>
           </div>
        </div>
      </AdvancedMarker>
      {infoWindowOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoWindowOpen(false)}>
           <div className="p-3 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", isProperty ? "bg-emerald-50" : "bg-slate-100")}>
                  {isProperty ? <Mountain className="w-3.5 h-3.5 text-emerald-600" /> : <Zap className="w-3.5 h-3.5 text-slate-400" />}
                </div>
                <div>
                  <p className="font-black text-xs m-0 text-slate-900 uppercase tracking-tight leading-none">{item.name}</p>
                  <p className="text-[8px] text-slate-400 m-0 uppercase font-bold tracking-widest mt-1">Discovery Listing</p>
                </div>
              </div>
              
              <div className="space-y-1 mb-4">
                <p className="text-[10px] text-slate-500 m-0 leading-relaxed italic">
                  {isProperty ? (item as Property).address.suburb : (item as Substation).address}
                </p>
                {isProperty && (item as Property).financials?.purchasePrice && (
                    <p className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                      R {((item as Property).financials!.purchasePrice / 1000000).toFixed(1)}M
                    </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => onAdd(item)}
                  className="w-full bg-slate-900 hover:bg-black text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm & Import
                </button>
                <button 
                  onClick={() => onDelete(item.id)}
                  className="w-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-3 h-3" />
                  Discard
                </button>
              </div>
           </div>
        </InfoWindow>
      )}
    </>
  );
};

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
    mapCenterOverride
  } = props;

  const map = useMap();
  const [selectedBasemapId, setSelectedBasemapId] = useState<'streets' | 'satellite' | 'terrain' | 'hybrid'>('streets');
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<google.maps.LatLngLiteral[]>([]);
  const [rulerDistance, setRulerDistance] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map settings
  const mapOptions = useMemo<google.maps.MapOptions>(() => ({
    mapId: 'propscope_main_map',
    disableDefaultUI: true,
    clickableIcons: false,
    mapTypeId: selectedBasemapId,
    tilt: 45,
    heading: 0,
    gestureHandling: 'auto'
  }), [selectedBasemapId]);

  // Initial center
  const initialCenter = useMemo<google.maps.LatLngLiteral>(() => {
    if (selectedProperty) return { lat: selectedProperty.coordinates[0], lng: selectedProperty.coordinates[1] };
    if (properties.length > 0) return { lat: properties[0].coordinates[0], lng: properties[0].coordinates[1] };
    return { lat: -26.1311, lng: 28.0536 }; // Johannesburg
  }, []);

  // Update map center when selection changes
  useEffect(() => {
    if (!map) return;
    const target = mapCenterOverride || selectedProperty?.coordinates || selectedSubstation?.coordinates;
    if (target && !isNaN(target[0])) {
      map.panTo({ lat: target[0], lng: target[1] });
    }
  }, [map, selectedProperty, selectedSubstation, mapCenterOverride]);

  // Distance calculations for property-substation lines
  const propertyDistances = useMemo(() => {
    if (substations.length === 0) return [];
    return properties.map(property => {
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
  }, [properties, substations]);

  // Ruler Tool Click Handler
  useEffect(() => {
    if (!map || !rulerActive) return;

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      
      setRulerPoints(prev => {
        const next = [...prev, point];
        if (next.length >= 2) {
           const d = calculateDistance(next[0].lat, next[0].lng, next[1].lat, next[1].lng);
           setRulerDistance(d);
           return next.slice(-2); // Only keep last two for simple distance
        }
        return next;
      });
    });

    return () => google.maps.event.removeListener(listener);
  }, [map, rulerActive]);

  // Reset ruler when deactivated
  useEffect(() => {
    if (!rulerActive) {
      setRulerPoints([]);
      setRulerDistance(null);
    }
  }, [rulerActive]);

  // Discover nearby handler
  const handleDiscover = useCallback(() => {
    if (!map || !onDiscoverNearby) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    onDiscoverNearby({
      north: bounds.getNorthEast().lat(),
      south: bounds.getSouthWest().lat(),
      east: bounds.getNorthEast().lng(),
      west: bounds.getSouthWest().lng()
    });
  }, [map, onDiscoverNearby]);

  // Export handlers
  const handleExportPDF = async (selected: Property[]) => {
    if (!containerRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 2,
        ignoreElements: (el) => {
          return el.getAttribute('data-html2canvas-ignore') === 'true';
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('l', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
      pdf.setFontSize(10);
      pdf.text(`PropScope Spatial Report - ${new Date().toLocaleDateString()}`, 10, 10);
      pdf.save(`propscope-report-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      setIsExporting(false);
      setIsExportPanelOpen(false);
    }
  };

  const handleExportImage = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    try {
       const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `propscope-map-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Image Export failed:', error);
    } finally {
      setIsExporting(false);
      setIsExportPanelOpen(false);
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-sm border border-slate-200" ref={containerRef}>
      <Map
        defaultCenter={initialCenter}
        defaultZoom={13}
        {...mapOptions}
        internalUsageAttributionIds={[ATTRIBUTION]}
        className="w-full h-full"
      >
        {/* Existing Substations */}
        {substations.map(sub => (
          <SubstationMarker 
            key={sub.id} 
            substation={sub} 
            isSelected={selectedSubstation?.id === sub.id}
            onSelect={onSelectSubstation}
          />
        ))}

        {/* Existing Properties */}
        {properties.map(p => {
            const distInfo = propertyDistances.find(d => d.property.id === p.id);
            return (
              <PropertyMarker 
                key={p.id} 
                property={p} 
                isSelected={selectedProperty?.id === p.id}
                onSelect={onSelectProperty}
                distanceLabel={distInfo ? `${distInfo.distance.toFixed(1)}km` : undefined}
                priceLabel={p.financials?.purchasePrice ? `R${(p.financials.purchasePrice / 1000000).toFixed(1)}M` : undefined}
              />
            );
        })}

        {/* Candidate Substations */}
        {candidateSubstations.map(sub => (
          <CandidateMarker 
            key={sub.id}
            item={sub}
            isProperty={false}
            isSelected={false}
            onAdd={(s) => onAddSubstation?.(s)}
            onDelete={(id) => onDeleteCandidateSubstation?.(id)}
          />
        ))}

        {/* Candidate Properties */}
        {candidateProperties.map(p => (
           <CandidateMarker 
            key={p.id}
            item={p}
            isProperty={true}
            isSelected={false}
            onAdd={(prop) => onAddProperty?.(prop)}
            onDelete={(id) => onDeleteCandidateProperty?.(id)}
          />
        ))}

        {/* Distance Lines */}
        {!rulerActive && propertyDistances.map(d => (
           <Polyline 
             key={`line-${d.property.id}`}
             path={[
               { lat: d.property.coordinates[0], lng: d.property.coordinates[1] },
               { lat: d.substation.coordinates[0], lng: d.substation.coordinates[1] }
             ]}
             strokeColor="#4285F4"
             strokeOpacity={0.6}
             strokeWeight={1}
             clickable={false}
           />
        ))}

        {/* Search Accuracy Grid Mask (Simulated radius) */}
        {selectedSubstation && (
           <Circle 
             center={{ lat: selectedSubstation.coordinates[0], lng: selectedSubstation.coordinates[1] }}
             radius={1000} // 1km target radius
             fillColor="#4F46E5"
             fillOpacity={0.05}
             strokeColor="#4F46E5"
             strokeOpacity={0.2}
             strokeWeight={1}
             editable={false}
           />
        )}

        {/* Ruler Line */}
        {rulerActive && rulerPoints.length === 2 && (
           <Polyline 
             path={rulerPoints}
             strokeColor="#EF4444"
             strokeWeight={3}
             strokeOpacity={1}
           />
        )}
      </Map>

      {/* UI Overlays */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-1 flex items-center">
            <button 
              onClick={() => setSelectedBasemapId('streets')}
              className={cn("p-2 rounded-xl transition-all", selectedBasemapId === 'streets' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}
              title="Vector Streets"
            >
              <MapIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSelectedBasemapId('hybrid')}
              className={cn("p-2 rounded-xl transition-all", selectedBasemapId === 'hybrid' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}
              title="Sattelite / Google Earth"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSelectedBasemapId('terrain')}
              className={cn("p-2 rounded-xl transition-all", selectedBasemapId === 'terrain' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100")}
              title="Terrain View"
            >
              <Mountain className="w-5 h-5" />
            </button>
        </div>

        <button 
          onClick={() => setIsExportPanelOpen(true)}
          className="p-3 rounded-2xl shadow-xl border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all"
          title="Export Map/Report"
        >
          <FileDown className="w-5 h-5" />
        </button>

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
            const center = map?.getCenter();
            if (center) {
              const url = `https://earth.google.com/web/search/${center.lat()},${center.lng()}`;
              window.open(url, '_blank');
            }
          }}
          className="p-3 rounded-2xl shadow-xl border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center justify-center"
          title="Open in Google Earth"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Discovery Trigger Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 flex items-center gap-6 min-w-[400px]">
          <div className="flex flex-col">
            <span className="text-[10px] font-black italic text-indigo-600 uppercase tracking-widest mb-1">Discovery Mode</span>
            <div className="flex items-center gap-2">
               <Zap className={cn("w-4 h-4", isDiscovering ? "text-indigo-500 animate-pulse" : "text-slate-400")} />
               <div className="flex flex-col">
                 <span className="text-sm font-black text-slate-800 tracking-tight leading-none">
                   {isDiscovering ? 'Scanning for Substations...' : 'Spatial Catalog Explorer'}
                 </span>
                 <span className="text-[10px] text-slate-500 font-medium">Verified by Google Maps Platform</span>
               </div>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-200" />

          <div className="flex gap-2">
            {!isDiscovering ? (
              <button 
                onClick={handleDiscover}
                className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                <Search className="w-4 h-4 text-indigo-400" />
                Find Substations
              </button>
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

      {rulerActive && rulerDistance && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
           <div className="bg-red-600 text-white px-4 py-2 rounded-full shadow-2xl font-black text-sm flex items-center gap-3 border-2 border-white/20">
              <Scaling className="w-4 h-4" />
              <span>MEASUREMENT: {rulerDistance.toFixed(2)} KM</span>
              <button onClick={() => setRulerPoints([])} className="hover:bg-red-500 rounded p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
           </div>
        </div>
      )}

      {/* MapDetailsOverlay integrates naturally with the new engine */}
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
      />

      {isExportPanelOpen && (
        <ExportSelectionOverlay 
          properties={properties}
          onClose={() => setIsExportPanelOpen(false)}
          onExport={handleExportPDF}
          onExportImage={handleExportImage}
          isExporting={isExporting}
        />
      )}
    </div>
  );
}
