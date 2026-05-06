import React from 'react';
import { X, Zap, Map as MapIcon, Import, Ruler, Info, Shield, MousePointer2, ExternalLink, Mountain, Search, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserGuideModalProps {
  onClose: () => void;
}

export function UserGuideModal({ onClose }: UserGuideModalProps) {
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-none mb-1">PropScope User Guide</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform Features & Tutorials</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Core Navigation & Search */}
          <section>
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MousePointer2 className="w-3 h-3" /> Navigation & Search
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard 
                icon={<MapIcon className="w-4 h-4" />}
                title="Map & List Tabs"
                description="Toggle between spatial visualization on the Map and structured data in the List views."
              />
              <FeatureCard 
                icon={<Search className="w-4 h-4 text-blue-500" />}
                title="Global Search"
                description="Use the search bar in List View or the Spatial Catalog to instantly filter records. Clicking a result zooms the map to its location."
              />
            </div>
          </section>

          {/* Import Features */}
          <section>
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Import className="w-3 h-3" /> Data Importing
            </h3>
            <div className="space-y-4">
              <FeatureItem 
                title="Import P24 Property"
                description="Simply type a property name or address. AI will fetch details from Property24, including prices, agent details, and coordinates."
              />
              <FeatureItem 
                title="Add Substation"
                description="Manually add a substation by name, URL, or coordinates. Use this to track specific infrastructure relevant to your properties."
              />
            </div>
          </section>

          {/* Map Tools */}
          <section>
            <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Specialized Map Tools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard 
                icon={<Zap className="w-4 h-4 text-amber-500" />}
                title="Discovery Tool (Zap)"
                description="Scans the current map area for electrical substations. Now includes owner/operator identification (e.g., Eskom)."
              />
              <FeatureCard 
                icon={<Mountain className="w-4 h-4 text-emerald-500" />}
                title="Land Discovery"
                description="Scans the current map area for Property24 vacant land listings. Precision-locked to your visible screen area."
              />
              <FeatureCard 
                icon={<Ruler className="w-4 h-4" />}
                title="Ruler / Measuring"
                description="Calculate precise straight-line distances between properties and substation points."
              />
            </div>
          </section>

          {/* Smart Alerts */}
          <section>
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Bell className="w-3 h-3" /> Notifications & Alerts
            </h3>
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl flex gap-4">
              <div className="p-3 bg-slate-800 rounded-xl h-fit">
                <Bell className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-[11px]">
                <p className="font-black uppercase tracking-widest mb-1.5">Action Feedback</p>
                <p className="text-slate-400 leading-relaxed font-medium">
                  The system notifies you of discovery results. If no results are found in an area, you'll receive an alert to adjust your map position and try again.
                </p>
              </div>
            </div>
          </section>

          {/* Coordinate Sync */}
          <section>
            <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Smart Sync Features
            </h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm h-fit">
                <ExternalLink className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-800 mb-1">Mirror Link & Coordinates</p>
                <p className="text-slate-500 leading-relaxed">
                  When editing a record, updating <b>Coordinates</b> will automatically update the <b>Google Maps Link</b>. 
                  Alternatively, pasting a Maps Link will instantly extract and update the coordinates.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            Got it, thanks!
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
          {icon}
        </div>
        <h4 className="font-bold text-slate-900 text-sm whitespace-nowrap">{title}</h4>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex gap-4 p-2">
      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
      <div>
        <p className="font-bold text-slate-800 text-sm mb-0.5">{title}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
