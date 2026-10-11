/**
 * Posters and story frames are composited as SVG (functions/src/services/ai/compositor.ts). SVG
 * cannot be posted to WhatsApp or Instagram, so a customer who downloaded one could not use it.
 * Rasterise it to a PNG in the browser at download time (the SVG embeds its image data, so the canvas
 * is not tainted). Resolves to null when anything goes wrong so the caller can fall back to the SVG.
 */
export async function rasterizeSvgToPng(svg: Blob, fallbackSize = 1080): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const url = URL.createObjectURL(svg);
  try {
    const img = new Image();
    img.decoding = 'async';
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG could not be decoded'));
    });
    img.src = url;
    await loaded;
    const width = img.naturalWidth || fallbackSize;
    const height = img.naturalHeight || fallbackSize;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
