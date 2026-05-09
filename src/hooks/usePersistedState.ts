import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for local storage persistence
 */
export function usePersistedState<T>(key: string, defaultValue: T | (() => T)) {
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
