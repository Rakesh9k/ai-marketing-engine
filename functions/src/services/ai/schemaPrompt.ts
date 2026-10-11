import type { z } from 'zod';

/**
 * Describes a Zod (v3) schema as compact JSON-Schema-like text for the model.
 *
 * Every stage prompt tells the model to "match the provided JSON schema exactly", but no schema was
 * ever sent (Gemini is only given responseMimeType: application/json), so the model invented its own
 * key names / enum values and generation failed schema validation. This renders the real schema, once,
 * centrally, so every structured call carries its own contract. It covers the Zod types the pipeline
 * uses; anything unknown degrades to "any" rather than throwing.
 */

type Def = {
  typeName?: string;
  shape?: () => Record<string, z.ZodTypeAny>;
  type?: z.ZodTypeAny;
  innerType?: z.ZodTypeAny;
  schema?: z.ZodTypeAny;
  values?: readonly string[] | Record<string, string | number>;
  value?: unknown;
  options?: z.ZodTypeAny[] | Map<unknown, z.ZodTypeAny>;
  valueType?: z.ZodTypeAny;
  checks?: Array<{ kind: string; value?: number }>;
  minLength?: { value: number } | null;
  maxLength?: { value: number } | null;
  exactLength?: { value: number } | null;
  items?: z.ZodTypeAny[];
};

export function describeZod(schema: z.ZodTypeAny, depth = 0): unknown {
  if (depth > 8) return 'any';
  const def = (schema as unknown as { _def: Def })._def;
  switch (def.typeName) {
    case 'ZodObject': {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(def.shape!())) {
        const optional = ['ZodOptional', 'ZodDefault'].includes(
          (value as unknown as { _def: Def })._def.typeName ?? ''
        );
        out[optional ? `${key}?` : key] = describeZod(value, depth + 1);
      }
      return out;
    }
    case 'ZodArray': {
      // .length(n) is stored as exactLength, not as min and max: without this the model is never told the count and
      // gets it wrong on most campaigns (each wrong count costs a whole repair call).
      const bounds = def.exactLength
        ? [`exactly ${def.exactLength.value}`]
        : [
            def.minLength ? `min ${def.minLength.value}` : '',
            def.maxLength ? `max ${def.maxLength.value}` : '',
          ].filter(Boolean);
      return [
        describeZod(def.type!, depth + 1),
        ...(bounds.length ? [`(${bounds.join(', ')} items)`] : []),
      ];
    }
    case 'ZodString': {
      const min = def.checks?.find((c) => c.kind === 'min')?.value;
      const max = def.checks?.find((c) => c.kind === 'max')?.value;
      const bounds = [
        min !== undefined ? `min ${min} chars` : '',
        max !== undefined ? `max ${max} chars` : '',
      ]
        .filter(Boolean)
        .join(', ');
      return bounds ? `string (${bounds})` : 'string';
    }
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodEnum':
      return { enum: def.values as readonly string[] };
    case 'ZodNativeEnum':
      return {
        enum: Object.values(def.values as Record<string, string | number>).filter(
          (v) => typeof v === 'string'
        ),
      };
    case 'ZodLiteral':
      return JSON.stringify(def.value);
    case 'ZodOptional':
    case 'ZodDefault':
    case 'ZodNullable':
      return describeZod(def.innerType!, depth + 1);
    case 'ZodEffects':
      return describeZod(def.schema!, depth + 1);
    case 'ZodUnion':
      return {
        anyOf: (Array.isArray(def.options) ? def.options : []).map((o) =>
          describeZod(o, depth + 1)
        ),
      };
    case 'ZodRecord':
      return { '<key>': describeZod(def.valueType!, depth + 1) };
    default:
      return 'any';
  }
}

/** Text appended to a structured prompt so the model knows the exact shape it must return. */
export function schemaInstruction(schema: z.ZodTypeAny): string {
  return (
    '\n\nRESPONSE FORMAT (mandatory): reply with ONLY one JSON object, no markdown fences and no commentary, ' +
    'that has exactly this shape. Keys ending in "?" are optional. Where a list of allowed values is given, ' +
    'use only those values. Never invent facts to satisfy a minimum count; use the lowest count the real data supports.\n' +
    JSON.stringify(describeZod(schema), null, 1)
  );
}
