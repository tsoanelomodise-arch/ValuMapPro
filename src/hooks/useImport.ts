import React, { useState, useCallback, useRef } from 'react';
import { Property, Substation } from '../types';
import { 
  importPropertyListing, 
  searchSubstationDetails 
} from '../services/geminiService';

interface UseImportProps {
  setPendingProperty: (p: Property | null) => void;
  setPendingSubstation: (s: Substation | null) => void;
  setCandidateSubstations: React.Dispatch<React.SetStateAction<Substation[]>>;
  setSubstations: React.Dispatch<React.SetStateAction<Substation[]>>;
  setView: (v: 'map' | 'list') => void;
  setIsImportModalOpen: (o: boolean) => void;
  setIsSubstationSearchOpen: (o: boolean) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useImport({
  setPendingProperty,
  setPendingSubstation,
  setCandidateSubstations,
  setSubstations,
  setView,
  setIsImportModalOpen,
  setIsSubstationSearchOpen,
  addNotification
}: UseImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importValue, setImportValue] = useState('');
  const importAbortControllerRef = useRef<AbortController | null>(null);

  const handleCancelImport = useCallback(() => {
    if (importAbortControllerRef.current) {
      importAbortControllerRef.current.abort();
      importAbortControllerRef.current = null;
    }
    setIsImporting(false);
    setIsImportModalOpen(false);
    setIsSubstationSearchOpen(false);
  }, [setIsImportModalOpen, setIsSubstationSearchOpen]);

  const handleImportProperty = useCallback(async (value: string) => {
    if (!value) return;
    
    let finalListingNumber = value.trim();
    const isP24 = finalListingNumber.includes('property24.com');

    if (isP24) {
      const urlWithoutQuery = finalListingNumber.split('?')[0];
      const parts = urlWithoutQuery.split('/').filter(p => p.length > 0);
      finalListingNumber = parts[parts.length - 1];
    }

    if (!/^\d{5,15}$/.test(finalListingNumber)) {
      alert("Invalid format. Please enter a Property24 URL or a numeric listing number.");
      return;
    }

    const controller = new AbortController();
    importAbortControllerRef.current = controller;

    setIsImporting(true);
    try {
      const property = await importPropertyListing(value);
      
      if (controller.signal.aborted) return;
      if (!property) throw new Error("AI failed to extract property details.");
      
      const newProperty = { ...property };
      
      if (newProperty.coordinates && Array.isArray(newProperty.coordinates) && newProperty.coordinates.length >= 2) {
        let [lat, lng] = newProperty.coordinates;
        if (lat > 0 && lng < 0) [lat, lng] = [lng, lat];
        else if (lat > 0 && lat < 40 && lng > 0) lat = -lat;
        newProperty.coordinates = [lat, lng];
      }
      
      newProperty.id = Math.random().toString(36).substr(2, 9);
      newProperty.listingNumber = finalListingNumber;
      
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
      addNotification(`AI import failed.`, 'error');
    } finally {
      if (!importAbortControllerRef.current || importAbortControllerRef.current === controller) {
        setIsImporting(false);
        importAbortControllerRef.current = null;
      }
    }
  }, [setPendingProperty, setIsImportModalOpen, addNotification]);

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

        if (!candidateSub.coordinates || !Array.isArray(candidateSub.coordinates) || candidateSub.coordinates.length < 2 || isNaN(candidateSub.coordinates[0])) {
          candidateSub.coordinates = [-26.1311, 28.0536];
        } else {
          let [lat, lng] = candidateSub.coordinates;
          if (lat > 0 && lng < 0) candidateSub.coordinates = [lng, lat];
        }

        candidateSub.id = Math.random().toString(36).substr(2, 9);
      }

      if (controller.signal.aborted) return;

      if (multipleSubs) {
        setSubstations(prev => [...multipleSubs!, ...prev]);
        setIsSubstationSearchOpen(false);
      } else if (candidateSub) {
        setPendingSubstation(candidateSub);
        setIsSubstationSearchOpen(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Substation add failed:", error);
      addNotification(`Substation lookup failed.`, 'error');
    } finally {
      if (!importAbortControllerRef.current || importAbortControllerRef.current === controller) {
        setIsImporting(false);
        importAbortControllerRef.current = null;
      }
    }
  }, [setSubstations, setIsSubstationSearchOpen, setPendingSubstation, addNotification]);

  return {
    isImporting,
    importValue,
    setImportValue,
    handleImportProperty,
    handleAddSubstation,
    handleCancelImport
  };
}
