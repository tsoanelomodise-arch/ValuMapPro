import React, { useState } from 'react';
import { Search, Plus, Check, Loader2, X, Zap } from 'lucide-react';
import { Substation } from '../../types';
import { searchSubstations, AISubstation, verifySubstationAddress } from '../../services/geminiService';
import { cn } from '../../lib/utils';

interface SubstationSearchPanelProps {
  onAdd: (data: { type: 'address' | 'url' | 'coords' | 'direct', value: string, payload?: Substation | Substation[] }) => void;
  onShowCandidates?: (candidates: Substation[]) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export default function SubstationSearchPanel({ onAdd, onShowCandidates, onClose, isSubmitting }: SubstationSearchPanelProps) {
  const [type, setType] = useState<'ai_search' | 'address' | 'url' | 'coords'>('ai_search');
  const [value, setValue] = useState('');
  const [searchResults, setSearchResults] = useState<AISubstation[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAISearch = async () => {
    if (!value) return;
    setIsSearching(true);
    setError(null);
    setSelectedIndices(new Set());
    try {
      const results = await searchSubstations(value);
      if (results.length === 0) {
        setError("No direct substation matches found for this specific area.");
      }
      setSearchResults(results);
    } catch (error) {
      console.error("AI Search failed:", error);
      setError("AI search service failed. Try a broader location.");
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

  const handleBulkImport = async () => {
    if (selectedIndices.size === 0) return;
    setIsVerifying(true);
    try {
      const selected = searchResults.filter((_, idx) => selectedIndices.has(idx));
      const verifiedItems = await Promise.all(selected.map(async (item) => {
        const verifiedAddress = await verifySubstationAddress(item.name, item.address);
        return { ...item, address: verifiedAddress };
      }));

      const subs: Substation[] = verifiedItems.map(aiSub => ({
        id: Math.random().toString(36).substr(2, 9),
        name: aiSub.name,
        owner: aiSub.owner,
        address: aiSub.address,
        coordinates: aiSub.coordinates as [number, number],
        status: 'Active',
        capacity: aiSub.mvaCapacity ? `${aiSub.mvaCapacity} MVA` : 'Verified via AI',
        voltageKV: aiSub.voltageKV,
        mvaCapacity: aiSub.mvaCapacity
      }));

      onAdd({ type: 'direct', value: 'Imported from AI Search', payload: subs });
      onClose();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] w-[340px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Infrastructure Search</span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex p-1 bg-slate-100 rounded-xl">
          {(['ai_search', 'address', 'url', 'coords'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setSearchResults([]); }}
              className={cn(
                "flex-1 px-2 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap",
                type === t ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t === 'ai_search' ? 'AI' : t}
            </button>
          ))}
        </div>

        {type === 'ai_search' ? (
          <div className="space-y-3">
            <div className="relative">
              <input 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                placeholder="Region name..."
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none pr-10"
              />
              <button 
                onClick={handleAISearch}
                disabled={isSearching || !value}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isVerifying && (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl animate-pulse">
                <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Verifying Data...</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                  {searchResults.map((sub, i) => (
                    <div 
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                        selectedIndices.has(i) ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-900 uppercase truncate">{sub.name}</p>
                        <p className="text-[9px] text-slate-500 truncate mb-0">{sub.address}</p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                        selectedIndices.has(i) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200"
                      )}>
                        {selectedIndices.has(i) && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleBulkImport}
                  disabled={selectedIndices.size === 0 || isVerifying}
                  className="w-full bg-slate-900 text-white font-black py-2.5 rounded-xl text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  Confirm {selectedIndices.size} selected
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'address' ? 'Location...' : type === 'url' ? 'URL...' : 'lat, lng...'}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
            />
            <button 
              onClick={() => { onAdd({ type, value }); onClose(); }}
              disabled={isSubmitting || !value}
              className="w-full bg-slate-900 text-white font-black py-2.5 rounded-xl text-[9px] uppercase tracking-widest"
            >
              Verify & Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
