import React, { useState } from 'react';
import { Search, Plus, Check, Loader2, X, Zap } from 'lucide-react';
import { Substation } from '../../types';
import { searchSubstations, AISubstation } from '../../services/geminiService';
import { cn } from '../../lib/utils';

interface SubstationAddFormProps {
  onAdd: (data: { type: 'address' | 'url' | 'coords' | 'direct', value: string, payload?: Substation | Substation[] }) => void;
  onShowCandidates?: (candidates: Substation[]) => void;
  isSubmitting: boolean;
}

export default function SubstationAddForm({ onAdd, onShowCandidates, isSubmitting }: SubstationAddFormProps) {
  const [type, setType] = useState<'address' | 'url' | 'coords' | 'ai_search'>('ai_search');
  const [value, setValue] = useState('');
  const [searchResults, setSearchResults] = useState<AISubstation[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  const handleAISearch = async () => {
    if (!value) return;
    setIsSearching(true);
    setSelectedIndices(new Set());
    try {
      const results = await searchSubstations(value);
      setSearchResults(results);
    } catch (error) {
      console.error("AI Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === searchResults.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(searchResults.map((_, i) => i)));
    }
  };

  const handleBulkImport = () => {
    if (selectedIndices.size === 0) return;
    
    const selected = searchResults.filter((_, idx) => selectedIndices.has(idx));
    const subs: Substation[] = selected.map(aiSub => {
      let safeCoords = aiSub.coordinates;
      if (!safeCoords || !Array.isArray(safeCoords) || safeCoords.length < 2 || isNaN(safeCoords[0]) || isNaN(safeCoords[1])) {
        safeCoords = [-26.1311, 28.0536];
      } else {
        let [lat, lng] = safeCoords;
        // South Africa specific coordinate correction: Lats are negative, Lngs are positive
        if (lat > 0 && lng < 0) {
          [lat, lng] = [lng, lat];
        } else if (lat > 0 && lng > 0 && lat < 18) { // Likely swapped lat/lng for SA
           [lat, lng] = [lng, lat];
        }
        safeCoords = [lat, lng];
      }
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: aiSub.name,
        address: aiSub.address,
        coordinates: safeCoords as [number, number],
        status: 'Active',
        capacity: aiSub.mvaCapacity ? `${aiSub.mvaCapacity} MVA` : (aiSub.description || 'Verified via AI'),
        voltageKV: aiSub.voltageKV,
        mvaCapacity: aiSub.mvaCapacity
      };
    });

    if (subs.length === 1) {
      onAdd({ type: 'direct', value: subs[0].name, payload: subs[0] });
    } else {
      onAdd({ type: 'direct', value: 'Imported from AI Search', payload: subs });
    }
    setSearchResults([]);
    setSelectedIndices(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto custom-scrollbar">
        {(['ai_search', 'address', 'url', 'coords'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setSearchResults([]);
            }}
            className={cn(
              "flex-1 px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap",
              type === t ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t === 'ai_search' ? 'AI Guided Search' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {type === 'ai_search' ? (
          <div className="space-y-3">
            <div className="relative">
              <input 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Region or City name..."
                className="w-full bg-slate-100 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none pr-12"
              />
              <button 
                onClick={handleAISearch}
                disabled={isSearching || !value}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Found {searchResults.length} Substations
                  </span>
                  <button onClick={toggleSelectAll} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">
                    {selectedIndices.size === searchResults.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {searchResults.map((sub, i) => (
                    <div 
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                        selectedIndices.has(i) ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-black text-slate-900 uppercase truncate">{sub.name}</p>
                          {sub.voltageKV && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-bold">
                              {sub.voltageKV}kV
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate italic mb-1">{sub.address}</p>
                        {sub.mvaCapacity && (
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            Capacity: {sub.mvaCapacity} MVA
                          </p>
                        )}
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                        selectedIndices.has(i) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 bg-white group-hover:border-indigo-400"
                      )}>
                        {selectedIndices.has(i) && <Check className="w-4 h-4 font-black" />}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleBulkImport}
                    disabled={selectedIndices.size === 0}
                    className="flex-1 bg-slate-900 text-white font-black py-3 rounded-xl shadow-lg disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                  >
                    <Plus className="w-4 h-4" /> Import {selectedIndices.size} selected
                  </button>
                  
                  {onShowCandidates && (
                    <button 
                      onClick={() => {
                        const selected = searchResults.filter((_, idx) => selectedIndices.has(idx));
                        const subs: Substation[] = selected.map((aiSub, i) => ({
                          id: `candidate-${Date.now()}-${i}`,
                          name: aiSub.name,
                          address: aiSub.address,
                          coordinates: (Array.isArray(aiSub.coordinates) && aiSub.coordinates.length >= 2) ? aiSub.coordinates : [-26.1311, 28.0536],
                          status: 'Planned',
                          voltageKV: aiSub.voltageKV,
                          mvaCapacity: aiSub.mvaCapacity,
                          capacity: aiSub.voltageKV ? `${aiSub.voltageKV}kV` : undefined
                        }));
                        onShowCandidates(subs.length > 0 ? subs : searchResults.map((aiSub, i) => ({
                           id: `candidate-all-${Date.now()}-${i}`,
                           name: aiSub.name,
                           address: aiSub.address,
                           coordinates: (Array.isArray(aiSub.coordinates) && aiSub.coordinates.length >= 2) ? aiSub.coordinates : [-26.1311, 28.0536],
                           status: 'Planned',
                           voltageKV: aiSub.voltageKV,
                           mvaCapacity: aiSub.mvaCapacity,
                           capacity: aiSub.voltageKV ? `${aiSub.voltageKV}kV` : undefined
                        })));
                      }}
                      className="px-4 bg-indigo-50 text-indigo-600 font-black py-3 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-indigo-100"
                    >
                      <Zap className="w-4 h-4" /> Preview
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <input 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'address' ? 'Street, Suburb, City...' : type === 'url' ? 'Google Maps URL...' : 'Latitude, Longitude...'}
              className="w-full bg-slate-100 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none"
            />
            <button 
              onClick={() => onAdd({ type, value })}
              disabled={isSubmitting || !value}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Add"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
