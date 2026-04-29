import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { Property, PROPERTY_TYPE_COLORS } from '../../types';
import { Ruler, X, Navigation2 } from 'lucide-react';
import { cn, calculateDistance } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
  onSelectProperty: (property: Property) => void;
  selectedProperty: Property | null;
}

const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function MapComponent({ properties, onSelectProperty, selectedProperty }: MapComponentProps) {
  const [rulerActive, setRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<number | null>(null);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
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

  const center: [number, number] = selectedProperty 
    ? selectedProperty.coordinates 
    : [-26.1311, 28.0536]; // Default to Johannesburg area

  useEffect(() => {
    if (!rulerActive) {
      setRulerPoints([]);
      setDistance(null);
    }
  }, [rulerActive]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <LayersControl position="topright">
          <LayersControl.Overlay checked name="Residential">
            <LayerGroup type="Residential" properties={properties} onSelect={onSelectProperty} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Commercial">
            <LayerGroup type="Commercial" properties={properties} onSelect={onSelectProperty} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Industrial">
            <LayerGroup type="Industrial" properties={properties} onSelect={onSelectProperty} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Vacant Land">
            <LayerGroup type="Vacant Land" properties={properties} onSelect={onSelectProperty} />
          </LayersControl.Overlay>
        </LayersControl>

        {rulerPoints.map((point, idx) => (
          <Marker key={idx} position={point} icon={L.divIcon({
            className: 'ruler-marker',
            html: `<div class="w-3 h-3 bg-white border-2 border-black rounded-full"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })} />
        ))}

        {rulerPoints.length === 2 && (
          <Polyline positions={rulerPoints} color="#000" weight={2} dashArray="5, 10" />
        )}

        <MapEvents />
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setRulerActive(!rulerActive)}
          className={cn(
            "p-3 rounded-xl shadow-xl transition-all border",
            rulerActive ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
          title="Distance Ruler"
        >
          <Ruler className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {rulerActive && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-6 left-6 z-[1000] flex items-center gap-4 px-4 py-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white">
                <Ruler className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none">Ruler Tool</p>
                <p className="text-xs font-bold text-slate-800">Active Distance</p>
              </div>
            </div>
            
            <div className="h-8 w-px bg-slate-200"></div>
            
            <div className="flex flex-col min-w-[80px]">
              {distance ? (
                <>
                  <span className="text-sm font-black text-slate-900 tracking-tight">{(distance / 1000).toFixed(2)} KM</span>
                  <span className="text-[9px] text-slate-500">± 2.5m precision</span>
                </>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 italic">Select 2 points</span>
              )}
            </div>

            {distance && (
              <button 
                onClick={() => setRulerPoints([])}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedProperty && (
         <div className="absolute top-4 right-4 z-[1000] animate-in fade-in slide-in-from-right-4 transition-all">
            <div className="bg-white overflow-hidden rounded-xl shadow-xl border border-slate-200 w-64">
               <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                  <span 
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700"
                  >
                    {selectedProperty.type}
                  </span>
                  <Navigation2 className="w-3 h-3 text-slate-400" />
               </div>
               <div className="p-4">
                  <h3 className="font-bold text-slate-800 truncate leading-none">{selectedProperty.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 mb-3 truncate">{selectedProperty.address.street}, {selectedProperty.address.suburb}</p>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                     <span className="text-base font-bold text-slate-900 italic">R {(selectedProperty.financials.purchasePrice / 1000000).toFixed(1)}M</span>
                     <button 
                        onClick={() => onSelectProperty(selectedProperty)}
                        className="bg-blue-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
                     >
                        DETAILS
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

function LayerGroup({ type, properties, onSelect }: { type: string, properties: Property[], onSelect: (p: Property) => void }) {
  return (
    <>
      {properties.filter(p => p.type === type).map(property => (
        <Marker
          key={property.id}
          position={property.coordinates}
          icon={createColoredIcon(PROPERTY_TYPE_COLORS[property.type as keyof typeof PROPERTY_TYPE_COLORS])}
          eventHandlers={{
            click: () => onSelect(property),
          }}
        >
          <Popup>
            <div className="p-1">
              <p className="font-bold text-sm leading-none m-0">{property.name}</p>
              <p className="text-xs text-gray-500 m-0 mt-1">{property.address.street}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
