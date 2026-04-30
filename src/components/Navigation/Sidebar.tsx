import React from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  List, 
  PieChart, 
  Settings, 
  User,
  Zap 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  view: 'map' | 'list';
  activeCategory: 'properties' | 'substations';
  onViewChange: (view: 'map' | 'list') => void;
  onCategoryChange: (category: 'properties' | 'substations') => void;
  onImportProperty: () => void;
  onAddSubstation: () => void;
  onRestoreDefaults: () => void;
}

export function Sidebar({ 
  isOpen, 
  view, 
  activeCategory, 
  onViewChange, 
  onCategoryChange, 
  onImportProperty, 
  onAddSubstation, 
  onRestoreDefaults 
}: SidebarProps) {
  return (
    <aside className={cn(
      "bg-slate-900 text-white flex flex-col z-20 transition-all duration-300",
      isOpen ? "w-64" : "w-20"
    )}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
          <Zap className="text-white w-6 h-6" />
        </div>
        {isOpen && (
          <span className="font-bold tracking-tight text-xl">PropScope</span>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <SidebarLink 
          icon={<MapIcon />} 
          label="Map" 
          onClick={() => onViewChange('map')} 
          active={view === 'map'} 
          isOpen={isOpen}
        />
        <SidebarLink 
          icon={<List />} 
          label="Properties" 
          onClick={() => {
            onViewChange('list');
            onCategoryChange('properties');
          }} 
          active={view === 'list' && activeCategory === 'properties'} 
          isOpen={isOpen}
        />
        <SidebarLink 
          icon={<PieChart />} 
          label="Substations" 
          onClick={() => {
            onViewChange('list');
            onCategoryChange('substations');
          }} 
          active={view === 'list' && activeCategory === 'substations'} 
          isOpen={isOpen}
        />
        
        <div className={cn("pt-8 pb-4 px-3 space-y-2", !isOpen && "hidden")}>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Integrations</p>
           <button 
              onClick={onImportProperty}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl border border-white/5 text-[10px] font-bold tracking-widest uppercase transition-all"
            >
              Import Record
            </button>
            <button 
              onClick={onAddSubstation}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl border border-white/5 text-[10px] font-bold tracking-widest uppercase transition-all"
            >
              Add Substation
            </button>
        </div>
      </nav>

      <div className="p-4 border-t border-white/5">
        <SidebarLink 
          icon={<Settings />} 
          label="Reset" 
          onClick={onRestoreDefaults} 
          isOpen={isOpen}
        />
      </div>
    </aside>
  );
}

function SidebarLink({ icon, label, onClick, active, isOpen }: { 
  icon: React.ReactNode, 
  label: string, 
  onClick: () => void, 
  active?: boolean,
  isOpen: boolean
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative group",
        active 
          ? "bg-indigo-600 text-white" 
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      <div className="shrink-0">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      {isOpen && <span className="font-bold text-xs uppercase tracking-widest">{label}</span>}
    </button>
  );
}
