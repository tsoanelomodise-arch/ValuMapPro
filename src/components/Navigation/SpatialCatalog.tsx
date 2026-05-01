import React from 'react';
import { Property, Substation, PROPERTY_TYPE_COLORS } from '../../types';
import { MapPin, Zap, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SpatialCatalogProps {
  properties: Property[];
  substations: Substation[];
  selectedPropertyId?: string | null;
  selectedSubstationId?: string | null;
  visiblePropertyIds: string[];
  onToggleVisibility: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onOpenDetails: (property: Property) => void;
  onSelectSubstation: (substation: Substation) => void;
}

export function SpatialCatalog({
  properties,
  substations,
  selectedPropertyId,
  selectedSubstationId,
  visiblePropertyIds,
  onToggleVisibility,
  onSelectProperty,
  onOpenDetails,
  onSelectSubstation
}: SpatialCatalogProps) {
  return (
    <div 
      className="w-72 h-full bg-white border-r border-slate-200 z-10 flex flex-col shadow-lg"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
         <div className="flex items-center gap-2 mb-1">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Records</span>
         </div>
         <h3 className="text-sm font-black text-slate-900 tracking-tight italic uppercase">Spatial Catalog</h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
         <div className="space-y-1">
            {properties.length === 0 && substations.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                   No records found in current spatial index.
                </p>
              </div>
            )}
            
            {properties.map(p => (
              <div key={p.id} className="flex items-center gap-1 group/item">
                <div className="pl-1">
                  <input 
                    type="checkbox"
                    checked={visiblePropertyIds.includes(p.id)}
                    onChange={() => onToggleVisibility(p.id)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <button 
                  onClick={() => onSelectProperty(p)}
                  className={cn(
                    "flex-1 text-left p-3 rounded-xl border flex items-start gap-3 group relative overflow-hidden transition-all",
                    selectedPropertyId === p.id 
                      ? "bg-blue-50/50 border-blue-200 shadow-sm" 
                      : "bg-white border-transparent hover:bg-slate-50",
                    !visiblePropertyIds.includes(p.id) && "opacity-60 grayscale-[0.5]"
                  )}
                >
                  <div 
                    className="w-1 h-full absolute left-0 top-0 transition-opacity opacity-0 group-hover:opacity-100" 
                    style={{ backgroundColor: PROPERTY_TYPE_COLORS[p.type as keyof typeof PROPERTY_TYPE_COLORS] }}
                  />
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                     <MapPin className={cn("w-4 h-4", selectedPropertyId === p.id ? "text-blue-600" : "text-slate-400")} />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate leading-none mb-1">{p.name}</p>
                     <p className="text-[10px] text-slate-400 font-bold truncate tracking-tight">{p.address.suburb}</p>
                  </div>
                  <ArrowUpRight 
                    className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails(p);
                    }}
                  />
                </button>
              </div>
            ))}

            {substations.map(s => (
              <button 
                key={s.id}
                onClick={() => onSelectSubstation(s)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border flex items-start gap-3 group relative overflow-hidden",
                  selectedSubstationId === s.id 
                    ? "bg-violet-50/50 border-violet-200 shadow-sm" 
                    : "bg-white border-transparent hover:bg-slate-50"
                )}
              >
                <div className="w-1 h-full absolute left-0 top-0 bg-violet-500 transition-opacity opacity-0 group-hover:opacity-100" />
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                   <Zap className={cn("w-4 h-4", selectedSubstationId === s.id ? "text-violet-600" : "text-slate-400")} />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate leading-none mb-1">{s.name}</p>
                   <p className="text-[10px] text-slate-400 font-bold truncate tracking-tight">INFRASTRUCTURE</p>
                </div>
              </button>
            ))}
         </div>
      </div>
    </div>
  );
}
