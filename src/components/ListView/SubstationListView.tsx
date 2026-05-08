import React, { useState } from 'react';
import { Substation, SUBSTATION_COLOR } from '../../types';
import { MapPin, ArrowUpRight, Trash2, Battery, Zap, Activity, Edit3, Search } from 'lucide-react';

interface SubstationListViewProps {
  substations: Substation[];
  onSelectSubstation: (substation: Substation) => void;
  selectedSubstation?: Substation | null;
  onDeleteSubstation?: (id: string) => void;
  onDeleteMultipleSubstations?: (ids: string[]) => void;
  onEditSubstation?: (substation: Substation) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export default function SubstationListView({ 
  substations, 
  onSelectSubstation, 
  selectedSubstation, 
  onDeleteSubstation,
  onDeleteMultipleSubstations,
  onEditSubstation,
  searchQuery = '',
  setSearchQuery
}: SubstationListViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === substations.length && substations.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(substations.map(s => s.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (onDeleteMultipleSubstations && selectedIds.length > 0) {
      onDeleteMultipleSubstations(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search substations..." 
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 font-bold uppercase tracking-widest outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery?.(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          {substations.length} Infrastructure Nodes
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900 px-6 py-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <p className="text-white text-xs font-bold uppercase tracking-widest leading-none">
              {selectedIds.length} {selectedIds.length === 1 ? 'Station' : 'Stations'} Selected
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors leading-none"
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg hover:shadow-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Selected
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 w-10">
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                      checked={substations.length > 0 && selectedIds.length === substations.length}
                      onChange={toggleSelectAll}
                    />
                  </div>
                </th>
                <th className="px-4 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Substation</th>
                <th className="px-4 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Owner</th>
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
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-[10px] font-medium leading-relaxed">
                    No results found in current index.
                  </td>
                </tr>
              ) : (
                substations.map((sub) => (
                  <tr 
                    key={sub.id} 
                    className={`hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 ${selectedSubstation?.id === sub.id ? 'bg-blue-50/50' : ''} ${selectedIds.includes(sub.id) ? 'bg-slate-50/80 shadow-[inset_4px_0_0_0_#0f172a]' : ''}`}
                    onClick={() => onSelectSubstation(sub)}
                  >
                    <td className="px-6 py-5 w-10" onClick={(e) => toggleSelect(sub.id, e)}>
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          checked={selectedIds.includes(sub.id)}
                          readOnly
                        />
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 tracking-tight">{sub.name}</p>
                            {sub.id.startsWith('candidate-') && (
                              <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[8px] font-black uppercase tracking-widest border border-slate-200">
                                Discovered
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub.voltageKV ? `${sub.voltageKV} kV` : 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[11px] font-bold text-slate-700 tracking-tight">{sub.owner || 'N/A'}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Utility Operator</span>
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
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
