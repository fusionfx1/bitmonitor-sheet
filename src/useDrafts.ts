import { useState, useEffect, useCallback } from 'react';
import type { DraftConfig } from './types';
import { createDefaultDraft } from './constants';

const STORAGE_KEY = 'bitmonitor_drafts';

function normalizeDraft(draft: Partial<DraftConfig>): DraftConfig {
  return createDefaultDraft(draft);
}

function loadDrafts(): DraftConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeDraft) : [];
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
      const updated = { ...normalizeDraft(draft), updatedAt: new Date().toISOString() };
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
      const copy: DraftConfig = normalizeDraft({
        ...src,
        id: crypto.randomUUID(),
        name: `${src.name} (copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return [copy, ...prev];
    });
  }, []);

  return { drafts, saveDraft, deleteDraft, duplicateDraft };
}
