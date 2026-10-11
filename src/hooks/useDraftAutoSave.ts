'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseDraftAutoSaveOptions<T> {
  draftKey: string;
  initialState: T;
  debounceMs?: number;
}

export interface UseDraftAutoSaveReturn<T> {
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  updateField: <K extends keyof T>(key: K, value: T[K]) => void;
  isRestored: boolean;
  clearDraft: () => void;
  dismissRestoredNotice: () => void;
  lastSavedAt: Date | null;
}

/**
 * Universal offline draft auto-save & recovery hook.
 * Persists active form inputs to localStorage (and queue) so prompts, copy, and options
 * are seamlessly restored on page reloads or network drops.
 */
export function useDraftAutoSave<T extends object>({
  draftKey,
  initialState,
  debounceMs = 500,
}: UseDraftAutoSaveOptions<T>): UseDraftAutoSaveReturn<T> {
  const storageKey = `mitra-draft:${draftKey}`;
  const [draft, setDraft] = useState<T>(initialState);
  const [isRestored, setIsRestored] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const initialized = useRef(false);

  // Load saved draft from localStorage on initial mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && typeof parsed === 'object') {
          setDraft((prev) => ({ ...prev, ...parsed.data }));
          setIsRestored(true);
          if (parsed.savedAt) {
            setLastSavedAt(new Date(parsed.savedAt));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to restore draft from localStorage:', err);
    }
  }, [storageKey]);

  // Debounced save to localStorage
  useEffect(() => {
    if (!initialized.current) return;

    const timer = setTimeout(() => {
      try {
        const payload = {
          data: draft,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setLastSavedAt(new Date());
      } catch (err) {
        console.warn('Failed to save draft to localStorage:', err);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [draft, storageKey, debounceMs]);

  const updateField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setDraft(initialState);
      setIsRestored(false);
      setLastSavedAt(null);
    } catch (err) {
      console.warn('Failed to clear draft:', err);
    }
  }, [storageKey, initialState]);

  const dismissRestoredNotice = useCallback(() => {
    setIsRestored(false);
  }, []);

  return {
    draft,
    setDraft,
    updateField,
    isRestored,
    clearDraft,
    dismissRestoredNotice,
    lastSavedAt,
  };
}
