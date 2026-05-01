import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap, LayersControl, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import * as esri from 'esri-leaflet';
import { Property, Substation, PROPERTY_TYPE_COLORS, SUBSTATION_COLOR } from '../../types';
import { 
  Ruler, 
  X, 
  Navigation2, 
  Zap, 
  Maximize2, 
  Minimize2, 
  Home,
  Scaling,
  Layers,
  Map as MapIcon,
  ExternalLink,
  FileDown
} from 'lucide-react';
import { cn, calculateDistance } from '../../lib/utils';
import MapDetailsOverlay from './MapDetailsOverlay';
import ExportSelectionOverlay from './ExportSelectionOverlay';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const CLASSIC_RED = '#EA4335';

// Custom component to integrate esri-leaflet with react-leaflet
function EsriDynamicLayer({ url, layers, opacity, visible }: { url: string, layers?: number[], opacity: number, visible: boolean }) {
  const map = useMap();
  const layerRef = React.useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    if (!layerRef.current) {
      const options: any = {
        url,
        opacity,
        useCors: true,
        zIndex: 400,
        format: 'png32'
      };
      
      if (layers && layers.length > 0) {
        options.layers = layers;
      }
      
      layerRef.current = esri.dynamicMapLayer(options);
      
      layerRef.current.on('loading', () => console.log('Cadastral Layer loading...'));
      layerRef.current.on('load', () => console.log('Cadastral Layer loaded successfully'));
      layerRef.current.on('error', (err: any) => {
        console.error('Cadastral Layer error:', err?.message || 'Unknown error');
        // Handle common ArcGIS errors
        if (err?.message?.includes('403') || err?.message?.includes('401')) {
          console.warn('CSG layer might require authentication or be restricted by referrer.');
        }
      });
      
      layerRef.current.addTo(map);
    } else {
      layerRef.current.setOpacity(opacity);
      if (layers) {
        layerRef.current.setLayers(layers);
      }
    }

    return () => {
      if (layerRef.current && map) {
        try {
          map.removeLayer(layerRef.current);
        } catch (e) {
          console.warn('Failed to remove layer during cleanup:', e);
        }
        layerRef.current = null;
      }
    };
  }, [map, url, layers, opacity, visible]);

  return null;
}

// Fix Leaflet marker icons using CDN URLs
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: iconShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  properties: Property[];
  substations?: Substation[];
  onSelectProperty: (property: Property) => void;
  selectedProperty: Property | null;
  onSelectSubstation?: (substation: Substation) => void;
  selectedSubstation?: Substation | null;
  rulerActive: boolean;
  onRulerActiveChange: (active: boolean) => void;
  onOpenDetails?: (property: Property) => void;
  isFullscreen: boolean;
  onFullscreenChange: (fullscreen: boolean) => void;
}

// Memoized Distance Lines for performance and stability
const DistanceLines = React.memo(({ propertyDistances, rulerActive }: { propertyDistances: any[], rulerActive: boolean }) => {
  if (rulerActive) return null;
  
  const validDistances = propertyDistances.filter(({ property, substation }) => 
    Array.isArray(property.coordinates) && property.coordinates.length >= 2 && 
    Array.isArray(substation.coordinates) && substation.coordinates.length >= 2 &&
    !isNaN(property.coordinates[0]) && !isNaN(substation.coordinates[0])
  );

  return (
    <>
      {validDistances.map(({ property, substation }) => (
        <Polyline 
          key={`poly-line-${property.id}`}
          positions={[property.coordinates as [number, number], substation.coordinates as [number, number]]} 
          color="#8b5cf6" 
          weight={2.5} 
          dashArray="10, 15" 
          opacity={0.85}
          smoothFactor={2}
          interactive={false}
          pathOptions={{
            className: `property-dist-line-${property.id}`,
            pane: 'overlayPane'
          }}
        />
      ))}
    </>
  );
});

