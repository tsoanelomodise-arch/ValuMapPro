import React from 'react';
import { Search, Bell, PanelRightClose } from 'lucide-react';
import { cn } from '../../lib/utils';
import { User } from 'lucide-react';

interface AppHeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function AppHeader({ isSidebarOpen, toggleSidebar, searchQuery, setSearchQuery }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
        >
          <PanelRightClose className={cn("w-5 h-5", !isSidebarOpen && "rotate-180")} />
        </button>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search index..." 
            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-indigo-600/10 font-bold uppercase tracking-widest outline-none transition-all placeholder:text-slate-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
           <User className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
