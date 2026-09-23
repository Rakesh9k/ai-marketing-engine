'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import {
  createSavedStyle,
  deactivateSavedStyle,
  listSavedStyles,
  SAVED_STYLE_DEFAULTS,
  updateSavedStyle,
  type SavedStyleInput,
} from '../services/savedStyleService';
import type { SavedStyle } from '@/types';

interface SavedStylePickerProps {
  businessId: string | null;
  value: string | null;
  onChange: (styleId: string | null) => void;
}

const options = {
  tone: ['playful', 'serious', 'professional', 'warm', 'bold', 'premium', 'energetic'],
  visualDensity: ['minimal', 'low', 'medium', 'high'],
  productProminence: ['subtle', 'balanced', 'high', 'dominant'],
  textDensity: ['minimal', 'concise', 'moderate', 'detailed'],
  colorMode: ['brand', 'neutral', 'monochrome', 'vibrant'],
  humor: ['none', 'light', 'moderate', 'high'],
  ctaStyle: ['soft', 'direct', 'urgent', 'conversational'],
  language: ['business-default', 'english', 'hinglish', 'telugu-english', 'regional'],
} as const;

function emptyInput(): SavedStyleInput {
  return { ...SAVED_STYLE_DEFAULTS };
}

export function SavedStylePicker({ businessId, value, onChange }: SavedStylePickerProps) {
  const { showToast } = useToast();
  const [styles, setStyles] = useState<SavedStyle[]>([]);
  const [draft, setDraft] = useState<SavedStyleInput>(emptyInput);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    listSavedStyles(businessId)
      .then((loaded) => {
        if (!cancelled) setStyles(loaded.filter((style) => style.active));
      })
      .catch(() => {
        if (!cancelled) showToast('Could not load saved styles.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, showToast]);

  const selected = styles.find((style) => style.styleId === value) ?? null;

  function beginEdit(style: SavedStyle) {
    setEditingId(style.styleId);
    setDraft({
      name: style.name,
      description: style.description,
      tone: style.tone,
      visualDensity: style.visualDensity,
      productProminence: style.productProminence,
      textDensity: style.textDensity,
      colorMode: style.colorMode,
      humor: style.humor,
      ctaStyle: style.ctaStyle,
      language: style.language,
    });
  }

  async function save() {
    if (!businessId || !draft.name.trim()) return;
    setSaving(true);
    try {
      const saved = editingId
        ? await updateSavedStyle(businessId, editingId, draft)
        : await createSavedStyle(businessId, draft);
      setStyles((current) => {
        const withoutSaved = current.filter((style) => style.styleId !== saved.styleId);
        return [...withoutSaved, saved];
      });
      onChange(saved.styleId);
      setEditingId(null);
      setDraft(emptyInput());
      showToast(editingId ? 'Style updated.' : 'Style saved.', 'success');
    } catch {
      showToast('Could not save this style.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!businessId || !selected) return;
    try {
      await deactivateSavedStyle(businessId, selected.styleId);
      setStyles((current) => current.filter((style) => style.styleId !== selected.styleId));
      onChange(null);
      showToast('Style deactivated.', 'success');
    } catch {
      showToast('Could not deactivate this style.', 'error');
    }
  }

  function update<K extends keyof SavedStyleInput>(key: K, next: SavedStyleInput[K]) {
    setDraft((current) => ({ ...current, [key]: next }));
  }

  if (!businessId) return null;

  return (
    <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Saved style</h3>
        <p className="text-sm text-neutral-500">
          Optional expression preferences. The selected template still controls the structure.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded border px-3 py-2 text-left text-sm ${!value ? 'border-brand-primary bg-brand-primary/5' : 'border-neutral-200'}`}
          onClick={() => onChange(null)}
        >
          <strong>No saved style</strong>
          <span className="block text-xs text-neutral-500">Use business defaults</span>
        </button>
        {styles.map((style) => (
          <button
            key={style.styleId}
            type="button"
            className={`rounded border px-3 py-2 text-left text-sm ${value === style.styleId ? 'border-brand-primary bg-brand-primary/5' : 'border-neutral-200'}`}
            onClick={() => onChange(style.styleId)}
          >
            <strong>{style.name}</strong>
            <span className="block text-xs text-neutral-500">
              {style.tone} · {style.visualDensity} · {style.productProminence}
            </span>
          </button>
        ))}
      </div>
      {loading && <p className="text-sm text-neutral-500">Loading styles...</p>}
      {selected && (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => beginEdit(selected)}>
            Edit selected
          </Button>
          <Button type="button" variant="secondary" onClick={() => void deactivate()}>
            Deactivate selected
          </Button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label={editingId ? 'Edit style name' : 'Create a style'}
          value={draft.name}
          onChange={(event) => update('name', event.target.value)}
          placeholder="My Style"
        />
        {(
          [
            ['tone', options.tone],
            ['visualDensity', options.visualDensity],
            ['productProminence', options.productProminence],
            ['textDensity', options.textDensity],
            ['colorMode', options.colorMode],
            ['humor', options.humor],
            ['ctaStyle', options.ctaStyle],
            ['language', options.language],
          ] as const
        ).map(([key, values]) => (
          <label key={key} className="text-sm text-neutral-700">
            <span className="mb-1 block capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <select
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2"
              value={draft[key] || ''}
              onChange={(event) => update(key, event.target.value as SavedStyleInput[typeof key])}
            >
              {values.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Button type="button" onClick={() => void save()} disabled={saving || !draft.name.trim()}>
        {saving ? 'Saving...' : editingId ? 'Save changes' : 'Save style'}
      </Button>
    </section>
  );
}
