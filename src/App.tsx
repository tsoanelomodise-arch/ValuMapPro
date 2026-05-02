/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { mockProperties } from './data/mockProperties';
import { Property, Substation } from './types';
import MapComponent from './components/Map/MapComponent';
import EvaluationDashboard from './components/PropertyDetail/EvaluationDashboard';
import ListView from './components/ListView/ListView';
import SubstationListView from './components/ListView/SubstationListView';
import { Sidebar } from './components/Navigation/Sidebar';
import { AppHeader } from './components/Navigation/AppHeader';
import { SpatialCatalog } from './components/Navigation/SpatialCatalog';
import { 
  X,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Search,
  Plus,
  Home,
  Check,
  Zap
} from 'lucide-react';
import { searchSubstations, AISubstation } from './services/geminiService';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from './lib/utils';

// Custom hook for local storage persistence
function usePersistedState<T>(key: string, defaultValue: T | (() => T)) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved && saved !== 'undefined') {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`Failed to parse persisted state for key "${key}":`, e);
    }
    return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
  });

  useEffect(() => {
    if (state === undefined) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed to persist state for key "${key}":`, e instanceof Error ? e.message : 'Circular structure likely detected');
    }
  }, [key, state]);

  return [state, setState] as const;
}

import SubstationEditModal from './components/Modals/SubstationEditModal';
import SubstationAddForm from './components/Modals/SubstationAddForm';

export default function App() {
  const [properties, setProperties] = usePersistedState<Property[]>('propscope_properties', mockProperties);
  const [substations, setSubstations] = usePersistedState<Substation[]>('propscope_substations', [
    {
      id: 'sub-1',
      name: 'Rosebank Distribution',
      address: '15 Baker St, Rosebank, Johannesburg',
      coordinates: [-26.1311, 28.0536],
      status: 'Active',
      capacity: '44kV / 11kV',
      mvaCapacity: 20,
      voltageKV: 11,
      availableAmps: 1049.7
    },
    {
      id: 'sub-2',
      name: 'Sandton Main',
      address: 'Grayston Dr, Sandton',
      coordinates: [-26.1011, 28.0566],
      status: 'Active',
      capacity: '132kV / 11kV',
      mvaCapacity: 45,
      voltageKV: 11,
      availableAmps: 2361.9
    }
  ]);

  const [view, setView] = useState<'map' | 'list'>('map');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedSubstation, setSelectedSubstation] = useState<Substation | null>(null);
  const [activeCategory, setActiveCategory] = useState<'properties' | 'substations'>('properties');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [listingNumber, setListingNumber] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [isSubstationModalOpen, setIsSubstationModalOpen] = useState(false);
  const [substationToEdit, setSubstationToEdit] = useState<Substation | null>(null);
  const [substationToDelete, setSubstationToDelete] = useState<null | string>(null);
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
  const [pendingSubstation, setPendingSubstation] = useState<Substation | null>(null);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isEditingRequested, setIsEditingRequested] = useState(false);
  const [visiblePropertyIds, setVisiblePropertyIds] = usePersistedState<string[]>('propscope_visible_properties', () => properties.map(p => p.id));

  const togglePropertyVisibility = (id: string) => {
    setVisiblePropertyIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleOpenDetails = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailOpen(true);
  };

  // Memoized filtered data for efficiency
  const filteredProperties = useMemo(() => 
    properties.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.suburb.toLowerCase().includes(searchQuery.toLowerCase())
    ), [properties, searchQuery]);

  const filteredSubstations = useMemo(() =>
    substations.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.status.toLowerCase().includes(searchQuery.toLowerCase())
    ), [substations, searchQuery]);

  const handleImport = useCallback(async () => {
    if (!listingNumber) return;
    if (!/^\d{5,15}$/.test(listingNumber)) {
      alert("Invalid format. Please enter a numeric listing number (e.g., 112233445).");
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      alert("GEMINI_API_KEY is not configured. Please add it to your environment variables.");
      return;
    }

    setIsImporting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find the official Property24 listing for South African property with listing number: ${listingNumber}. 
        Extract the information into the following JSON format. Use Google Search to find the EXACT GPS coordinates (Latitude, Longitude) for this property if possible.
        If certain financial details are not available, estimate them based on standard SA market rates.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Residential', 'Commercial', 'Industrial', 'Agricultural'], description: "Zoning and Classification can never be 'Vacant Land'. If the property is a vacant stand, classify it based on its primary zoning (Residential, Commercial, Industrial, or Agricultural)." },
              description: { type: Type.STRING },
              address: {
                type: Type.OBJECT,
                properties: {
                  street: { type: Type.STRING },
                  suburb: { type: Type.STRING },
                  city: { type: Type.STRING },
                  province: { type: Type.STRING },
                  country: { type: Type.STRING }
                },
                required: ["street", "suburb", "city", "province", "country"]
              },
              coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              specs: {
                type: Type.OBJECT,
                properties: {
                  standSize: { type: Type.NUMBER },
                  titleType: { type: Type.STRING, enum: ['Sectional title', 'Full title'] }
                },
                required: ["standSize", "titleType"]
              },
              financials: {
                type: Type.OBJECT,
                properties: {
                  purchasePrice: { type: Type.NUMBER },
                  marketValue: { type: Type.NUMBER },
                  bondAmount: { type: Type.NUMBER },
                  deposit: { type: Type.NUMBER },
                  interestRate: { type: Type.NUMBER },
                  termYears: { type: Type.NUMBER }
                },
                required: ["purchasePrice", "marketValue", "bondAmount", "interestRate", "termYears"]
              }
            },
            required: ["name", "type", "address", "coordinates", "specs", "financials"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("AI returned no text content");
      
      const rawData = JSON.parse(text);
      const newProperty = rawData as Property;
      
      // Coordinate integrity check and auto-correction for South Africa
      // Leaflet expects [lat, lng]. If we get [lng, lat], we flip them.
      // SA Lats are roughly -20 to -35. SA Lngs are roughly 16 to 33.
      if (newProperty.coordinates && Array.isArray(newProperty.coordinates) && newProperty.coordinates.length >= 2) {
        let [lat, lng] = newProperty.coordinates;
        
        // Basic heuristic: If first coord is positive and second is negative, they are definitely flipped for SA
        if (lat > 0 && lng < 0) {
          [lat, lng] = [lng, lat];
        }
        // If both are positive, and we are expecting SA, one might be flipped and positive? 
        // More research needed, but typically it's just a lat/lng swap.
        
        if (isNaN(lat) || isNaN(lng)) {
          newProperty.coordinates = [-26.1311, 28.0536];
        } else {
          newProperty.coordinates = [lat, lng];
        }
      } else {
        newProperty.coordinates = [-26.1311, 28.0536];
      }
      
      newProperty.id = Math.random().toString(36).substr(2, 9);
      newProperty.listingNumber = listingNumber;
      
      // Construct SEO-friendly P24 URL from AI data
      const suburbSlug = newProperty.address.suburb.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const citySlug = newProperty.address.city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const provinceSlug = (newProperty.address as any).province.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      newProperty.p24Url = `https://www.property24.com/for-sale/${suburbSlug}/${citySlug}/${provinceSlug}/${listingNumber}`;
      
      setProperties(prev => [newProperty, ...prev]);
      setSelectedProperty(newProperty);
      setIsImportModalOpen(false);
      setListingNumber('');
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
    }
  }, [listingNumber, setProperties]);

  const handleRestoreDefaults = useCallback(() => {
    if (confirm("Restore all mock properties? This will clear your current changes.")) {
      setProperties(mockProperties);
      setSubstations([]);
    }
  }, [setProperties, setSubstations]);

  const handleUpdateProperty = useCallback((updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    setSelectedProperty(updatedProperty);
    setIsEditingRequested(false);
  }, [setProperties]);

  const handleUpdateSubstation = useCallback((updatedSub: Substation) => {
    setSubstations(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
    setSubstationToEdit(null);
    if (selectedSubstation?.id === updatedSub.id) {
       setSelectedSubstation(updatedSub);
    }
  }, [setSubstations, selectedSubstation]);

  const handleAddSubstation = useCallback(async (data: { type: 'address' | 'url' | 'coords' | 'direct', value: string, payload?: Substation | Substation[] }) => {
    setIsImporting(true);
    try {
      let candidateSub: Substation | null = null;
      let multipleSubs: Substation[] | null = null;

      if (data.type === 'direct' && data.payload) {
        if (Array.isArray(data.payload)) {
          multipleSubs = data.payload;
        } else {
          candidateSub = { ...data.payload as Substation };
          candidateSub.id = Math.random().toString(36).substr(2, 9);
        }
      } else {
        if (!process.env.GEMINI_API_KEY) {
          alert("GEMINI_API_KEY is not configured.");
          return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const subResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Find technical information about a substation in South Africa based on ${data.type}: ${data.value}. 
          MAKE A SPECIAL EFFORT to find the Operating Voltage (in kV) and Rated Capacity (in MVA).`,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                address: { type: Type.STRING },
                coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                status: { type: Type.STRING, enum: ['Active', 'Under Maintenance', 'Planned'] },
                capacity: { type: Type.STRING },
                voltageKV: { type: Type.NUMBER },
                mvaCapacity: { type: Type.NUMBER },
                googleMapsUrl: { type: Type.STRING }
              },
              required: ["name", "address", "coordinates", "status"]
            }
          }
        });

        const subText = subResponse.text;
        if (!subText) throw new Error("AI returned no text content for substation");
        candidateSub = JSON.parse(subText) as Substation;
        
        // Coordinate integrity check
        if (!candidateSub.coordinates || !Array.isArray(candidateSub.coordinates) || candidateSub.coordinates.length < 2 || isNaN(candidateSub.coordinates[0]) || isNaN(candidateSub.coordinates[1])) {
          candidateSub.coordinates = [-26.1311, 28.0536];
        }

        candidateSub.id = Math.random().toString(36).substr(2, 9);
      }

      if (multipleSubs) {
        setSubstations(prev => [...multipleSubs, ...prev]);
        setIsSubstationModalOpen(false);
      } else if (candidateSub) {
        // Check for duplicates
        const isDuplicate = substations.some(existing => {
          const nameMatch = existing.name.toLowerCase().trim() === candidateSub!.name.toLowerCase().trim();
          const dist = Math.sqrt(
            Math.pow(existing.coordinates[0] - candidateSub!.coordinates[0], 2) +
            Math.pow(existing.coordinates[1] - candidateSub!.coordinates[1], 2)
          );
          const proximityMatch = dist < 0.001; // ~111m
          return nameMatch || proximityMatch;
        });

        if (isDuplicate) {
          setPendingSubstation(candidateSub);
          setIsDuplicateWarningOpen(true);
        } else {
          setSubstations(prev => [candidateSub!, ...prev]);
          setIsSubstationModalOpen(false);
        }
      }
    } catch (error) {
      console.error("Substation add failed:", error);
    } finally {
      setIsImporting(false);
    }
  }, [setSubstations, substations]);

  const confirmAddSubstation = () => {
    if (pendingSubstation) {
      setSubstations(prev => [pendingSubstation, ...prev]);
      setPendingSubstation(null);
      setIsDuplicateWarningOpen(false);
      setIsSubstationModalOpen(false);
    }
  };

  return (
    <div 
      className="flex h-screen bg-slate-50 font-sans text-slate-700 overflow-hidden selection:bg-blue-100 selection:text-blue-900"
      onClick={() => {
        if (isRulerActive) setIsRulerActive(false);
      }}
    >
      <Sidebar 
        isOpen={isSidebarOpen}
        view={view as any}
        activeCategory={activeCategory}
        onViewChange={(v) => setView(v as any)}
        onCategoryChange={setActiveCategory}
        onImportProperty={() => setIsImportModalOpen(true)}
        onAddSubstation={() => setIsSubstationModalOpen(true)}
        onRestoreDefaults={handleRestoreDefaults}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <AppHeader 
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                    {view === 'map' ? 'Spatial Intelligence View' : (activeCategory === 'properties' ? 'Properties' : 'Substations')}
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">Analyzing {activeCategory === 'properties' ? filteredProperties.length : filteredSubstations.length} records</p>
                </div>
                
                <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                  {/* Internal View Toggle */}
                </div>
             </div>

             <div className="flex-1 relative overflow-hidden">
                {view === 'map' ? (
                  <div 
                    key="map-container"
                    className="absolute inset-0 flex"
                  >
                     <SpatialCatalog 
                       properties={filteredProperties}
                       substations={filteredSubstations}
                       selectedPropertyId={selectedProperty?.id}
                       selectedSubstationId={selectedSubstation?.id}
                       visiblePropertyIds={visiblePropertyIds}
                       onToggleVisibility={togglePropertyVisibility}
                       onSelectProperty={handleSelectProperty}
                       onOpenDetails={handleOpenDetails}
                       onSelectSubstation={(s) => {
                         setSelectedSubstation(s);
                         setSelectedProperty(null);
                       }}
                     />

                    <div 
                      className="flex-1 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MapComponent 
                         properties={filteredProperties.filter(p => visiblePropertyIds.includes(p.id))} 
                         substations={filteredSubstations}
                         onSelectProperty={handleSelectProperty} 
                         selectedProperty={selectedProperty}
                         onSelectSubstation={setSelectedSubstation}
                         selectedSubstation={selectedSubstation}
                         rulerActive={isRulerActive}
                         onRulerActiveChange={setIsRulerActive}
                         onOpenDetails={handleOpenDetails}
                         isFullscreen={isFullscreen}
                         onFullscreenChange={setIsFullscreen}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    key="list-container"
                    className="absolute inset-0 overflow-y-auto custom-scrollbar"
                  >
                    {activeCategory === 'properties' ? (
                      <ListView 
                         properties={filteredProperties} 
                         visiblePropertyIds={visiblePropertyIds}
                         onToggleVisibility={togglePropertyVisibility}
                         onSelectProperty={handleSelectProperty}
                         onOpenDetails={handleOpenDetails}
                         onEditProperty={(p) => {
                           setSelectedProperty(p);
                           setIsEditingRequested(true);
                           setIsDetailOpen(true);
                         }}
                         selectedProperty={selectedProperty}
                         onDeleteProperty={setPropertyToDelete}
                      />
                    ) : (
                      <SubstationListView 
                        substations={filteredSubstations}
                        onSelectSubstation={(sub) => {
                          setSelectedSubstation(sub);
                          setView('map');
                        }}
                        selectedSubstation={selectedSubstation}
                        onDeleteSubstation={setSubstationToDelete}
                        onEditSubstation={setSubstationToEdit}
                      />
                    )}
                  </div>
                )}
             </div>

             <div className="absolute bottom-6 right-6 bg-slate-900 text-white rounded-full px-4 py-2 text-[10px] font-semibold tracking-wider flex items-center gap-2 shadow-2xl z-40 border border-slate-800">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                MARKET DATA ACTIVE
             </div>
          </div>

          {selectedProperty && isDetailOpen && (
            <div 
              className="fixed right-0 top-0 h-full w-full lg:w-[600px] xl:w-[700px] bg-white border-l border-slate-200 shadow-2xl z-[6000] flex flex-col transition-transform duration-300 transform translate-x-0"
            >
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Evaluation Dashboard</span>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-xs">{selectedProperty.name}</h2>
                    </div>
                    {(selectedProperty.p24Url || selectedProperty.listingNumber) && (
                      <a 
                        href={selectedProperty.p24Url || `https://www.property24.com/for-sale/${selectedProperty.address.suburb.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${selectedProperty.address.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${selectedProperty.listingNumber}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 hover:bg-slate-100 transition-colors uppercase tracking-widest"
                      >
                        <ExternalLink className="w-3 h-3" /> P24
                      </a>
                    )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDetailOpen(false);
                    }}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 text-slate-400 hover:text-slate-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-hidden">
                    <EvaluationDashboard 
                      property={selectedProperty} 
                      substations={substations}
                      onDeleteProperty={setPropertyToDelete}
                      onUpdateProperty={handleUpdateProperty}
                      onRefineProperty={() => {/* logic moved to dashboard or separate handler */}}
                      initialEditMode={isEditingRequested}
                    />
                </div>
              </div>
          )}
        </div>
      </main>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
          <div 
            onClick={() => !isImporting && setIsImportModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60"
          />
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-200"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                     <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">External Data Link</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Import from Property24</h3>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isImporting) setIsImportModalOpen(false);
                  }} 
                  disabled={isImporting}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                 <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                       <ExternalLink className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Enter the Property24 Listing Number. Our system will analyze the baseline and extract regional spatial data.
                    </p>
                 </div>

                 <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Listing Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 114455667"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-xl px-5 py-4 text-sm font-semibold outline-none transition-all placeholder:text-slate-300"
                      value={listingNumber}
                      onChange={(e) => setListingNumber(e.target.value)}
                      disabled={isImporting}
                    />
                 </div>

                 <button 
                   onClick={handleImport}
                   disabled={isImporting || !listingNumber}
                   className="w-full bg-slate-900 disabled:bg-slate-200 text-white font-semibold py-4 rounded-xl shadow-xl hover:bg-slate-800 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
                 >
                   {isImporting ? (
                     <>
                       <Loader2 className="w-5 h-5 animate-spin" />
                       Processing...
                     </>
                   ) : (
                     "Initialize Import"
                   )}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSubstationModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
          <div 
            onClick={() => !isImporting && setIsSubstationModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60"
          />
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-200"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                     <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Infrastructure Analysis</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Add Substation</h3>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isImporting) setIsSubstationModalOpen(false);
                  }} 
                  disabled={isImporting}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <SubstationAddForm 
                onAdd={handleAddSubstation} 
                isSubmitting={isImporting} 
              />
            </div>
          </div>
        </div>
      )}

      {substationToEdit && (
        <SubstationEditModal 
          substation={substationToEdit}
          onClose={() => setSubstationToEdit(null)}
          onSave={handleUpdateSubstation}
        />
      )}

      {isDuplicateWarningOpen && pendingSubstation && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6">
          <div 
            onClick={() => setIsDuplicateWarningOpen(false)}
            className="absolute inset-0 bg-slate-900/60"
          />
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1 tracking-tight">Potential Duplicate</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 px-4">
                A substation with a similar name or location already exists. Do you want to continue adding this record anyway?
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={confirmAddSubstation}
                  className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all text-[11px] tracking-widest uppercase"
                >
                  Continue & Add
                </button>
                <button 
                  onClick={() => {
                    setIsDuplicateWarningOpen(false);
                    setPendingSubstation(null);
                  }}
                  className="w-full bg-slate-50 text-slate-500 font-semibold py-3.5 rounded-xl hover:bg-slate-100 transition-all text-[11px] tracking-widest uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(propertyToDelete || substationToDelete) && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
          <div 
            onClick={() => {
              setPropertyToDelete(null);
              setSubstationToDelete(null);
            }}
            className="absolute inset-0 bg-slate-900/60"
          />
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1 tracking-tight">Remove Resource?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 px-4">
                {substationToDelete 
                  ? "This record will be permanently purged from the spatial database."
                  : "This property analysis and all associated data will be removed."}
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (propertyToDelete) {
                      setProperties(prev => prev.filter(p => p.id !== propertyToDelete));
                      setPropertyToDelete(null);
                      setSelectedProperty(null);
                    }
                    if (substationToDelete) {
                      setSubstations(prev => prev.filter(s => s.id !== substationToDelete));
                      setSubstationToDelete(null);
                      setSelectedSubstation(null);
                    }
                  }}
                  className="w-full bg-red-600 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:bg-red-700 transition-all text-[11px] tracking-widest uppercase"
                >
                  Confirm Removal
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPropertyToDelete(null);
                    setSubstationToDelete(null);
                  }}
                  className="w-full bg-slate-50 text-slate-500 font-semibold py-3.5 rounded-xl hover:bg-slate-100 transition-all text-[11px] tracking-widest uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .leaflet-container { width: 100%; height: 100%; border-radius: 0.75rem; }
      `}</style>
    </div>
  );
}

// Modal components moved to separate files for performance and maintainability
