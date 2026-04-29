/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { mockProperties } from './data/mockProperties';
import { Property } from './types';
import MapComponent from './components/Map/MapComponent';
import EvaluationDashboard from './components/PropertyDetail/EvaluationDashboard';
import ListView from './components/ListView/ListView';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  List, 
  PieChart, 
  Settings, 
  Search, 
  Bell,
  ChevronRight,
  User,
  PanelRightClose,
  Download,
  X,
  Loader2,
  ExternalLink,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('propscope_properties');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return mockProperties;
      }
    }
    return mockProperties;
  });
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [listingNumber, setListingNumber] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('propscope_properties', JSON.stringify(properties));
  }, [properties]);

  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.suburb.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImport = async () => {
    if (!listingNumber) return;

    // Validation: ensure listing number is numeric and has a valid length range
    if (!/^\d{5,15}$/.test(listingNumber)) {
      alert("Invalid format. Please enter a numeric listing number (e.g., 112233445).");
      return;
    }

    setIsImporting(true);
    try {
      // Import logic will rely on Gemini Search Grounding
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find the official Property24 listing for South African property with listing number: ${listingNumber}. 
        Extract the information into the following JSON format. If certain financial details (like bond, deposit, interest) are not available, 
        estimate them based on standard SA market rates (11% interest, 20% deposit, etc.) for evaluation purposes. 
        Ensure you find the correct coordinates for the address.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              address: {
                type: Type.OBJECT,
                properties: {
                  street: { type: Type.STRING },
                  suburb: { type: Type.STRING },
                  city: { type: Type.STRING },
                  country: { type: Type.STRING }
                },
                required: ["street", "suburb", "city", "country"]
              },
              coordinates: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                minItems: 2,
                maxItems: 2
              },
              specs: {
                type: Type.OBJECT,
                properties: {
                  bedrooms: { type: Type.NUMBER },
                  bathrooms: { type: Type.NUMBER },
                  garages: { type: Type.NUMBER },
                  carports: { type: Type.NUMBER },
                  floorSize: { type: Type.NUMBER },
                  standSize: { type: Type.NUMBER },
                  titleType: { type: Type.STRING },
                  floor: { type: Type.STRING }
                }
              },
              financials: {
                type: Type.OBJECT,
                properties: {
                  purchasePrice: { type: Type.NUMBER },
                  marketValue: { type: Type.NUMBER },
                  expectedGrowth: { type: Type.NUMBER },
                  bondAmount: { type: Type.NUMBER },
                  deposit: { type: Type.NUMBER },
                  interestRate: { type: Type.NUMBER },
                  termYears: { type: Type.NUMBER },
                  income: { type: Type.NUMBER },
                  expenses: { type: Type.NUMBER }
                }
              }
            },
            required: ["name", "type", "address", "coordinates", "specs", "financials"]
          }
        }
      });

      const newProperty = JSON.parse(response.text) as Property;
      newProperty.id = listingNumber || Math.random().toString(36).substr(2, 9);
      
      setProperties(prev => [newProperty, ...prev]);
      setSelectedProperty(newProperty);
      setIsImportModalOpen(false);
      setListingNumber('');
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import property. Please verify the listing number.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteProperty = (id: string) => {
    setPropertyToDelete(id);
  };

  const confirmDelete = () => {
    if (propertyToDelete) {
      setProperties(prev => prev.filter(p => p.id !== propertyToDelete));
      if (selectedProperty?.id === propertyToDelete) {
        setSelectedProperty(null);
      }
      setPropertyToDelete(null);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm("Restore all mock properties? This will clear your current changes.")) {
      setProperties(mockProperties);
      localStorage.removeItem('propscope_properties');
    }
  };

  const handleUpdateProperty = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    setSelectedProperty(updatedProperty);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* App Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-lg",
        isSidebarOpen ? "w-80" : "w-20"
      )}>
        <div className="p-6 border-b border-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <div>
              <span className="font-bold tracking-tight text-lg text-slate-800">ValuMap Pro</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider -mt-1">Property Evaluation</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <SidebarLink icon={<LayoutDashboard />} label="Dashboard" active />
          <SidebarLink icon={<MapIcon />} label="Explore Map" onClick={() => setView('map')} active={view === 'map'} />
          <SidebarLink icon={<List />} label="Properties" onClick={() => setView('list')} active={view === 'list'} />
          <SidebarLink icon={<PieChart />} label="Portfolio" />
          
          <div className="pt-4 pb-2 px-4">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Integrations</p>
             <button 
                onClick={() => setIsImportModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-900 px-4 py-3 rounded-xl border border-slate-200 transition-all text-xs font-bold shadow-sm group"
             >
                <div className="w-5 h-5 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                   <div className="w-2 h-2 bg-blue-600 rounded-sm" />
                </div>
                IMPORT PROPERTY24
             </button>
          </div>

          <SidebarLink icon={<Settings />} label="Restore Defaults" onClick={handleRestoreDefaults} />
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300 overflow-hidden">
               <User className="w-5 h-5 text-slate-500" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">Sarah Jenkins</p>
                <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-tight">Lead Appraiser</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
            >
              <PanelRightClose className={cn("w-5 h-5", !isSidebarOpen && "rotate-180")} />
            </button>
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search areas, projects, addresses..." 
                className="w-full bg-slate-100/50 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-2 relative cursor-pointer text-slate-400 hover:text-slate-900 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </div>
          </div>
        </header>

        {/* View Layout */}
        <div className="flex-1 flex overflow-hidden map-grid relative">
          <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                    {view === 'map' ? 'Interactive Spatial View' : 'Property Collection'}
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">Analyzing {filteredProperties.length} records in active viewport</p>
                </div>
                
                <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                  <button 
                    onClick={() => setView('map')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      view === 'map' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-slate-400 hover:text-slate-900"
                    )}
                  >
                    <MapIcon className="w-4 h-4" /> MAP
                  </button>
                  <button 
                    onClick={() => setView('list')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      view === 'list' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-slate-400 hover:text-slate-900"
                    )}
                  >
                    <List className="w-4 h-4" /> LIST
                  </button>
                </div>
             </div>

             <div className="flex-1 overflow-hidden">
               {view === 'map' ? (
                 <MapComponent 
                    properties={filteredProperties} 
                    onSelectProperty={setSelectedProperty} 
                    selectedProperty={selectedProperty}
                 />
               ) : (
                 <ListView 
                    properties={filteredProperties} 
                    onSelectProperty={setSelectedProperty}
                    selectedProperty={selectedProperty}
                    onDeleteProperty={handleDeleteProperty}
                 />
               )}
             </div>

             {/* Dynamic Market Pill */}
             <div className="absolute bottom-6 right-6 bg-slate-900 text-white rounded-full px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-2xl z-40">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                LIVE MARKET DATA: +2.4% THIS MONTH
             </div>
          </div>

          {/* Right Evaluation Drawer */}
          <AnimatePresence>
            {selectedProperty && (
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full lg:w-[600px] xl:w-[750px] bg-white border-l border-slate-200 shadow-2xl relative z-50 flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">Analysis Engine</span>
                    <h2 className="text-xl font-bold text-slate-800">{selectedProperty.name}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedProperty(null)}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-all border border-slate-200 text-slate-400 hover:text-slate-900"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                   <EvaluationDashboard 
                    property={selectedProperty} 
                    onDeleteProperty={handleDeleteProperty}
                    onUpdateProperty={handleUpdateProperty}
                   />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isImporting && setIsImportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-200"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="w-2 h-2 bg-blue-600 rounded-full" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">External Data Link</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight italic">IMPORT FROM PROPERTY24</h3>
                  </div>
                  {!isImporting && (
                    <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                   <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center shrink-0">
                         <Download className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-xs text-blue-700 font-medium leading-relaxed italic">
                        Enter the Property24 Listing Number below. Our AI engine will fetch publicly available data, 
                        geolocate the coordinates, and generate a baseline evaluation report.
                      </p>
                   </div>

                   <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase mb-2 block tracking-tight">Listing Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 114455667"
                        className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-5 py-4 text-sm font-bold transition-all outline-none"
                        value={listingNumber}
                        onChange={(e) => setListingNumber(e.target.value)}
                        disabled={isImporting}
                      />
                      <p className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1 italic">
                        <ExternalLink className="w-3 h-3" /> Usually found at the end of the Property24 URL
                      </p>
                   </div>

                   <button 
                     onClick={handleImport}
                     disabled={isImporting || !listingNumber}
                     className="w-full bg-slate-900 disabled:bg-slate-300 text-white font-black py-4 rounded-xl shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 italic"
                   >
                     {isImporting ? (
                       <>
                         <Loader2 className="w-5 h-5 animate-spin" />
                         FETCHING ANALYTICS...
                       </>
                     ) : (
                       "INITIALIZE IMPORT"
                     )}
                   </button>
                </div>
              </div>
              
              <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center gap-8">
                 <div className="flex items-center gap-2 opacity-40">
                    <div className="w-4 h-4 bg-slate-400 rounded-sm" />
                    <span className="text-[9px] font-bold text-slate-900 uppercase">PropScope AI</span>
                 </div>
                 <div className="w-1 h-1 bg-slate-300 rounded-full" />
                 <div className="flex items-center gap-2 opacity-40">
                    <div className="w-4 h-4 bg-slate-400 rounded-sm" />
                    <span className="text-[9px] font-bold text-slate-900 uppercase">Maps Grounding</span>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {propertyToDelete && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPropertyToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200 p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 italic">REMOVE RESOURCE?</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">
                  This property evaluation and all associated spatial data will be permanently removed from your collection.
                </p>
                
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={confirmDelete}
                    className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-lg shadow-red-600/10 hover:bg-red-700 transition-all italic text-sm"
                  >
                    CONFIRM TERMINATION
                  </button>
                  <button 
                    onClick={() => setPropertyToDelete(null)}
                    className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-xl hover:bg-slate-200 transition-all italic text-sm"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global CSS for scrollbars and custom patterns */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .leaflet-container {
          width: 100%;
          height: 100%;
          border-radius: 0.75rem;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}

function SidebarLink({ icon, label, onClick, active = false }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
        active ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      )}
    >
      <div className={cn("transition-transform group-hover:scale-110", active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")}>
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
    </button>
  );
}
