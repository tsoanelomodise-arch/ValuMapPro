import React, { useState } from 'react';
import { Search, Bell, PanelRightClose, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { User } from 'lucide-react';

interface AppHeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onLocationSearch: (location: string) => Promise<void>;
  isGeocoding?: boolean;
}

export function AppHeader({ 
  isSidebarOpen, 
  toggleSidebar, 
  searchQuery, 
  setSearchQuery,
  onLocationSearch,
  isGeocoding = false
}: AppHeaderProps) {
  const [localLocation, setLocalLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localLocation.trim()) {
      onLocationSearch(localLocation);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors shrink-0"
        >
          <PanelRightClose className={cn("w-5 h-5", !isSidebarOpen && "rotate-180")} />
        </button>
        
        {/* Index Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter catalog..." 
            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-2 text-[10px] focus:ring-1 focus:ring-blue-600/10 font-bold uppercase tracking-widest outline-none transition-all placeholder:text-slate-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="h-4 w-px bg-slate-200 mx-2 shrink-0" />

        {/* Global Location Search */}
        <form onSubmit={handleSubmit} className="relative max-w-sm w-full flex items-center gap-2">
           <div className="relative flex-1">
              <MapPin className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5", isGeocoding ? "text-blue-500 animate-pulse" : "text-slate-400")} />
              <input 
                type="text" 
                placeholder="Find Town/City/Suburb (e.g. Bryanston)" 
                className="w-full bg-blue-50/30 border border-blue-100 rounded-lg pl-9 pr-4 py-2 text-[10px] focus:ring-1 focus:ring-blue-600/20 font-bold uppercase tracking-widest outline-none transition-all placeholder:text-slate-400 text-slate-900"
                value={localLocation}
                onChange={(e) => setLocalLocation(e.target.value)}
                disabled={isGeocoding}
              />
           </div>
           <button 
             type="submit"
             disabled={!localLocation.trim() || isGeocoding}
             className="bg-slate-900 text-white p-2 rounded-lg hover:bg-black transition-all disabled:opacity-30 disabled:grayscale"
           >
             {isGeocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
           </button>
        </form>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
           <User className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
