import React, { useState } from 'react';
import { Substation, SUBSTATION_COLOR } from '../../types';
import { MapPin, ArrowUpRight, Trash2, Battery, Zap, Activity, Edit3 } from 'lucide-react';

interface SubstationListViewProps {
  substations: Substation[];
  onSelectSubstation: (substation: Substation) => void;
  selectedSubstation?: Substation | null;
  onDeleteSubstation?: (id: string) => void;
  onEditSubstation?: (substation: Substation) => void;
}

export default function SubstationListView({ 
  substations, 
  onSelectSubstation, 
  selectedSubstation, 
  onDeleteSubstation,
  onEditSubstation
}: SubstationListViewProps) {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Substation</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Capacity</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Voltage</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Available Amps</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {substations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-[10px] font-medium leading-relaxed">
                    No results found in current index.
                  </td>
                </tr>
              ) : (
                substations.map((sub) => (
                  <tr 
                    key={sub.id} 
                    className={`hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 ${selectedSubstation?.id === sub.id ? 'bg-indigo-50/50' : ''}`}
                    onClick={() => onSelectSubstation(sub)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 tracking-tight">{sub.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">Distribution Node</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span 
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                          sub.status === 'Active' ? 'bg-green-50 text-green-700' : 
                          'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center text-sm font-bold text-slate-700">
                      {sub.mvaCapacity ? `${sub.mvaCapacity} MVA` : 'N/A'}
                    </td>
                    <td className="px-6 py-5 text-center text-sm font-bold text-slate-700">
                      {sub.voltageKV ? `${sub.voltageKV} kV` : 'N/A'}
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className="text-sm font-bold text-slate-900 tabular-nums">
                         {sub.availableAmps ? sub.availableAmps.toFixed(1) : '0'} A
                       </span>
                    </td>
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                         <button 
                          onClick={() => onSelectSubstation(sub)}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Locate Node"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        {onEditSubstation && (
                          <button 
                            onClick={() => onEditSubstation(sub)}
                            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteSubstation && (
                          <button 
                            onClick={() => onDeleteSubstation(sub.id)}
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
