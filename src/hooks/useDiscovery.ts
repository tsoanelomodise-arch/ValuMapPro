import React, { useState, useCallback, useRef } from 'react';
import { Substation, Property } from '../types';
import { 
  searchSubstationsByArea, 
  findLandListingLinks, 
  importPropertyListing 
} from '../services/geminiService';

interface UseDiscoveryProps {
  substations: Substation[];
  setCandidateSubstations: React.Dispatch<React.SetStateAction<Substation[]>>;
  candidateSubstations: Substation[];
  setCandidateProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  selectedSubstation: Substation | null;
}

export function useDiscovery({
  substations,
  setCandidateSubstations,
  candidateSubstations,
  setCandidateProperties,
  addNotification,
  selectedSubstation
}: UseDiscoveryProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isDiscoveringLand, setIsDiscoveringLand] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState<{ current: number, total: number, status?: string } | null>(null);
  
  const discoveryAbortControllerRef = useRef<AbortController | null>(null);

  const handleCancelDiscovery = useCallback(() => {
    if (discoveryAbortControllerRef.current) {
      discoveryAbortControllerRef.current.abort();
      discoveryAbortControllerRef.current = null;
    }
    setIsDiscovering(false);
    setIsDiscoveringLand(false);
    setDiscoveryProgress(null);
  }, []);

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

      const newCandidates: Substation[] = (results || []).map((res, index) => {
        let finalCoords = res.coordinates;
        if (Array.isArray(finalCoords) && finalCoords.length >= 2) {
          let [lat, lng] = finalCoords;
          // South Africa Coordinate Correction
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
          status: 'Active' as const,
          voltageKV: res.voltageKV,
          mvaCapacity: res.mvaCapacity,
          capacity: res.voltageKV ? `${res.voltageKV}kV` : undefined
        };
      }).filter(c => {
        if (!c.coordinates) return false;
        const [lat, lng] = c.coordinates;
        // Strict boundary check: Results must be within search area buffer
        const isSA = lat >= -36 && lat <= -20 && lng >= 15 && lng <= 35;
        const inBounds = lat >= (bounds.south - 1.0) && lat <= (bounds.north + 1.0) &&
                        lng >= (bounds.west - 1.0) && lng <= (bounds.east + 1.0);
        return isSA && inBounds;
      });

      const filteredCandidates = newCandidates.filter(candidate => {
        const inMain = substations.some(s => {
          if (!s.coordinates || !candidate.coordinates) return s.name.toLowerCase() === candidate.name.toLowerCase();
          return s.name.toLowerCase() === candidate.name.toLowerCase() ||
          (Math.abs(s.coordinates[0] - candidate.coordinates[0]) < 0.0001 && 
           Math.abs(s.coordinates[1] - candidate.coordinates[1]) < 0.0001);
        });
        const inCandidates = candidateSubstations.some(s => {
          if (!s.coordinates || !candidate.coordinates) return s.name.toLowerCase() === candidate.name.toLowerCase();
          return s.name.toLowerCase() === candidate.name.toLowerCase() ||
          (Math.abs(s.coordinates[0] - candidate.coordinates[0]) < 0.0001 && 
           Math.abs(s.coordinates[1] - candidate.coordinates[1]) < 0.0001);
        });
        return !inMain && !inCandidates;
      });

      setCandidateSubstations(prev => [...prev, ...filteredCandidates]);
      
      if (filteredCandidates.length === 0) {
        addNotification("No new substations discovered in this area.", 'info');
      } else {
        addNotification(`Discovered ${filteredCandidates.length} new substations.`, 'success');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Discovery failed:", error);
      addNotification("Infrastructure discovery failed.", 'error');
    } finally {
      if (!discoveryAbortControllerRef.current || discoveryAbortControllerRef.current === controller) {
        setIsDiscovering(false);
        discoveryAbortControllerRef.current = null;
      }
    }
  }, [substations, candidateSubstations, setCandidateSubstations, addNotification]);

  const handleDiscoverLand = useCallback(async (bounds: { north: number, south: number, east: number, west: number }) => {
    if (!selectedSubstation) {
      addNotification("Please select an anchor substation first.", 'info');
      return;
    }

    if (discoveryAbortControllerRef.current) {
      discoveryAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    discoveryAbortControllerRef.current = controller;

    setIsDiscoveringLand(true);
    setDiscoveryProgress({ current: 0, total: 1, status: 'Initializing Search...' });
    
    try {
      addNotification(`Searching near ${selectedSubstation.name}...`, 'info');
      setDiscoveryProgress({ current: 0, total: 1, status: 'Scanning Property24 & PrivateProperty...' });
      
      // Enforce 3km bounding box around substation
      // 1km lat is ~0.009, 1km lng is ~0.01 in South Africa
      const [lat, lng] = selectedSubstation.coordinates;
      const kmBounds = {
        north: lat + 0.027,
        south: lat - 0.027,
        east: lng + 0.03,
        west: lng - 0.03
      };

      const links = await findLandListingLinks(kmBounds.north, kmBounds.south, kmBounds.east, kmBounds.west, selectedSubstation);
      
      if (controller.signal.aborted) return;

      if (!links || links.length === 0) {
        addNotification("No vacant land listings found. Try moving the map.", 'info');
        setIsDiscoveringLand(false);
        setDiscoveryProgress(null);
        return;
      }

      addNotification(`Harvesting details for ${links.length} listings...`, 'info');
      setDiscoveryProgress({ current: 0, total: links.length, status: `Found ${links.length} potential matches...` });
      
      let count = 0;
      for (let i = 0; i < links.length; i++) {
        if (controller.signal.aborted) break;
        
        const url = links[i];
        const displayUrl = url.replace('https://www.', '').split('/')[0];
        setDiscoveryProgress(prev => prev ? { 
          ...prev, 
          current: i + 1,
          status: `Harvesting listing ${i + 1}/${links.length} (${displayUrl})...`
        } : null);
        
        try {
          const res = await importPropertyListing(links[i]);
          if (res && res.coordinates && !controller.signal.aborted) {
            let finalCoords = res.coordinates;
            let coordinatesFlag: 'precise' | 'approximate' = 'precise';

            if (Array.isArray(finalCoords) && finalCoords.length >= 2) {
              let [lat, lng] = finalCoords;
              if (lat > 0 && lng < 0) [lat, lng] = [lng, lat];
              else if (lat > 0 && lat < 40 && lng > 0) lat = -lat;
              finalCoords = [lat, lng] as [number, number];
            }

            if (!finalCoords || !Array.isArray(finalCoords) || isNaN(finalCoords[0])) {
               // Skip properties without valid coordinates
               continue;
            }

            const hasGoodDescription = res.description && res.description.length > 50;
            const hasPrice = res.financials?.purchasePrice && res.financials.purchasePrice > 0;
            const hasSize = res.specs?.standSize && res.specs.standSize > 0;

            if (!hasGoodDescription || !hasPrice || !hasSize) {
               console.warn(`Skipping low-utility listing: ${res.name} (Missing core evaluation data)`);
               continue;
            }

            const newCandidate: Property = {
              ...res,
              id: `candidate-land-${Date.now()}-${i}`,
              coordinates: finalCoords as [number, number],
              coordinatesFlag: 'precise',
              description: res.description,
              type: res.type || 'Vacant Land',
              specs: res.specs || { standSize: 1000, titleType: 'Full title' },
              financials: {
                purchasePrice: res.financials?.purchasePrice || 0,
                marketValue: res.financials?.marketValue || (res.financials?.purchasePrice ? res.financials.purchasePrice * 1.1 : 1000000)
              }
            };
            
            setCandidateProperties(prev => {
              const isDuplicate = prev.some(existing => 
                existing.name.toLowerCase() === newCandidate.name.toLowerCase() ||
                (existing.coordinates && newCandidate.coordinates && 
                 Math.abs(existing.coordinates[0] - newCandidate.coordinates[0]) < 0.0001 && 
                 Math.abs(existing.coordinates[1] - newCandidate.coordinates[1]) < 0.0001)
              );
              if (isDuplicate) return prev;
              return [...prev, newCandidate];
            });
            count++;
          }
        } catch (e) {
          console.warn(`Failed to import ${links[i]}`, e);
        }
      }

      if (count > 0) {
        addNotification(`Discovered ${count} land listings near substation.`, 'success');
      } else if (!controller.signal.aborted) {
        addNotification("No listings harvested.", 'info');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Land discovery failed:", error);
      addNotification("Land discovery failed.", 'error');
    } finally {
      if (!discoveryAbortControllerRef.current || discoveryAbortControllerRef.current === controller) {
        setIsDiscoveringLand(false);
        setDiscoveryProgress(null);
        discoveryAbortControllerRef.current = null;
      }
    }
  }, [selectedSubstation, setCandidateProperties, addNotification]);

  return {
    isDiscovering,
    isDiscoveringLand,
    discoveryProgress,
    handleDiscoverNearby,
    handleDiscoverLand,
    handleCancelDiscovery
  };
}
