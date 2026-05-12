/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Zap,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  Database
} from 'lucide-react';
import { searchVacantLandByLocationName, geocodeLocation, verifySubstationAddress, AISubstation } from './services/geminiService';
import { cn } from './lib/utils';
import { usePersistedState } from './hooks/usePersistedState';
import { useNotifications } from './hooks/useNotifications';
import { useDiscovery } from './hooks/useDiscovery';
import { useImport } from './hooks/useImport';

import SubstationEditModal from './components/Modals/SubstationEditModal';
import SubstationAddForm from './components/Modals/SubstationAddForm';
import { UserGuideModal } from './components/Modals/UserGuideModal';

export default function App() {
  const [properties, setProperties] = usePersistedState<Property[]>('propscope_properties', []);
  const [substations, setSubstations] = usePersistedState<Substation[]>('propscope_substations', []);

  const [view, setView] = useState<'map' | 'list'>('map');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedSubstation, setSelectedSubstation] = useState<Substation | null>(null);
  const [activeCategory, setActiveCategory] = useState<'properties' | 'substations'>('properties');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [propertiesToDelete, setPropertiesToDelete] = useState<string[] | null>(null);
  const [substationsToDelete, setSubstationsToDelete] = useState<string[] | null>(null);
  const [isSubstationModalOpen, setIsSubstationModalOpen] = useState(false);
  const [isSpatialPanelOpen, setIsSpatialPanelOpen] = usePersistedState('is-spatial-panel-open', true);
  const [isSpatialPanelWide, setIsSpatialPanelWide] = usePersistedState('is-spatial-panel-wide', false);
  const [substationToEdit, setSubstationToEdit] = useState<Substation | null>(null);
  const [substationToDelete, setSubstationToDelete] = useState<null | string>(null);
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
  const [pendingSubstation, setPendingSubstation] = useState<Substation | null>(null);
  const [pendingProperty, setPendingProperty] = useState<Property | null>(null);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isEditingRequested, setIsEditingRequested] = useState(false);
  const [hiddenPropertyIds, setHiddenPropertyIds] = usePersistedState<string[]>('propscope_hidden_properties', []);
  const [candidateSubstations, setCandidateSubstations] = usePersistedState<Substation[]>('propscope_candidate_substations', []);
  const [candidateProperties, setCandidateProperties] = usePersistedState<Property[]>('propscope_candidate_properties', []);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const { notifications, addNotification, removeNotification } = useNotifications();

  const {
    isDiscovering,
    isDiscoveringLand,
    discoveryProgress,
    handleDiscoverNearby,
    handleDiscoverLand,
    handleCancelDiscovery
  } = useDiscovery({
    substations,
    setCandidateSubstations,
    candidateSubstations,
    setCandidateProperties,
    addNotification,
    selectedSubstation
  });

  const {
    isImporting,
    importValue,
    setImportValue,
    handleImportProperty,
    handleAddSubstation,
    handleCancelImport
  } = useImport({
    setPendingProperty,
    setPendingSubstation,
    setCandidateSubstations,
    setSubstations,
    setView,
    setIsImportModalOpen,
    setIsSubstationModalOpen,
    addNotification
  });

  const togglePropertyVisibility = useCallback((id: string) => {
    setHiddenPropertyIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, [setHiddenPropertyIds]);

  const handleAddLandToPortfolio = useCallback((land: Property) => {
    setProperties(prev => {
      const newLand = { ...land, id: land.id.replace('candidate-land-', 'prop-') };
      return [newLand, ...prev.filter(p => p.id !== land.id)];
    });
    setSelectedProperty(prev => prev?.id === land.id ? { ...land, id: land.id.replace('candidate-land-', 'prop-') } : prev);
  }, [setProperties]);

  const handleSelectProperty = useCallback((property: Property) => {
    setSelectedProperty(property);
    setView('map');
    setIsDetailOpen(true);
  }, []);

  const handleSelectSubstation = useCallback((substation: Substation) => {
    setSelectedSubstation(substation);
    setSelectedProperty(null);
    setView('map');
  }, []);

  const handleOpenDetails = useCallback((property: Property) => {
    setSelectedProperty(property);
    setIsDetailOpen(true);
  }, []);

  const handleLocationSearch = useCallback(async (location: string) => {
    setIsGeocoding(true);
    try {
      const result = await geocodeLocation(location);
      if (result && result.coordinates) {
        setMapCenter(result.coordinates);
        addNotification(`Geocoded ${result.name}. Searching for Properties...`, 'info');
        
        setSelectedProperty(null);
        setSelectedSubstation(null);

        const foundLand = await searchVacantLandByLocationName(location);
        if (foundLand.length > 0) {
          setCandidateProperties(prev => {
            const existingUrls = new Set(prev.map(p => p.p24Url));
            const newProps = foundLand
              .filter(p => !existingUrls.has(p.p24Url))
              .map(p => ({
                ...p,
                id: `candidate-land-${Math.random().toString(36).slice(2, 11)}`,
                status: 'Candidate',
                discoveryDate: new Date().toISOString()
              })) as Property[];
            return [...newProps, ...prev];
          });
          addNotification(`Discovered ${foundLand.length} properties in ${result.name}`, 'success');
        } else {
          addNotification(`Geocoded ${result.name} but no direct listings found.`, 'info');
        }
      } else {
        addNotification(`Could not find location: ${location}`, 'error');
      }
    } catch (error) {
       addNotification(`Search failed: ${location}`, 'error');
    } finally {
      setIsGeocoding(false);
    }
  }, [addNotification, setCandidateProperties]);

  // Memoized filtered data for efficiency
  const filteredProperties = useMemo(() => 
    properties.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.street.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
    ), [properties, searchQuery]);

  const filteredCandidateProperties = useMemo(() => 
    candidateProperties.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.street.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
    ), [candidateProperties, searchQuery]);

  const filteredSubstations = useMemo(() =>
    substations.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.status.toLowerCase().includes(searchQuery.toLowerCase())
    ), [substations, searchQuery]);

  const filteredCandidateSubstations = useMemo(() =>
    candidateSubstations.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.status.toLowerCase().includes(searchQuery.toLowerCase())
    ), [candidateSubstations, searchQuery]);

  const allFilteredProperties = useMemo(() => 
    [...filteredProperties, ...filteredCandidateProperties], 
    [filteredProperties, filteredCandidateProperties]);

  const allFilteredSubstations = useMemo(() => 
    [...filteredSubstations, ...filteredCandidateSubstations], 
    [filteredSubstations, filteredCandidateSubstations]);

  const handleDiscoverLandStub = () => {}; // Removed old large handler
  const handleDiscoverNearbyStub = () => {}; // Removed old large handler

  const handleAddCandidate = useCallback(async (candidate: Substation) => {
    addNotification(`Verifying address for ${candidate.name} via Maps...`, 'info');
    const verifiedAddress = await verifySubstationAddress(candidate.name, candidate.address);
    const newSub: Substation = {
      ...candidate,
      address: verifiedAddress,
      id: `sub-${Date.now()}`,
      status: 'Active' // Set to active once confirmed
    };
    setSubstations(prev => [...prev, newSub]);
    setCandidateSubstations(prev => prev.filter(c => c.id !== candidate.id));
    addNotification(`Added ${newSub.name} to infrastructure portfolio.`, 'success');
  }, [setSubstations, setCandidateSubstations, addNotification]);

  const handleAddCandidateProperty = useCallback((candidate: Property) => {
    const newProp: Property = {
      ...candidate,
      id: `prop-${Date.now()}`
    };
    setProperties(prev => [...prev, newProp]);
    setCandidateProperties(prev => prev.filter(p => p.id !== candidate.id));
    setSelectedProperty(newProp);
    addNotification(`Added ${newProp.name} to property portfolio.`, 'success');
  }, [setProperties, addNotification]);

  const handleDeleteCandidateProperty = useCallback((id: string) => {
    setCandidateProperties(prev => prev.filter(p => p.id !== id));
    if (selectedProperty?.id === id) {
      setSelectedProperty(null);
      setIsDetailOpen(false);
    }
    addNotification("Candidate property removed.", 'info');
  }, [setCandidateProperties, selectedProperty, addNotification]);

  const handleDeleteCandidateSubstation = useCallback((id: string) => {
    setCandidateSubstations(prev => prev.filter(s => s.id !== id));
    if (selectedSubstation?.id === id) {
      setSelectedSubstation(null);
    }
    addNotification("Infrastructure discovery discarded.", 'info');
  }, [setCandidateSubstations, selectedSubstation, addNotification]);

  const handleImport = async () => {
    await handleImportProperty(importValue);
  };

  const confirmAddProperty = useCallback(() => {
    if (pendingProperty) {
      setProperties(prev => [pendingProperty, ...prev]);
      setSelectedProperty(pendingProperty);
      setPendingProperty(null);
      setImportValue('');
    }
  }, [pendingProperty, setProperties]);

  const handleClearCatalog = useCallback(() => {
    if (confirm("Clear all records and candidates? This action cannot be undone.")) {
      setProperties([]);
      setSubstations([]);
      setCandidateProperties([]);
      setCandidateSubstations([]);
      addNotification("Spatial catalog cleared.", "info");
    }
  }, [setProperties, setSubstations, setCandidateProperties, setCandidateSubstations, addNotification]);

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


  const confirmAddSubstation = useCallback(() => {
    if (pendingSubstation) {
      // Check for duplicates
      const isDuplicate = substations.some(existing => {
        const nameMatch = existing.name.toLowerCase().trim() === pendingSubstation!.name.toLowerCase().trim();
        
        if (!existing.coordinates || !pendingSubstation?.coordinates) return nameMatch;
        
        const dist = Math.sqrt(
          Math.pow(existing.coordinates[0] - pendingSubstation.coordinates[0], 2) +
          Math.pow(existing.coordinates[1] - pendingSubstation.coordinates[1], 2)
        );
        const proximityMatch = dist < 0.001; // ~111m
        return nameMatch || proximityMatch;
      });

      if (isDuplicate && !isDuplicateWarningOpen) {
        setIsDuplicateWarningOpen(true);
        return;
      }

      setSubstations(prev => [pendingSubstation, ...prev]);
      setPendingSubstation(null);
      setIsDuplicateWarningOpen(false);
      setIsSubstationModalOpen(false);
    }
  }, [pendingSubstation, substations, isDuplicateWarningOpen, setSubstations]);

  return (
    <div 
      className="flex h-screen bg-slate-50 font-sans text-slate-700 overflow-hidden selection:bg-blue-100 selection:text-blue-900"
      onClick={() => {
        if (isRulerActive) setIsRulerActive(false);
      }}
    >
      {!isFullscreen && (
        <Sidebar 
          isOpen={isSidebarOpen}
          view={view as any}
          activeCategory={activeCategory}
          onViewChange={(v) => {
            setView(v as any);
            setIsFullscreen(false);
          }}
          onCategoryChange={setActiveCategory}
          onImportProperty={() => setIsImportModalOpen(true)}
          onAddSubstation={() => setIsSubstationModalOpen(true)}
          onRestoreDefaults={handleClearCatalog}
          onShowUserGuide={() => setIsUserGuideOpen(true)}
        />
      )}

      <main className={cn("flex-1 flex flex-col overflow-hidden relative transition-all duration-500", isFullscreen ? "m-0" : "")}>
        {!isFullscreen && (
          <AppHeader 
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onLocationSearch={handleLocationSearch}
            isGeocoding={isGeocoding}
          />
        )}

        <div className="flex-1 flex overflow-hidden relative">
          {/* Spatial Catalog Slide-in/out implementation without problematic motion components for reliability */}
          <div className={cn("flex-1 flex flex-col overflow-hidden relative", isFullscreen ? "p-0" : "p-6 gap-4")}>
             {!isFullscreen && (
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsSpatialPanelOpen(!isSpatialPanelOpen)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase tracking-[0.2em] z-20 shadow-sm",
                        isSpatialPanelOpen 
                          ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {isSpatialPanelOpen ? (
                        <>
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Hide Records
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3.5 h-3.5" />
                          Show Records
                        </>
                      )}
                    </button>

                    {isSpatialPanelOpen && (
                      <button
                        onClick={() => setIsSpatialPanelWide(!isSpatialPanelWide)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase tracking-[0.2em] z-20",
                          isSpatialPanelWide
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                        title={isSpatialPanelWide ? "Narrow View" : "Wide View"}
                      >
                        {isSpatialPanelWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        {isSpatialPanelWide ? "Narrow Index" : "Expand Index"}
                      </button>
                    )}
                    <div className="h-4 w-px bg-slate-200 mx-1 hidden md:block" />
                    <div>
                      <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                        {view === 'map' ? 'Spatial Intelligence View' : (activeCategory === 'properties' ? 'Properties' : 'Substations')}
                      </h1>
                      <p className="text-slate-500 text-xs mt-1">Analyzing {activeCategory === 'properties' ? allFilteredProperties.length : allFilteredSubstations.length} records</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button
                      onClick={() => {
                      setView('map');
                      setIsFullscreen(false);
                    }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        view === 'map' ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <Plus className={cn("w-3.5 h-3.5", view === 'map' ? "text-indigo-400" : "text-slate-400")} />
                      Spatial Index
                    </button>
                    <button
                      onClick={() => {
                      setView('list');
                      setIsFullscreen(false);
                    }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        view === 'list' ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <Search className={cn("w-3.5 h-3.5", view === 'list' ? "text-indigo-400" : "text-slate-400")} />
                      Catalog View
                    </button>
                  </div>
               </div>
             )}

            <div className={cn("flex-1 relative overflow-hidden", isFullscreen ? "h-full w-full" : "")}>
               {view === 'map' ? (
                 <div className="absolute inset-0 flex">
                   {!isFullscreen && (
                     <div className={cn(
                       "h-full overflow-hidden shrink-0 transition-all duration-500 ease-in-out relative",
                       !isSpatialPanelOpen ? "w-0 opacity-0 pointer-events-none mr-0" : 
                       isSpatialPanelWide ? "w-[500px] opacity-100 mr-4" : "w-80 opacity-100 mr-4"
                     )}>
                       <div className={cn(
                         "h-full border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden transition-all duration-500",
                         isSpatialPanelWide ? "w-[500px]" : "w-80"
                       )}>
                         <SpatialCatalog 
                           properties={filteredProperties}
                           candidateProperties={filteredCandidateProperties}
                           substations={filteredSubstations}
                           candidateSubstations={filteredCandidateSubstations}
                           selectedPropertyId={selectedProperty?.id}
                           selectedSubstationId={selectedSubstation?.id}
                           hiddenPropertyIds={hiddenPropertyIds}
                           onToggleVisibility={togglePropertyVisibility}
                           onDeleteCandidateProperty={handleDeleteCandidateProperty}
                           onSelectProperty={handleSelectProperty}
                           onOpenDetails={handleOpenDetails}
                           onSelectSubstation={handleSelectSubstation}
                           searchQuery={searchQuery}
                           setSearchQuery={setSearchQuery}
                         />
                       </div>
                     </div>
                   )}
                   
                   <div className="flex-1 relative">
                     <MapComponent 
                        properties={filteredProperties.filter(p => !hiddenPropertyIds.includes(p.id))} 
                        substations={filteredSubstations}
                        candidateSubstations={filteredCandidateSubstations}
                        candidateProperties={filteredCandidateProperties}
                        onSelectProperty={handleSelectProperty} 
                        selectedProperty={selectedProperty}
                        onSelectSubstation={handleSelectSubstation}
                        selectedSubstation={selectedSubstation}
                        onAddSubstation={handleAddCandidate}
                        onDeleteCandidateSubstation={handleDeleteCandidateSubstation}
                        onAddProperty={handleAddCandidateProperty}
                        onDeleteCandidateProperty={handleDeleteCandidateProperty}
                        onDiscoverNearby={handleDiscoverNearby}
                        onDiscoverLand={handleDiscoverLand}
                        onCancelDiscovery={handleCancelDiscovery}
                        onClearCandidates={() => {
                          setCandidateSubstations([]);
                          setCandidateProperties([]);
                        }}
                        isDiscovering={isDiscovering}
                        isDiscoveringLand={isDiscoveringLand}
                        discoveryProgress={discoveryProgress}
                        rulerActive={isRulerActive}
                        onRulerActiveChange={setIsRulerActive}
                        onOpenDetails={handleOpenDetails}
                        isFullscreen={isFullscreen}
                        onFullscreenChange={setIsFullscreen}
                        mapCenterOverride={mapCenter}
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
                         properties={allFilteredProperties} 
                         hiddenPropertyIds={hiddenPropertyIds}
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
                         onDeleteMultipleProperties={setPropertiesToDelete}
                         searchQuery={searchQuery}
                         setSearchQuery={setSearchQuery}
                      />
                    ) : (
                      <SubstationListView 
                        substations={allFilteredSubstations}
                        onSelectSubstation={handleSelectSubstation}
                        selectedSubstation={selectedSubstation}
                        onDeleteSubstation={setSubstationToDelete}
                        onDeleteMultipleSubstations={setSubstationsToDelete}
                        onEditSubstation={setSubstationToEdit}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
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
        </div>
      </main>

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
                    href={selectedProperty.p24Url || `https://www.property24.com/for-sale/${selectedProperty.address.suburb.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${selectedProperty.address.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${(selectedProperty.address as any).province?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'gauteng'}/${selectedProperty.listingNumber}`} 
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
                  onDeleteCandidate={handleDeleteCandidateProperty}
                  onUpdateProperty={handleUpdateProperty}
                  onAddCandidate={handleAddLandToPortfolio}
                  initialEditMode={isEditingRequested}
                />
            </div>
          </div>
      )}

          {isUserGuideOpen && (
        <UserGuideModal onClose={() => setIsUserGuideOpen(false)} />
      )}

      {discoveryProgress && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-6 animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 p-5 ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 block leading-none mb-1">
                    AI Land Discovery
                  </span>
                  <span className="text-xs font-bold text-white">
                    {discoveryProgress.total === 1 ? 'Mapping Region...' : 'Harvesting Coordinates...'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-white tabular-nums">
                  {discoveryProgress.total > 1 ? `${discoveryProgress.current}/${discoveryProgress.total}` : 'Scanning'}
                </span>
              </div>
            </div>
            
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 ease-in-out"
                style={{ 
                  width: discoveryProgress.total > 1 
                    ? `${Math.max(2, (discoveryProgress.current / discoveryProgress.total) * 100)}%` 
                    : "40%" 
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                 PropScope Intelligence Grid
               </p>
               <button 
                 onClick={handleCancelDiscovery}
                 className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
               >
                 Cancel search
               </button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
          <div 
            onClick={handleCancelImport}
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
                  <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Import Property Analysis</h3>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelImport();
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
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
                      Enter the Property24 URL or Listing Number. Our system will analyze the baseline and extract regional spatial data.
                    </p>
                 </div>

                 <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">P24 Link or Reference</label>
                    <input 
                      type="text" 
                      placeholder="Paste Property24 URL or listing number..."
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-xl px-5 py-4 text-sm font-semibold outline-none transition-all placeholder:text-slate-300"
                      value={importValue}
                      onChange={(e) => setImportValue(e.target.value)}
                      disabled={isImporting}
                    />
                 </div>

                 <button 
                   onClick={handleImport}
                   disabled={isImporting || !importValue}
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
            onClick={handleCancelImport}
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
                    handleCancelImport();
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <SubstationAddForm 
                onAdd={handleAddSubstation} 
                onShowCandidates={(candidates) => {
                  setCandidateSubstations(candidates);
                  setIsSubstationModalOpen(false);
                  setView('map');
                }}
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

      {pendingProperty && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6">
          <div 
            onClick={() => setPendingProperty(null)}
            className="absolute inset-0 bg-slate-900/60"
          />
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-200"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Data Analysis Complete</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Review Imported Property</h3>
                </div>
                <button 
                  onClick={() => setPendingProperty(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{pendingProperty.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{pendingProperty.address.suburb}, {pendingProperty.address.city}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    {pendingProperty.type}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price</p>
                    <p className="text-sm font-bold text-slate-700">R {pendingProperty.financials.purchasePrice?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Size</p>
                    <p className="text-sm font-bold text-slate-700">{pendingProperty.specs.standSize} m²</p>
                  </div>
                </div>

                {pendingProperty.p24Url && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">External Reference</p>
                    <a 
                      href={pendingProperty.p24Url} 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-lg transition-colors"
                    >
                      View on {pendingProperty.p24Url.includes('privateproperty') ? 'Private Property' : 'Property24'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={confirmAddProperty}
                  className="flex-1 bg-slate-900 text-white font-semibold py-4 rounded-xl shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
                >
                  <Check className="w-4 h-4" />
                  Add to Spatial Database
                </button>
                <button 
                  onClick={() => setPendingProperty(null)}
                  className="px-6 bg-slate-100 text-slate-500 font-semibold py-4 rounded-xl hover:bg-slate-200 transition-all text-xs tracking-widest uppercase"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingSubstation && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 text-slate-700">
          <div 
            onClick={() => {
              setPendingSubstation(null);
              setIsDuplicateWarningOpen(false);
            }}
            className="absolute inset-0 bg-slate-900/60"
          />
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-200"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                     <span className={cn("w-1.5 h-1.5 rounded-full", isDuplicateWarningOpen ? "bg-amber-500" : "bg-indigo-500")} />
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                       {isDuplicateWarningOpen ? "Duplicate Detection" : "Entity Analysis Ready"}
                     </span>
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    {isDuplicateWarningOpen ? "Substation Duplicate Warning" : "Review Substation Details"}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setPendingSubstation(null);
                    setIsDuplicateWarningOpen(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isDuplicateWarningOpen && (
                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">Conflict Detected</h4>
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                      This substation appears to already exist in your catalog (either by name or extreme proximity). Adding it may create redundant data.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 pr-4">
                    <h4 className="font-bold text-slate-900 text-lg truncate">{pendingSubstation.name}</h4>
                    <p className="text-xs text-slate-500 font-medium truncate mb-1">{pendingSubstation.address}</p>
                    <div className="font-mono text-[9px] text-slate-400">
                      GPS: {pendingSubstation.coordinates ? `${pendingSubstation.coordinates[0].toFixed(6)}, ${pendingSubstation.coordinates[1].toFixed(6)}` : 'Unknown'}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      Substation
                    </span>
                    {pendingSubstation.voltageKV && (
                      <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold">
                        {pendingSubstation.voltageKV} kV
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Capacity</p>
                    <p className="text-sm font-bold text-slate-700">{pendingSubstation.mvaCapacity ? `${pendingSubstation.mvaCapacity} MVA` : (pendingSubstation.capacity || 'N/A')}</p>
                  </div>
                  <div className="space-y-1 text-right">
                     {pendingSubstation.googleMapsUrl && (
                        <a 
                          href={pendingSubstation.googleMapsUrl} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex flex-col items-end"
                        >
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">External Data</span>
                          View on Google Maps
                        </a>
                     )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={confirmAddSubstation}
                  className={cn(
                    "flex-1 font-semibold py-4 rounded-xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xs tracking-widest uppercase",
                    isDuplicateWarningOpen ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
                  )}
                >
                  <Check className="w-4 h-4" />
                  {isDuplicateWarningOpen ? "Add Anyway" : "Confirm & Import"}
                </button>
                <button 
                  onClick={() => {
                    setPendingSubstation(null);
                    setIsDuplicateWarningOpen(false);
                  }}
                  className="px-6 bg-slate-100 text-slate-500 font-semibold py-4 rounded-xl hover:bg-slate-200 transition-all text-xs tracking-widest uppercase"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(propertyToDelete || propertiesToDelete || substationToDelete || substationsToDelete) && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
          <div 
            onClick={() => {
              setPropertyToDelete(null);
              setPropertiesToDelete(null);
              setSubstationToDelete(null);
              setSubstationsToDelete(null);
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
              <h3 className="text-lg font-semibold text-slate-900 mb-1 tracking-tight">
                {propertiesToDelete ? `Remove ${propertiesToDelete.length} Properties?` : 
                 substationsToDelete ? `Remove ${substationsToDelete.length} Stations?` : 
                 'Remove Resource?'}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 px-4">
                {substationToDelete || substationsToDelete
                  ? "Selected records will be permanently purged from the spatial database."
                  : propertiesToDelete 
                    ? "All selected property analyses and associated data will be removed."
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
                    if (propertiesToDelete) {
                      setProperties(prev => prev.filter(p => !propertiesToDelete.includes(p.id)));
                      setCandidateProperties(prev => prev.filter(p => !propertiesToDelete.includes(p.id)));
                      setPropertiesToDelete(null);
                      if (selectedProperty && propertiesToDelete.includes(selectedProperty.id)) {
                        setSelectedProperty(null);
                        setIsDetailOpen(false);
                      }
                    }
                    if (substationToDelete) {
                      setSubstations(prev => prev.filter(s => s.id !== substationToDelete));
                      setCandidateSubstations(prev => prev.filter(s => s.id !== substationToDelete));
                      setSubstationToDelete(null);
                      setSelectedSubstation(null);
                    }
                    if (substationsToDelete) {
                      setSubstations(prev => prev.filter(s => !substationsToDelete.includes(s.id)));
                      setCandidateSubstations(prev => prev.filter(s => !substationsToDelete.includes(s.id)));
                      setSubstationsToDelete(null);
                      if (selectedSubstation && substationsToDelete.includes(selectedSubstation.id)) {
                        setSelectedSubstation(null);
                      }
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
                    setPropertiesToDelete(null);
                    setSubstationToDelete(null);
                    setSubstationsToDelete(null);
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
      {/* Toast Notifications */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-3 z-[10000] pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id}
            className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 pointer-events-auto backdrop-blur-md",
              n.type === 'success' ? "bg-emerald-600/90 text-white border-emerald-500" :
              n.type === 'error' ? "bg-red-600/90 text-white border-red-500" :
              "bg-slate-900/90 text-white border-slate-800"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              n.type === 'success' ? "bg-emerald-500" :
              n.type === 'error' ? "bg-red-500" :
              "bg-slate-800"
            )}>
              {n.type === 'success' && <Check className="w-4 h-4" />}
              {n.type === 'error' && <AlertTriangle className="w-4 h-4" />}
              {n.type === 'info' && <Search className="w-4 h-4" />}
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest leading-none">{n.message}</span>
            <button 
              onClick={() => removeNotification(n.id)}
              className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Modal components moved to separate files for performance and maintainability