const createColoredIcon = (color: string, isSelected: boolean = false, label?: string, distanceLabel?: string, priceLabel?: string, propertyId?: string, substationId?: string) => {
  const width = isSelected ? 28 : 20;
  const height = width * 1.4;
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex flex-col items-center" 
        ${propertyId ? `data-property-id="${propertyId}"` : ''} 
        ${substationId ? `data-substation-id="${substationId}"` : ''}
      >
        <svg width="${width}" height="${height}" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-lg">
          <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="3.5" fill="white" opacity="0.9"/>
        </svg>
        <div class="mt-0.5 flex flex-col items-center gap-0.5 pointer-events-none">
          ${label ? `
            <div class="px-1 py-0 select-none">
                <span class="text-[7px] font-bold uppercase whitespace-nowrap leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" style="color: ${color}">${label}</span>
            </div>
          ` : ''}
          <div class="flex flex-row gap-0.5">
            ${distanceLabel ? `
              <div class="px-1 py-0 select-none">
                  <span class="text-[7px] font-black italic text-violet-700 whitespace-nowrap leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">${distanceLabel}</span>
              </div>
            ` : ''}
            ${priceLabel ? `
              <div class="px-1 py-0 select-none">
                  <span class="text-[7px] font-bold text-emerald-700 whitespace-nowrap leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">${priceLabel}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `,
    iconSize: [120, height + 60],
    iconAnchor: [60, height],
  });
};

