import React from 'react';
import { Property, Substation, PROPERTY_TYPE_COLORS } from '../../types';
import { MapPin, Zap, ArrowUpRight, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SpatialCatalogProps {
  properties: Property[];
  candidateProperties?: Property[];
  substations: Substation[];
  candidateSubstations?: Substation[];
  selectedPropertyId?: string | null;
  selectedSubstationId?: string | null;
  hiddenPropertyIds: string[];
  onToggleVisibility: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onOpenDetails: (property: Property) => void;
  onSelectSubstation: (substation: Substation) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function SpatialCatalog({
  properties,
  candidateProperties = [],
  substations,
  candidateSubstations = [],
  selectedPropertyId,
  selectedSubstationId,
  hiddenPropertyIds,
  onToggleVisibility,
  onSelectProperty,
  onOpenDetails,
  onSelectSubstation,
  searchQuery,
  setSearchQuery
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
      <div className="p-2 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
         <div className="space-y-1">
            {properties.length === 0 && candidateProperties.length === 0 && substations.length === 0 && candidateSubstations.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                   No records found in current spatial index.
                </p>
              </div>
            )}

            {/* Candidate Properties (Discovered but not imported) */}
            {candidateProperties.map(p => (
              <div key={p.id} className="flex items-center gap-1 group/item">
                <div className="pl-1 opacity-0"> {/* No visibility toggle for candidates */}
                  <input type="checkbox" disabled className="w-3.5 h-3.5 rounded border-slate-300" />
                </div>
                <button 
                  onClick={() => onSelectProperty(p)}
                  className={cn(
                    "flex-1 text-left p-3 rounded-xl border border-dashed flex items-start gap-3 group relative overflow-hidden transition-all bg-emerald-50/30 border-emerald-200",
                    selectedPropertyId === p.id && "bg-emerald-100/50 border-emerald-300 shadow-sm"
                  )}
                >
                  <div className="w-1 h-full absolute left-0 top-0 bg-emerald-500" />
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                     <MapPin className={cn("w-4 h-4 text-emerald-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate leading-none mb-1">{p.name}</p>
                     <p className="text-[10px] text-emerald-600 font-bold truncate tracking-tight uppercase">Discovered Land</p>
                  </div>
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                </button>
              </div>
            ))}
            
            {properties.map(p => (
              <div key={p.id} className="flex items-center gap-1 group/item">
                <div className="pl-1">
                  <input 
                    type="checkbox"
                    checked={!hiddenPropertyIds.includes(p.id)}
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
                    hiddenPropertyIds.includes(p.id) && "opacity-60 grayscale-[0.5]"
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

            {candidateSubstations.map(s => (
              <button 
                key={s.id}
                onClick={() => onSelectSubstation(s)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border border-dashed flex items-start gap-3 group relative overflow-hidden bg-indigo-50/30 border-indigo-200",
                  selectedSubstationId === s.id && "bg-indigo-100/50 border-indigo-300 shadow-sm"
                )}
              >
                <div className="w-1 h-full absolute left-0 top-0 bg-indigo-500" />
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                   <Zap className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate leading-none mb-1">{s.name}</p>
                   <p className="text-[10px] text-indigo-400 font-bold truncate tracking-tight uppercase">Discovered Station</p>
                </div>
              </button>
            ))}

            {substations.map(s => (
              <button 
                key={s.id}
                onClick={() => onSelectSubstation(s)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border flex items-start gap-3 group relative overflow-hidden",
                  selectedSubstationId === s.id 
                    ? "bg-blue-50/50 border-blue-200 shadow-sm" 
                    : "bg-white border-transparent hover:bg-slate-50"
                )}
              >
                <div className="w-1 h-full absolute left-0 top-0 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                   <Zap className={cn("w-4 h-4", selectedSubstationId === s.id ? "text-blue-600" : "text-slate-400")} />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate leading-none mb-1">{s.name}</p>
                   <p className="text-[10px] text-slate-400 font-bold truncate tracking-tight uppercase">Verified Infrastructure</p>
                </div>
              </button>
            ))}
         </div>
      </div>
    </div>
  );
}
