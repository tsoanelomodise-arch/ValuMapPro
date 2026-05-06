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
import { 
  searchSubstations, 
  searchSubstationsByArea, 
  searchVacantLandByArea, 
  findLandListingLinks,
  importPropertyListing,
  searchSubstationDetails,
  AISubstation 
} from './services/geminiService';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
import { UserGuideModal } from './components/Modals/UserGuideModal';

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
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedSubstation, setSelectedSubstation] = useState<Substation | null>(null);
  const [activeCategory, setActiveCategory] = useState<'properties' | 'substations'>('properties');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [propertiesToDelete, setPropertiesToDelete] = useState<string[] | null>(null);
  const [isSubstationModalOpen, setIsSubstationModalOpen] = useState(false);
  const [substationToEdit, setSubstationToEdit] = useState<Substation | null>(null);
  const [substationToDelete, setSubstationToDelete] = useState<null | string>(null);
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
  const [pendingSubstation, setPendingSubstation] = useState<Substation | null>(null);
  const [pendingProperty, setPendingProperty] = useState<Property | null>(null);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isEditingRequested, setIsEditingRequested] = useState(false);
  const [hiddenPropertyIds, setHiddenPropertyIds] = usePersistedState<string[]>('propscope_hidden_properties', []);
  const [candidateSubstations, setCandidateSubstations] = useState<Substation[]>([]);
  const [candidateProperties, setCandidateProperties] = useState<Property[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isDiscoveringLand, setIsDiscoveringLand] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState<{ current: number, total: number } | null>(null);
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info' }[]>([]);
  const discoveryAbortControllerRef = React.useRef<AbortController | null>(null);
  const importAbortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelDiscovery = useCallback(() => {
    if (discoveryAbortControllerRef.current) {
      discoveryAbortControllerRef.current.abort();
      discoveryAbortControllerRef.current = null;
    }
    setIsDiscovering(false);
    setIsDiscoveringLand(false);
    setDiscoveryProgress(null);
  }, []);

  const handleCancelImport = useCallback(() => {
    if (importAbortControllerRef.current) {
      importAbortControllerRef.current.abort();
      importAbortControllerRef.current = null;
    }
    setIsImporting(false);
    setIsImportModalOpen(false);
    setIsSubstationModalOpen(false);
  }, []);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const togglePropertyVisibility = useCallback((id: string) => {
    setHiddenPropertyIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, [setHiddenPropertyIds]);

  const handleAddLandToPortfolio = useCallback((land: Property) => {
    setProperties(prev => {
      // Remove the candidate ID prefix to make it a permanent record
      const newLand = { 
        ...land, 
        id: land.id.replace('candidate-land-', 'prop-'),
        // Ensure it's not marked as candidate anymore if we use a flag in future
      };
      // Remove the candidate from the list and add the "real" one
      return [newLand, ...prev.filter(p => p.id !== land.id)];
    });
    // Keep detail open but update selected property to the new one
    setSelectedProperty(prev => prev?.id === land.id ? { ...land, id: land.id.replace('candidate-land-', 'prop-') } : prev);
  }, [setProperties]);

  const handleSelectProperty = useCallback((property: Property) => {
    setSelectedProperty(property);
    setView('map');
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

  // Memoized filtered data for efficiency
  const filteredProperties = useMemo(() => 
    properties.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.street.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
    ), [properties, searchQuery]);

  const filteredSubstations = useMemo(() =>
    substations.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.status.toLowerCase().includes(searchQuery.toLowerCase())
    ), [substations, searchQuery]);

  const handleDiscoverLand = useCallback(async (bounds: { north: number, south: number, east: number, west: number }) => {
    if (discoveryAbortControllerRef.current) {
      discoveryAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    discoveryAbortControllerRef.current = controller;

    setIsDiscoveringLand(true);
    setCandidateProperties([]);
    setDiscoveryProgress({ current: 0, total: 1 }); // Start with indeterminate phase
    
    console.log("Starting Land Discovery with bounds:", bounds);
    try {
      // Find substations within or very near the current visible bounds to prioritize search near them
      const visibleSubstations = (substations || []).filter(s => {
        if (!s.coordinates || !Array.isArray(s.coordinates)) return false;
        const [lat, lng] = s.coordinates;
        // Expand bounds slightly to catch nearby stations
        return lat <= bounds.north + 0.05 && 
               lat >= bounds.south - 0.05 && 
               lng <= bounds.east + 0.05 && 
               lng >= bounds.west - 0.05;
      }).map(s => `${s.name} (approx. ${s.coordinates[0].toFixed(4)}, ${s.coordinates[1].toFixed(4)})`);

      if (visibleSubstations.length > 0) {
        console.log("Prioritizing discovery near substations:", visibleSubstations);
      }

      // Phase 1: Find listing links
      addNotification("Searching Property24 and Private Property databases...", 'info');
      console.log("Land Discovery: Searching area", { north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west, substations: visibleSubstations });
      const links = await findLandListingLinks(bounds.north, bounds.south, bounds.east, bounds.west, visibleSubstations);
      console.log("Land Discovery: Found links", links);
      
      if (controller.signal.aborted) return;

      if (!links || links.length === 0) {
        addNotification("No vacant land listings found in this area. Try zooming out or moving the map.", 'info');
        setIsDiscoveringLand(false);
        setDiscoveryProgress(null);
        return;
      }

      addNotification(`Found ${links.length} candidate URLs. Harvesting details...`, 'info');
      setDiscoveryProgress({ current: 0, total: links.length });
      
      // Phase 2: Iterate and discover details one by one
      let count = 0;
      for (let i = 0; i < links.length; i++) {
        if (controller.signal.aborted) break;
        
        const link = links[i];
        setDiscoveryProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        
        try {
          const res = await importPropertyListing(link);
          if (res && !controller.signal.aborted) {
            // Extract coordinates and handle South Africa specifics
            let finalCoords = res.coordinates;
            if (Array.isArray(finalCoords) && finalCoords.length >= 2) {
              let [lat, lng] = finalCoords;
              // In SA, lat is negative (~ -22 to -35) and lng is positive (~ 16 to 33)
              // Handle potential flipped or positive inputs from model
              if (lat > 0 && lng < 0) {
                finalCoords = [lng, lat];
              } else if (lat > 0 && lat < 40 && lng > 0) {
                finalCoords = [-lat, lng];
              }
            }

            if (!finalCoords || !Array.isArray(finalCoords) || isNaN(finalCoords[0])) {
               console.warn("Skipping property due to missing coordinates:", res.name);
               continue;
            }

            const newCandidate: Property = {
              ...res,
              id: `candidate-land-${Date.now()}-${i}`,
              coordinates: finalCoords as [number, number],
              type: 'Agricultural',
              specs: res.specs || { standSize: 1000, titleType: 'Full title' },
              financials: {
                purchasePrice: res.financials?.purchasePrice || 0,
                marketValue: res.financials?.marketValue || (res.financials?.purchasePrice ? res.financials.purchasePrice * 1.1 : 1000000)
              }
            };
            
            console.log("Adding candidate property:", newCandidate.name, finalCoords);
            setCandidateProperties(prev => [...prev, newCandidate]);
            count++;
          }
        } catch (e) {
          console.warn(`Failed to import property ${link}:`, e);
        }
      }

      if (count > 0) {
        addNotification(`Successfully discovered and mapped ${count} vacant land listings near substations.`, 'success');
      } else if (!controller.signal.aborted) {
        if (links.length > 0) {
          addNotification("Found listing links but failed to extract precise spatial coordinates. This usually happens when address data is obfuscated in the listing. Try searching a different area.", 'warning');
        } else {
          addNotification("No vacant land listings found in this area. No results from Property24 / Private Property index.", 'info');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Land discovery failed:", error);
      addNotification("Land discovery failed. Please try again.", 'error');
    } finally {
      if (!discoveryAbortControllerRef.current || discoveryAbortControllerRef.current === controller) {
        setIsDiscoveringLand(false);
        setDiscoveryProgress(null);
        discoveryAbortControllerRef.current = null;
      }
    }
  }, [addNotification, substations]);

  const handleDiscoverNearby = useCallback(async (bounds: { north: number, south: number, east: number, west: number }) => {
    if (discoveryAbortControllerRef.current) {
      discoveryAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    discoveryAbortControllerRef.current = controller;

    setIsDiscovering(true);
    try {
      const results = await searchSubstationsByArea(bounds.north, bounds.south, bounds.east, bounds.west);
      
      if (controller.signal.aborted) return;

      const newCandidates: Substation[] = results.map((res, index) => {
        let finalCoords = res.coordinates;
        if (Array.isArray(finalCoords) && finalCoords.length >= 2) {
          let [lat, lng] = finalCoords;
          // SA Flip logic
          if (lat > 0 && lng < 0) {
            finalCoords = [lng, lat];
          } else if (lat > 0 && lat < 40 && lng > 0) {
            finalCoords = [-lat, lng];
          }
        }

        return {
          id: `candidate-${Date.now()}-${index}`,
          name: res.name,
          owner: res.owner,
          address: res.address,
          coordinates: finalCoords as [number, number],
          status: 'Planned',
          voltageKV: res.voltageKV,
          mvaCapacity: res.mvaCapacity,
          capacity: res.voltageKV ? `${res.voltageKV}kV` : undefined
        };
      });

      // Filter out candidates that are already in our substations list (by name/approx coordinates)
      const filteredCandidates = newCandidates.filter(candidate => {
        return !substations.some(s => 
          s.name.toLowerCase() === candidate.name.toLowerCase() ||
          (Math.abs(s.coordinates[0] - candidate.coordinates[0]) < 0.0001 && 
           Math.abs(s.coordinates[1] - candidate.coordinates[1]) < 0.0001)
        );
      });

      setCandidateSubstations(filteredCandidates);
      
      if (filteredCandidates.length === 0) {
        addNotification("No new substations discovered in this immediate area.", 'info');
      } else {
        addNotification(`Discovered ${filteredCandidates.length} new substations.`, 'success');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Discovery failed:", error);
      addNotification("Substation discovery failed. Please try again.", 'error');
    } finally {
      if (!discoveryAbortControllerRef.current || discoveryAbortControllerRef.current === controller) {
        setIsDiscovering(false);
        discoveryAbortControllerRef.current = null;
      }
    }
  }, [substations, addNotification]);

  const handleAddCandidate = useCallback((candidate: Substation) => {
    const newSub: Substation = {
      ...candidate,
      id: `sub-${Date.now()}`,
      status: 'Active' // Set to active once confirmed
    };
    setSubstations(prev => [...prev, newSub]);
    setCandidateSubstations(prev => prev.filter(c => c.id !== candidate.id));
    addNotification(`Added ${newSub.name} to infrastructure portfolio.`, 'success');
  }, [setSubstations, addNotification]);

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

  const handleImport = useCallback(async () => {
    if (!importValue) return;
    
    // Extract listing number from URL or validate as numeric
    let finalListingNumber = importValue;
    if (importValue.includes('property24.com')) {
      const parts = importValue.split('/');
      finalListingNumber = parts[parts.length - 1] || parts[parts.length - 2];
    }

    if (!/^\d{5,15}$/.test(finalListingNumber)) {
      alert("Invalid format. Please enter a Property24 URL or a numeric listing number.");
      return;
    }

    const controller = new AbortController();
    importAbortControllerRef.current = controller;

    setIsImporting(true);
    try {
      const property = await importPropertyListing(importValue);
      
      console.log("Property Import Raw Result:", property);
      
      if (controller.signal.aborted) return;
      if (!property) throw new Error("AI failed to extract property details.");
      
      const newProperty = { ...property };
      
      // Coordinate integrity check and auto-correction for South Africa
      if (newProperty.coordinates && Array.isArray(newProperty.coordinates) && newProperty.coordinates.length >= 2) {
        let [lat, lng] = newProperty.coordinates;
        
        // Flip if swapped
        if (lat > 0 && lng < 0) {
          [lat, lng] = [lng, lat];
        }
        // Force negative lat for SA if model returned positive
        else if (lat > 0 && lat < 40 && lng > 0) {
          lat = -lat;
        }
        
        newProperty.coordinates = [lat, lng];
      }
      
      newProperty.id = Math.random().toString(36).substr(2, 9);
      newProperty.listingNumber = finalListingNumber;
      
      // Construct SEO-friendly P24 URL from AI data if not provided
      if (!newProperty.p24Url) {
        const suburbSlug = newProperty.address.suburb.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const citySlug = newProperty.address.city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const provinceSlug = (newProperty.address as any).province?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'gauteng';
        
        newProperty.p24Url = `https://www.property24.com/for-sale/${suburbSlug}/${citySlug}/${provinceSlug}/${finalListingNumber}`;
      }
      
      setPendingProperty(newProperty);
      setIsImportModalOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Import failed:", error);
    } finally {
      if (!importAbortControllerRef.current || importAbortControllerRef.current === controller) {
        setIsImporting(false);
        importAbortControllerRef.current = null;
      }
    }
  }, [importValue]);

  const confirmAddProperty = useCallback(() => {
    if (pendingProperty) {
      setProperties(prev => [pendingProperty, ...prev]);
      setSelectedProperty(pendingProperty);
      setPendingProperty(null);
      setImportValue('');
    }
  }, [pendingProperty, setProperties]);

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
    const controller = new AbortController();
    importAbortControllerRef.current = controller;

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
        const result = await searchSubstationDetails(data.type, data.value);

        if (controller.signal.aborted) return;
        if (!result) throw new Error("AI failed to extract substation details.");
        
        candidateSub = result;

        // Coordinate integrity check
        if (!candidateSub.coordinates || !Array.isArray(candidateSub.coordinates) || candidateSub.coordinates.length < 2 || isNaN(candidateSub.coordinates[0]) || isNaN(candidateSub.coordinates[1])) {
          candidateSub.coordinates = [-26.1311, 28.0536];
        } else {
          let [lat, lng] = candidateSub.coordinates;
          if (lat > 0 && lng < 0) {
            candidateSub.coordinates = [lng, lat];
          }
        }

        candidateSub.id = Math.random().toString(36).substr(2, 9);
      }

      if (controller.signal.aborted) return;

      if (multipleSubs) {
        setSubstations(prev => [...multipleSubs!, ...prev]);
        setIsSubstationModalOpen(false);
      } else if (candidateSub) {
        setPendingSubstation(candidateSub);
        setIsSubstationModalOpen(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Substation add failed:", error);
    } finally {
      if (!importAbortControllerRef.current || importAbortControllerRef.current === controller) {
        setIsImporting(false);
        importAbortControllerRef.current = null;
      }
    }
  }, [setSubstations]);

  const confirmAddSubstation = useCallback(() => {
    if (pendingSubstation) {
      // Check for duplicates
      const isDuplicate = substations.some(existing => {
        const nameMatch = existing.name.toLowerCase().trim() === pendingSubstation!.name.toLowerCase().trim();
        const dist = Math.sqrt(
          Math.pow(existing.coordinates[0] - pendingSubstation!.coordinates[0], 2) +
          Math.pow(existing.coordinates[1] - pendingSubstation!.coordinates[1], 2)
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
      <Sidebar 
        isOpen={isSidebarOpen}
        view={view as any}
        activeCategory={activeCategory}
        onViewChange={(v) => setView(v as any)}
        onCategoryChange={setActiveCategory}
        onImportProperty={() => setIsImportModalOpen(true)}
        onAddSubstation={() => setIsSubstationModalOpen(true)}
        onRestoreDefaults={handleRestoreDefaults}
        onShowUserGuide={() => setIsUserGuideOpen(true)}
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
                       candidateProperties={candidateProperties}
                       substations={filteredSubstations}
                       candidateSubstations={candidateSubstations}
                       selectedPropertyId={selectedProperty?.id}
                       selectedSubstationId={selectedSubstation?.id}
                       hiddenPropertyIds={hiddenPropertyIds}
                       onToggleVisibility={togglePropertyVisibility}
                       onSelectProperty={handleSelectProperty}
                       onOpenDetails={handleOpenDetails}
                       onSelectSubstation={handleSelectSubstation}
                       searchQuery={searchQuery}
                       setSearchQuery={setSearchQuery}
                     />

                    <div 
                      className="flex-1 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MapComponent 
                         properties={filteredProperties.filter(p => !hiddenPropertyIds.includes(p.id))} 
                         substations={filteredSubstations}
                         candidateSubstations={candidateSubstations}
                         candidateProperties={candidateProperties}
                         onSelectProperty={handleSelectProperty} 
                         selectedProperty={selectedProperty}
                         onSelectSubstation={handleSelectSubstation}
                         selectedSubstation={selectedSubstation}
                         onAddSubstation={handleAddCandidate}
                         onAddProperty={handleAddCandidateProperty}
                         onDiscoverNearby={handleDiscoverNearby}
                         onDiscoverLand={handleDiscoverLand}
                         onCancelDiscovery={handleCancelDiscovery}
                         onClearCandidates={() => {
                           setCandidateSubstations([]);
                           setCandidateProperties([]);
                         }}
                         isDiscovering={isDiscovering}
                         isDiscoveringLand={isDiscoveringLand}
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
                        substations={filteredSubstations}
                        onSelectSubstation={handleSelectSubstation}
                        selectedSubstation={selectedSubstation}
                        onDeleteSubstation={setSubstationToDelete}
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
                      onUpdateProperty={handleUpdateProperty}
                      onAddCandidate={handleAddLandToPortfolio}
                      initialEditMode={isEditingRequested}
                    />
                </div>
              </div>
          )}
        </div>
      </main>

          {isUserGuideOpen && (
        <UserGuideModal onClose={() => setIsUserGuideOpen(false)} />
      )}

      <AnimatePresence>
        {discoveryProgress && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-8 left-1/2 z-[9999] w-full max-w-md px-6"
          >
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
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
                  initial={{ width: "2%" }}
                  animate={{ 
                    width: discoveryProgress.total > 1 
                      ? `${Math.max(2, (discoveryProgress.current / discoveryProgress.total) * 100)}%` 
                      : ["2%", "40%", "2%"] 
                  }}
                  transition={discoveryProgress.total > 1 
                    ? { type: "spring", bounce: 0, duration: 0.8 }
                    : { repeat: Infinity, duration: 3, ease: "easeInOut" }
                  }
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
          </motion.div>
        )}
      </AnimatePresence>

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
                  <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Import from Property24</h3>
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
                      placeholder="Paste URL or listing number..."
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
                    <p className="text-sm font-bold text-slate-700">R {pendingProperty.financials.purchasePrice.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Size</p>
                    <p className="text-sm font-bold text-slate-700">{pendingProperty.specs.standSize} m²</p>
                  </div>
                </div>
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
                    <p className="text-xs text-slate-500 font-medium truncate">{pendingSubstation.address}</p>
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

      {(propertyToDelete || propertiesToDelete || substationToDelete) && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
          <div 
            onClick={() => {
              setPropertyToDelete(null);
              setPropertiesToDelete(null);
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
              <h3 className="text-lg font-semibold text-slate-900 mb-1 tracking-tight">
                {propertiesToDelete ? `Remove ${propertiesToDelete.length} Properties?` : 'Remove Resource?'}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 px-4">
                {substationToDelete 
                  ? "This record will be permanently purged from the spatial database."
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
                      setPropertiesToDelete(null);
                      if (selectedProperty && propertiesToDelete.includes(selectedProperty.id)) {
                        setSelectedProperty(null);
                      }
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
                    setPropertiesToDelete(null);
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
      {/* Toast Notifications */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-3 z-[10000] pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
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
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Modal components moved to separate files for performance and maintainability
