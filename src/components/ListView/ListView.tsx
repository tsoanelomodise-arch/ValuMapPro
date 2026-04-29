import React from 'react';
import { Property, PROPERTY_TYPE_COLORS } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Home, MapPin, Ruler, Scaling, ArrowUpRight } from 'lucide-react';

interface ListViewProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  selectedProperty?: Property | null;
}

export default function ListView({ properties, onSelectProperty, selectedProperty }: ListViewProps) {
  return (
    <div className="bg-white overflow-hidden rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resource Entity</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sector</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metrics</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valuation</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {properties.map((property) => (
              <tr 
                key={property.id} 
                className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${selectedProperty?.id === property.id ? 'bg-blue-50/30' : ''}`}
                onClick={() => onSelectProperty(property)}
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                      <Home className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 leading-none mb-1.5">{property.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 non-italic">
                        <MapPin className="w-3.5 h-3.5" /> {property.address.street}, {property.address.suburb}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span 
                    className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter"
                    style={{ 
                      backgroundColor: `${PROPERTY_TYPE_COLORS[property.type as keyof typeof PROPERTY_TYPE_COLORS]}15`,
                      color: PROPERTY_TYPE_COLORS[property.type as keyof typeof PROPERTY_TYPE_COLORS]
                    }}
                  >
                    {property.type}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold non-italic">
                    {property.specs.bedrooms > 0 && <span className="flex items-center gap-1.5"><Scaling className="w-3.5 h-3.5 text-slate-300" /> {property.specs.bedrooms} BR</span>}
                    <span className="flex items-center gap-1.5 italic font-bold text-slate-700">{property.specs.floorSize}m²</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                   <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(property.financials.purchasePrice)}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Estimated Market</span>
                   </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all border border-transparent hover:border-blue-100">
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