// Memoized Substation Markers
const SubstationLayerGroup = React.memo(({ substations, onSelect, selectedId }: { substations: Substation[], onSelect?: (s: Substation) => void, selectedId?: string }) => {
  return (
    <>
      {substations.filter(s => Array.isArray(s.coordinates) && s.coordinates.length >= 2 && !isNaN(s.coordinates[0])).map(substation => (
        <Marker
          key={`${substation.id}-${substation.coordinates[0]}-${substation.coordinates[1]}`}
          position={substation.coordinates}
          icon={createColoredIcon(SUBSTATION_COLOR, selectedId === substation.id, substation.name, undefined, undefined, undefined, substation.id)}
          zIndexOffset={selectedId === substation.id ? 1000 : 0}
          eventHandlers={{
            click: () => onSelect?.(substation),
          }}
        >
          <Popup>
            <div className="p-1 min-w-[120px]">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-violet-600" />
                <p className="font-bold text-sm leading-none m-0 text-slate-900 uppercase tracking-tight">{substation.name}</p>
              </div>
              <p className="text-[10px] text-slate-500 m-0 uppercase font-bold tracking-widest">{substation.status}</p>
              <p className="text-[11px] text-slate-400 m-0 mt-2 italic">{substation.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
});

// Component to handle map movements when selected property changes
function MapController({ center, rulerActive }: { center: [number, number] | null, rulerActive: boolean }) {
  const map = useMap();
  const lastCenterRef = React.useRef<[number, number] | null>(null);
  
  useEffect(() => {
    if (center && !rulerActive && !isNaN(center[0]) && !isNaN(center[1])) {
      // Only fly if the center actually changed significantly
      if (!lastCenterRef.current || 
          lastCenterRef.current[0] !== center[0] || 
          lastCenterRef.current[1] !== center[1]) {
        
        map.flyTo(center, 17, {
          duration: 1.2,
          easeLinearity: 0.25
        });
        lastCenterRef.current = center;
      }
    }
  }, [center, map, rulerActive]);
  
  return null;
}

export default function MapComponent({ 
  properties, 
  substations = [],
  onSelectProperty, 
  selectedProperty,
  onSelectSubstation,
  selectedSubstation,
  rulerActive,
  onRulerActiveChange,
  onOpenDetails,
  isFullscreen,
  onFullscreenChange
}: MapComponentProps) {
  const [rulerPoints, setRulerPoints] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showStructures, setShowStructures] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isSelectingForExport, setIsSelectingForExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);

  // Improved performance: pre-calculate closest substation for all properties
  const propertyDistances = React.useMemo(() => {
    if (!substations || substations.length === 0) return [];
    
    return properties.map(property => {
      let minDistance = Infinity;
      let closestSub = substations[0];
      
      substations.forEach(sub => {
        const d = calculateDistance(
          property.coordinates[0],
          property.coordinates[1],
          sub.coordinates[0],
          sub.coordinates[1]
        );
        if (d < minDistance) {
          minDistance = d;
          closestSub = sub;
        }
      });
      
      return { property, substation: closestSub, distance: minDistance };
    });
  }, [properties, substations]);

  const MapEvents = () => {
    const map = useMap();

    useEffect(() => {
      const handleOverlayAdd = (e: any) => {
        if (e.name === "Property Boundaries (National)") {
          setShowBoundaries(true);
        }
        if (e.name === "Building Structures") {
          setShowStructures(true);
        }
      };
      const handleOverlayRemove = (e: any) => {
        if (e.name === "Property Boundaries (National)") {
          setShowBoundaries(false);
        }
        if (e.name === "Building Structures") {
          setShowStructures(false);
        }
      };

      map.on('overlayadd', handleOverlayAdd);
      map.on('overlayremove', handleOverlayRemove);

      return () => {
        map.off('overlayadd', handleOverlayAdd);
        map.off('overlayremove', handleOverlayRemove);
      };
    }, [map]);

    useMapEvents({
      click(e) {
        // Only allow manual ruler if substation distances are toggled off
        if (rulerActive) {
          const newPoints: [number, number][] = [...rulerPoints, [e.latlng.lat, e.latlng.lng]];
          if (newPoints.length > 2) {
            setRulerPoints([[e.latlng.lat, e.latlng.lng]]);
            setDistance(null);
          } else {
            setRulerPoints(newPoints);
            if (newPoints.length === 2) {
              const d = calculateDistance(newPoints[0][0], newPoints[0][1], newPoints[1][0], newPoints[1][1]);
              setDistance(d);
            }
          }
        }
      },
      zoomend() {},
    });

    return null;
  };

  // Determine stable coordinates for map centering
  const targetCenter = React.useMemo(() => {
    if (selectedProperty && Array.isArray(selectedProperty.coordinates) && !isNaN(selectedProperty.coordinates[0])) {
      return selectedProperty.coordinates as [number, number];
    }
    if (selectedSubstation && Array.isArray(selectedSubstation.coordinates) && !isNaN(selectedSubstation.coordinates[0])) {
      return selectedSubstation.coordinates as [number, number];
    }
    return null;
  }, [selectedProperty, selectedSubstation]);

  // Initial center should only be computed once to prevent jumping on data updates
  const [initialCenter] = useState<[number, number]>(() => {
    if (selectedProperty) return selectedProperty.coordinates as [number, number];
    if (properties.length > 0 && properties[0].coordinates) return properties[0].coordinates as [number, number];
    return [-26.1311, 28.0536];
  });

  useEffect(() => {
    if (!rulerActive) {
      setRulerPoints([]);
      setDistance(null);
    }
  }, [rulerActive]);

  const handleExportToPDF = async (selectedProperties: Property[]) => {
    if (!mapRef.current) return;
    
    setIsExporting(true);
    try {
      // Small delay to ensure map markers and tiles are fully settled
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Target the actual leaflet container for better isolation
      const container = mapRef.current?.querySelector('.leaflet-container') as HTMLElement;
      if (!container) {
        throw new Error("Leaflet map container not found");
      }

      let imgData: string | null = null;
      let imgAspectRatio = 1;
      
      try {
        const canvas = await html2canvas(container, {
          useCORS: true,
          logging: false,
          scale: 2.5, // High scale for resolution
          backgroundColor: '#ffffff',
          allowTaint: false,
          imageTimeout: 15000,
          removeContainer: true,
          onclone: (clonedDoc) => {
            // Aggressively clean modern color functions that html2canvas can't parse
            const styleTags = clonedDoc.getElementsByTagName('style');
            const MODERN_COLOR_REGEX = /(oklch|oklab|color-mix)\([^)]+\)/g;
            const FALLBACK_COLOR = '#6366f1';

            for (let i = 0; i < styleTags.length; i++) {
              const style = styleTags[i];
              if (style.textContent && (style.textContent.includes('oklch') || style.textContent.includes('oklab') || style.textContent.includes('color-mix'))) {
                style.textContent = style.textContent.replace(MODERN_COLOR_REGEX, FALLBACK_COLOR);
              }
            }
            
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              // Check SVG and direct attributes
              ['fill', 'stroke', 'color', 'style'].forEach(attr => {
                const val = htmlEl.getAttribute(attr);
                if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                  htmlEl.setAttribute(attr, val.replace(MODERN_COLOR_REGEX, FALLBACK_COLOR));
                }
              });
              
              // Force-fix inline styles
              if (htmlEl.style) {
                ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].forEach(prop => {
                  try {
                    const val = htmlEl.style.getPropertyValue(prop);
                    if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                      htmlEl.style.setProperty(prop, FALLBACK_COLOR, 'important');
                    }
                  } catch (e) {}
                });
              }
            });
          },
          ignoreElements: (element) => {
            // Only export map with selected properties and their nearest substations
            const selectedIds = selectedProperties.map(p => p.id);
            const neededSubstationIds = propertyDistances
              .filter(pd => selectedIds.includes(pd.property.id))
              .map(pd => pd.substation.id);

            // Leaflet markers check
            if (element.classList.contains('leaflet-marker-icon')) {
              const propId = element.querySelector('[data-property-id]')?.getAttribute('data-property-id');
              const subId = element.querySelector('[data-substation-id]')?.getAttribute('data-substation-id');
              
              if (propId && !selectedIds.includes(propId)) return true;
              if (subId && !neededSubstationIds.includes(subId)) return true;
            }

            // Distance labels check (divIcons can also have these)
            const propertyId = element.getAttribute('data-property-id');
            if (propertyId && !selectedIds.includes(propertyId)) {
              return true;
            }

            // Filter distance lines (SVG paths)
            const isDistLine = Array.from(element.classList).some(cls => cls.startsWith('property-dist-line-'));
            if (isDistLine) {
              const linePropId = Array.from(element.classList).find(cls => cls.startsWith('property-dist-line-'))?.replace('property-dist-line-', '');
              if (linePropId && !selectedIds.includes(linePropId)) {
                return true;
              }
            }

            return (
              element.hasAttribute('data-html2canvas-ignore') || 
              element.classList.contains('leaflet-control-container')
            );
          }
        });
        
        imgAspectRatio = canvas.height / canvas.width;
        imgData = canvas.toDataURL('image/png', 1.0);
      } catch (canvasError) {
        console.warn('Map capture failed, proceeding with data-only report', canvasError);
      }
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header
      pdf.setFillColor(15, 23, 42); 
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SPATIAL ANALYSIS REPORT', 15, 20);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 30);
      pdf.text(`Total Properties: ${selectedProperties.length}`, 15, 35);

      let currentY = 50;
      
      // Map Section (Only if we have the image)
      if (imgData) {
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Map Overview', 15, currentY);
        
        const imgWidth = pageWidth - 20;
        const imgHeight = imgWidth * imgAspectRatio; // Dynamic height based on ratio
        
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(9.5, currentY + 4.5, imgWidth + 1, imgHeight + 1, 'S');
        pdf.addImage(imgData, 'PNG', 10, currentY + 5, imgWidth, imgHeight);
        
        currentY += imgHeight + 20;
      } else {
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Map visualization currently unavailable. Textual report follows.', 15, currentY);
        currentY += 15;
      }

      // Properties Details
      currentY += 8;

      selectedProperties.forEach((prop, index) => {
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(10, currentY, pageWidth - 20, 35, 2, 2, 'F');
        
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${prop.name}`, 15, currentY + 10);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text(`${prop.address.street}, ${prop.address.suburb}`, 15, currentY + 17);
        
        pdf.setTextColor(79, 70, 229);
        pdf.text(`Type: ${prop.type}`, 15, currentY + 25);
        
        const distInfo = propertyDistances.find(pd => pd.property.id === prop.id);
        if (distInfo) {
          pdf.text(`Distance: ${(distInfo.distance / 1000).toFixed(2)}km`, 80, currentY + 25);
          pdf.text(`Substation: ${distInfo.substation.name}`, 80, currentY + 30);
        }

        if (prop.financials?.purchasePrice) {
          pdf.setTextColor(5, 150, 105);
          pdf.text(`Price: R ${prop.financials.purchasePrice.toLocaleString()}`, 140, currentY + 25);
        }

        currentY += 40;
      });

      const fileName = `spatial_report_${Date.now()}.pdf`;
      
      // Use standard save as primary
      pdf.save(fileName);
      
      setIsSelectingForExport(false);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Generating PDF failed. This might be due to map tile access restrictions. Try again or check your connection.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAsImage = async (selectedProperties: Property[]) => {
    if (!mapRef.current) return;
    
    setIsExporting(true);
    try {
      // Small delay to ensure map markers and tiles are fully settled
      await new Promise(resolve => setTimeout(resolve, 1000));

      const container = mapRef.current?.querySelector('.leaflet-container') as HTMLElement;
      if (!container) {
        throw new Error("Leaflet map container not found");
      }

      const canvas = await html2canvas(container, {
        useCORS: true,
        logging: false,
        scale: 3, // Increased scale for ultra-high resolution images
        backgroundColor: '#ffffff',
        allowTaint: false,
        imageTimeout: 15000,
        removeContainer: true,
        onclone: (clonedDoc) => {
          // Clean style blocks of any modern color functions that break capture
          const MODERN_COLOR_REGEX = /(oklch|oklab|color-mix)\([^)]+\)/g;
          const FALLBACK_COLOR = '#6366f1';

          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const style = styleTags[i];
            if (style.textContent && (style.textContent.includes('oklch') || style.textContent.includes('oklab') || style.textContent.includes('color-mix'))) {
              style.textContent = style.textContent.replace(MODERN_COLOR_REGEX, FALLBACK_COLOR);
            }
          }
          
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            ['fill', 'stroke', 'color', 'style'].forEach(attr => {
              const val = htmlEl.getAttribute(attr);
              if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                htmlEl.setAttribute(attr, val.replace(MODERN_COLOR_REGEX, FALLBACK_COLOR));
              }
            });
            
            if (htmlEl.style) {
              ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].forEach(prop => {
                try {
                  const val = htmlEl.style.getPropertyValue(prop);
                  if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                    htmlEl.style.setProperty(prop, FALLBACK_COLOR, 'important');
                  }
                } catch (e) {}
              });
            }
          });
        },
        ignoreElements: (element) => {
          // Filter selected properties and their nearest substations for image too
          const selectedIds = selectedProperties.map(p => p.id);
          const neededSubstationIds = propertyDistances
            .filter(pd => selectedIds.includes(pd.property.id))
            .map(pd => pd.substation.id);

          // Leaflet markers check
          if (element.classList.contains('leaflet-marker-icon')) {
            const propId = element.querySelector('[data-property-id]')?.getAttribute('data-property-id');
            const subId = element.querySelector('[data-substation-id]')?.getAttribute('data-substation-id');
            
            if (propId && !selectedIds.includes(propId)) return true;
            if (subId && !neededSubstationIds.includes(subId)) return true;
          }

          // Distance labels check
          const propertyId = element.getAttribute('data-property-id');
          if (propertyId && !selectedIds.includes(propertyId)) {
            return true;
          }

          // Filter distance lines
          const isDistLine = Array.from(element.classList).some(cls => cls.startsWith('property-dist-line-'));
          if (isDistLine) {
            const linePropId = Array.from(element.classList).find(cls => cls.startsWith('property-dist-line-'))?.replace('property-dist-line-', '');
            if (linePropId && !selectedIds.includes(linePropId)) {
              return true;
            }
          }

          return (
            element.hasAttribute('data-html2canvas-ignore') || 
            element.classList.contains('leaflet-control-container')
          );
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `spatial_snapshot_${Date.now()}.png`;
      link.href = imgData;
      link.click();
      
      setIsSelectingForExport(false);
    } catch (error) {
      console.error('Image Export Error:', error);
      alert('Generating image failed. This might be due to map tile access restrictions.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      ref={mapRef}
      className={cn(
      "relative rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-all duration-500 ease-in-out",
      isFullscreen ? "fixed inset-0 z-[5000] rounded-none border-none" : "w-full h-full"
    )}>
      <MapContainer 
        center={initialCenter} 
        zoom={13} 
        zoomSnap={0.25}
        zoomDelta={0.25}
        wheelPxPerZoomLevel={120}
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false}
        preferCanvas={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked={mapType === 'street'} name="Street View">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer checked={mapType === 'satellite'} name="Satellite View">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri'
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked={showBoundaries} name="Property Boundaries (National)">
            <LayerGroup />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked={showStructures} name="Building Structures">
            <LayerGroup />
          </LayersControl.Overlay>
        </LayersControl>

        <EsriDynamicLayer
          url="https://maps.geoscience.org.za/arcgis/rest/services/Cadastre/MapServer"
          layers={[0, 1, 2, 3, 4]}
          opacity={0.8}
          visible={showBoundaries}
        />

        <EsriDynamicLayer
          url="https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/MS_Building_Footprints_South_Africa/MapServer"
          layers={[0]}
          opacity={0.5}
          visible={showStructures}
        />

        <MapController center={targetCenter} rulerActive={rulerActive} />

        {React.useMemo(() => properties.filter(p => Array.isArray(p.coordinates) && p.coordinates.length >= 2 && !isNaN(p.coordinates[0])).map(property => {
          const distInfo = propertyDistances.find(pd => pd.property.id === property.id);
          const distanceLabel = distInfo ? `${(distInfo.distance / 1000).toFixed(2)}km` : undefined;
          const priceLabel = property.financials?.purchasePrice ? `R ${(property.financials.purchasePrice / 1000000).toFixed(1)}M` : undefined;
          
          return (
            <Marker
              key={`${property.id}-${property.coordinates[0]}-${property.coordinates[1]}`}
              position={property.coordinates as [number, number]}
              icon={createColoredIcon(
                CLASSIC_RED,
                selectedProperty?.id === property.id,
                property.name,
                distanceLabel,
                priceLabel,
                property.id
              )}
              zIndexOffset={selectedProperty?.id === property.id ? 1000 : 0}
              eventHandlers={{ click: () => onSelectProperty(property) }}
            />
          );
        }), [properties, propertyDistances, selectedProperty?.id, onSelectProperty])}
        
        <SubstationLayerGroup substations={substations} onSelect={onSelectSubstation} selectedId={selectedSubstation?.id} />

        {rulerPoints.map((point, idx) => (
          <Marker 
            key={idx} 
            position={point} 
            draggable={rulerActive}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                const newPoints = [...rulerPoints];
                newPoints[idx] = [position.lat, position.lng];
                setRulerPoints(newPoints);
                if (newPoints.length === 2) {
                  const d = calculateDistance(newPoints[0][0], newPoints[0][1], newPoints[1][0], newPoints[1][1]);
                  setDistance(d);
                }
              }
            }}
            icon={L.divIcon({
              className: 'ruler-marker',
              html: `<div class="w-4 h-4 bg-white border-2 border-slate-900 rounded-full shadow-lg hover:scale-125 transition-transform cursor-move"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })} 
          />
        ))}

        {rulerPoints.length === 2 && (
          <>
            <Polyline positions={rulerPoints} color="#0f172a" weight={4} dashArray="8, 12" />
            <Marker 
              position={[
                (rulerPoints[0][0] + rulerPoints[1][0]) / 2,
                (rulerPoints[0][1] + rulerPoints[1][1]) / 2
              ]}
              icon={L.divIcon({
                className: 'distance-label',
                html: `
                  <div class="flex items-center justify-center pointer-events-none">
                    <div class="bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-2xl text-[12px] font-black italic whitespace-nowrap border border-white/20 flex items-center gap-2 transform -translate-y-8">
                      <div class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                      ${distance! < 1000 ? `${distance!.toFixed(1)}m` : `${(distance! / 1000).toFixed(2)}km`}
                    </div>
                  </div>
                `,
                iconSize: [200, 40],
                iconAnchor: [100, 20]
              })}
            />
          </>
        )}

        <DistanceLines propertyDistances={propertyDistances} rulerActive={rulerActive} />

        <MapEvents />
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2" data-html2canvas-ignore="true">
        <button
          onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
          className={cn(
            "p-3 rounded-xl shadow-xl transition-all border",
            mapType === 'satellite' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
          title="Toggle Satellite View"
        >
          <MapIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowBoundaries(!showBoundaries)}
          className={cn(
            "p-3 rounded-xl shadow-xl transition-all border",
            showBoundaries ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
          title="Toggle Property Boundaries"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowStructures(!showStructures)}
          className={cn(
            "p-3 rounded-xl shadow-xl transition-all border",
            showStructures ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
          title="Toggle Building Structures"
        >
          <Home className="w-4 h-4" />
        </button>

        <button
          onClick={() => onRulerActiveChange(!rulerActive)}
          className={cn(
            "p-3 rounded-xl shadow-xl transition-all border",
            rulerActive ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
          title="Distance Ruler"
        >
          <Ruler className="w-4 h-4" />
        </button>

        <button
          onClick={() => onFullscreenChange(!isFullscreen)}
          className="p-3 bg-white rounded-xl shadow-xl border border-slate-200 text-slate-600"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setIsSelectingForExport(!isSelectingForExport)}
          className={cn(
            "p-3 rounded-xl shadow-xl transition-all border",
            isSelectingForExport ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
          title="Map Report & Export"
        >
          <FileDown className="w-4 h-4" />
        </button>
      </div>

      {isSelectingForExport && (
        <ExportSelectionOverlay 
          properties={properties}
          onClose={() => setIsSelectingForExport(false)}
          onExport={handleExportToPDF}
          onExportImage={handleExportAsImage}
          isExporting={isExporting}
        />
      )}

      {isFullscreen && (
          <MapDetailsOverlay 
            property={selectedProperty}
            substation={selectedSubstation}
            closestSubstationInfo={propertyDistances.find(pd => pd.property.id === selectedProperty?.id)}
            isFullscreen={isFullscreen}
            onCloseProperty={() => onSelectProperty(null as any)}
            onCloseSubstation={() => onSelectSubstation?.(null as any)}
            onOpenDetails={onOpenDetails!}
            data-html2canvas-ignore="true"
          />
      )}

      {rulerActive && distance !== null && (
        <div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl border border-white/10 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300"
          data-html2canvas-ignore="true"
        >
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/40">
              <Scaling className="w-5 h-5 text-white" />
           </div>
           <div>
              <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] leading-none mb-1">Measured Distance</p>
              <p className="text-2xl font-black italic tracking-tighter">
                 {distance < 1000 ? `${distance.toFixed(1)} m` : `${(distance / 1000).toFixed(2)} km`}
              </p>
           </div>
           <button 
             onClick={() => onRulerActiveChange(false)}
             className="ml-6 p-2.5 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white border border-white/5"
           >
             <X className="w-4 h-4" />
           </button>
        </div>
      )}
    </div>
  );
}


