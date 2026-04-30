import React from 'react';
import { X, Navigation2, Zap, Home, ArrowRight } from 'lucide-react';
import { Property, Substation } from '../../types';
import { cn } from '../../lib/utils';

interface MapDetailsOverlayProps {
  property: Property | null;
  substation: Substation | null;
  closestSubstationInfo: { substation: Substation; distance: number } | null;
  isFullscreen: boolean;
  onCloseProperty: () => void;
  onCloseSubstation: () => void;
  onOpenDetails: (property: Property) => void;
}

export default function MapDetailsOverlay({
  property,
  substation,
  closestSubstationInfo,
  isFullscreen,
  onCloseProperty,
  onCloseSubstation,
  onOpenDetails
}: MapDetailsOverlayProps) {
  if (!property && !substation) return null;

  if (property) {
    return (
      <div className={cn(
        "absolute top-4 right-4 z-[1000] transition-all duration-300",
        isFullscreen ? "w-80 md:w-96" : "w-72"
      )}>
        <div className="bg-white overflow-hidden rounded-xl shadow-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
              {property.type}
            </span>
            <button onClick={onCloseProperty} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-6">
            <h3 className="font-bold text-slate-900 text-xl leading-tight tracking-tight mb-2">{property.name}</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">
              {property.address.street}, {property.address.suburb}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valuation</p>
                <p className="text-sm font-bold text-slate-900">R {property.financials.purchasePrice.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Grid Distance</p>
                <p className="text-sm font-bold text-indigo-600">
                  {closestSubstationInfo ? `${(closestSubstationInfo.distance / 1000).toFixed(2)}km` : 'N/A'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => onOpenDetails(property)}
              className="w-full py-4 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              Analyze Record <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (substation) {
    return (
      <div className={cn(
        "absolute top-4 right-4 z-[1000] transition-all transform",
        substation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
        isFullscreen ? "w-72" : "w-64"
      )}>
        <div className="bg-white overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
          <div className="p-3 bg-violet-50 border-b border-violet-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-violet-600" />
              <span className="text-[9px] font-black rounded bg-violet-100 text-violet-700 px-2 py-0.5 uppercase tracking-widest">
                Infrastructure
              </span>
            </div>
            <button onClick={onCloseSubstation} className="p-1 hover:bg-violet-100 rounded-full transition-colors">
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
          <div className="p-5">
            <h3 className="font-black text-slate-900 truncate leading-tight uppercase italic">{substation.name}</h3>
            <p className="text-[10px] text-slate-500 mt-1 mb-4 truncate">{substation.address}</p>
            
            <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-slate-400 uppercase tracking-widest">Status</span>
                <span className="text-green-600 uppercase tracking-widest">{substation.status}</span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-slate-400 uppercase tracking-widest">Capacity</span>
                <span className="text-slate-900 uppercase">{substation.capacity || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-black text-violet-400 italic">
               <div className="w-1 h-1 bg-violet-400 rounded-full animate-pulse" />
               Grid-Connected & Active
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
