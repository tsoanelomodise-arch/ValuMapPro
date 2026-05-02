import React, { useState } from 'react';
import { Property, PROPERTY_TYPE_COLORS } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { MapPin, Ruler, Scaling, ArrowUpRight, Trash2, Edit3 } from 'lucide-react';

interface ListViewProps {
  properties: Property[];
  visiblePropertyIds: string[];
  onToggleVisibility: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onOpenDetails: (property: Property) => void;
  onEditProperty?: (property: Property) => void;
  selectedProperty?: Property | null;
  onDeleteProperty?: (id: string) => void;
}

export default function ListView({ 
  properties, 
  visiblePropertyIds,
  onToggleVisibility,
  onSelectProperty, 
  onOpenDetails, 
  onEditProperty, 
  selectedProperty, 
  onDeleteProperty 
}: ListViewProps) {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center w-10">
                  Visible
                </th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Property</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Zoning</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Erf Size</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Listing Price</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    No results found in current index.
                  </td>
                </tr>
              ) : (
                properties.map((property) => (
                  <tr 
                    key={property.id} 
                    className={`hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 ${selectedProperty?.id === property.id ? 'bg-blue-50/50' : ''} ${!visiblePropertyIds.includes(property.id) ? 'opacity-60 grayscale-[0.5]' : ''}`}
                    onClick={() => onSelectProperty(property)}
                  >
                    <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={visiblePropertyIds.includes(property.id)}
                        onChange={() => onToggleVisibility(property.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mx-auto"
                      />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-1 h-10 rounded-full" 
                          style={{ backgroundColor: PROPERTY_TYPE_COLORS[property.type as keyof typeof PROPERTY_TYPE_COLORS] }}
                        />
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                          <MapPin className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 tracking-tight">{property.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {property.address.suburb}, {property.address.city}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600"
                      >
                        {property.type}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-bold text-slate-700">
                        {property.specs.standSize} m²
                      </span>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col">
                          <span className="text-lg font-bold text-slate-900 tracking-tight tabular-nums">{formatCurrency(property.financials.purchasePrice)}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Market Value</span>
                       </div>
                    </td>
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                       <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => onOpenDetails(property)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Details"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          {onEditProperty && (
                            <button 
                              onClick={() => onEditProperty(property)}
                              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                              title="Edit Record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteProperty && (
                            <button 
                              onClick={() => onDeleteProperty(property.id)}
                              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Remove Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
