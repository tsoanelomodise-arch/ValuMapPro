import React from 'react';
import { X, Navigation2, Zap, Home, ArrowRight, User, Phone, Briefcase, Hash, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
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
  'data-html2canvas-ignore'?: string;
}

export default function MapDetailsOverlay({
  property,
  substation,
  closestSubstationInfo,
  isFullscreen,
  onCloseProperty,
  onCloseSubstation,
  onOpenDetails,
  ...props
}: MapDetailsOverlayProps) {
  if (!property && !substation) return null;

  if (property) {
    return (
      <motion.div 
        drag
        dragMomentum={false}
        className={cn(
          "absolute top-4 right-4 z-[1000] cursor-move",
          isFullscreen ? "w-80 md:w-96" : "w-72"
        )}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        {...props}
      >
        <div className="bg-white overflow-hidden rounded-xl shadow-xl border border-slate-200 max-h-[calc(100vh-2rem)] overflow-y-auto pointer-events-auto">
          <div className="p-3 pl-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 cursor-move">
            <h3 className="font-bold text-slate-900 text-sm leading-tight tracking-tight truncate max-w-[80%]">{property.name}</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onCloseProperty();
              }} 
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div 
            className="p-4 pt-3 cursor-pointer hover:bg-slate-50 transition-colors group/modal"
            onClick={() => onOpenDetails(property)}
          >
            <div className="space-y-2.5">
              {/* Core Financials & Stats */}
              <div className="flex items-start gap-2.5 text-[11px]">
                <div className="mt-1 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="font-bold text-slate-500 uppercase tracking-tighter text-[9px]">Asking Price:</span>
                  <span className="text-slate-900 font-bold">R {property.financials.purchasePrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-[11px]">
                <div className="mt-1 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                  <span className="font-bold text-blue-500 uppercase tracking-tighter text-[9px]">Grid Dist:</span>
                  <span className="text-blue-700 font-bold">
                    {closestSubstationInfo ? `${(closestSubstationInfo.distance / 1000).toFixed(2)}km` : 'N/A'}
                  </span>
                  {closestSubstationInfo && (
                    <span className="text-slate-400 text-[10px] font-medium truncate max-w-[120px]">
                      ({closestSubstationInfo.substation.name})
                    </span>
                  )}
                </div>
              </div>

              {/* Listing Details */}
              {(property.agent || property.agentPhone || property.listingNumber) && (
                <div className="pt-1 flex flex-col gap-2">
                  {property.agent && (
                    <div className="flex items-start gap-2.5 text-[11px]">
                      <div className="mt-1 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="font-bold text-slate-500 uppercase tracking-tighter text-[9px]">Agent:</span>
                        <span className="text-slate-900 font-bold">{property.agent}</span>
                        {property.agentPhone && (
                          <span className="text-slate-400 font-medium">{property.agentPhone}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {property.listingNumber && (
                    <div className="flex items-start gap-2.5 text-[11px]">
                      <div className="mt-1 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="font-bold text-slate-500 uppercase tracking-tighter text-[9px]">P24 Ref:</span>
                        <a 
                          href={`https://www.property24.com/property-details/${property.listingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-900 font-bold hover:text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {property.listingNumber}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Spatial / Location */}
              <div className="flex items-start gap-2.5 text-[11px] pt-1">
                <div className="mt-1 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-500 uppercase tracking-tighter text-[9px]">Location:</span>
                  <div className="text-[10px] text-slate-600 font-medium leading-tight">
                    {property.address.street}, {property.address.suburb}, {property.address.city}
                  </div>
                  <div className="font-mono text-[9px] text-slate-400">
                    GPS: {property.coordinates[0].toFixed(6)}, {property.coordinates[1].toFixed(6)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover/modal:opacity-100 transition-opacity">
              <span>View Full Report</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (substation) {
    return (
      <motion.div 
        drag
        dragMomentum={false}
        className={cn(
          "absolute top-4 right-4 z-[1000] cursor-move",
          isFullscreen ? "w-72" : "w-64"
        )}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        {...props}
      >
        <div className="bg-white overflow-hidden rounded-2xl shadow-2xl border border-slate-200 pointer-events-auto">
          <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center cursor-move">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-blue-600" />
              <span className="text-[9px] font-black rounded bg-blue-100 text-blue-700 px-2 py-0.5 uppercase tracking-widest">
                Infrastructure
              </span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onCloseSubstation();
              }} 
              className="p-1 hover:bg-blue-100 rounded-full transition-colors cursor-pointer"
            >
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

            <div className="flex items-center gap-2 text-[9px] font-black text-blue-400 italic">
               <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
               Grid-Connected & Active
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
