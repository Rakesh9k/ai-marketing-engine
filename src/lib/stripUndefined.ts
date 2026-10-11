/**
 * Firestore rejects `undefined` field values outright ("Unsupported field value: undefined"). Optional
 * form fields such as a product's compare-at price are `undefined` when left blank, which made every
 * first product without one fail to save. Drop them (deeply) before writing; null is kept.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripUndefined(v)) as unknown as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
