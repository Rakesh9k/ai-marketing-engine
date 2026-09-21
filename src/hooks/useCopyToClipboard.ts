'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';

interface CopyToClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
}

export function useCopyToClipboard(options: CopyToClipboardOptions = {}) {
  const { showToast } = useToast();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    async (text: string, itemKey: string): Promise<boolean> => {
      setIsCopying(itemKey);
      try {
        await navigator.clipboard.writeText(text);
        setCopiedItem(itemKey);
        showToast(options.successMessage || 'Copied to clipboard!', 'success');

        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopiedItem(null);
        }, 2000);

        return true;
      } catch (err) {
        console.error('Failed to copy:', err);
        showToast(options.errorMessage || 'Failed to copy to clipboard', 'error');
        return false;
      } finally {
        setIsCopying(null);
      }
    },
    [showToast, options.successMessage, options.errorMessage]
  );

  const formatAssetForCopy = useCallback((asset: any, assetType: string): string => {
    // Format different asset types for clipboard
    switch (assetType) {
      case 'headline':
        return asset.content?.text || JSON.stringify(asset.content);
      case 'ad_copy':
        const adCopy = asset.content;
        return `${adCopy?.headline || ''}\n\n${adCopy?.primaryText || ''}\n\n${adCopy?.description || ''}\n\n${adCopy?.cta || ''}`;
      case 'caption':
        const caption = asset.content;
        const hashtags = caption?.hashtags?.join(' ') || '';
        return `${caption?.text || ''}\n\n${hashtags}`;
      case 'whatsapp':
        const wa = asset.content;
        return wa?.message || JSON.stringify(asset.content);
      case 'story':
        const story = asset.content;
        if (story?.frames) {
          return story.frames
            .map((f: any) => `${f.copy || ''} [${f.visualCue || ''}]${f.cta ? ` → ${f.cta}` : ''}`)
            .join('\n\n');
        }
        return JSON.stringify(asset.content);
      case 'reel':
        const reel = asset.content;
        if (reel?.scenes) {
          return `Hook: ${reel.hook || ''}\n\nScenes:\n${reel.scenes.map((s: any, i: number) => `${i + 1}. ${s.description || ''} [${s.visualDirection || ''}] (${s.duration || ''})`).join('\n')}\n\nProduct Reveal: ${reel.productReveal || ''}\n\nCTA: ${reel.cta || ''}\n\nCaption: ${reel.caption || ''}`;
        }
        return JSON.stringify(asset.content);
      case 'cta':
        return asset.content?.text || JSON.stringify(asset.content);
      default:
        return JSON.stringify(asset.content, null, 2);
    }
  }, []);

  return {
    copyToClipboard,
    formatAssetForCopy,
    copiedItem,
    isCopying,
    isItemCopied: (itemKey: string) => copiedItem === itemKey,
    isItemCopying: (itemKey: string) => isCopying === itemKey,
  };
}
