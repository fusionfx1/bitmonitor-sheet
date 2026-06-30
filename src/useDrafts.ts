import { useState, useEffect, useCallback } from 'react';
import type { DraftConfig } from './types';

const STORAGE_KEY = 'bitmonitor_drafts';

function loadDrafts(): DraftConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: DraftConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<DraftConfig[]>(loadDrafts);

  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  const saveDraft = useCallback((draft: DraftConfig) => {
    setDrafts(prev => {
      const idx = prev.findIndex(d => d.id === draft.id);
      const updated = { ...draft, updatedAt: new Date().toISOString() };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  }, []);

  const duplicateDraft = useCallback((id: string) => {
    setDrafts(prev => {
      const src = prev.find(d => d.id === id);
      if (!src) return prev;
      const copy: DraftConfig = {
        ...src,
        id: crypto.randomUUID(),
        name: `${src.name} (copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return [copy, ...prev];
    });
  }, []);

  return { drafts, saveDraft, deleteDraft, duplicateDraft };
}
