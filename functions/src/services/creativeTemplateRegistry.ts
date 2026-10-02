import type {
  CreativeTemplate,
  CreativeTemplateType,
  CreativeObjective,
  BusinessCategory,
} from '../types';
import { validateCreativeTemplate } from './creativeTemplate';
import { BUILTIN_CREATIVE_TEMPLATES } from '../config/creativeTemplateLibrary';

/**
 * The single access boundary for Creative Templates. Sits between the
 * built-in template definitions (functions/src/config/creativeTemplateLibrary.ts)
 * and every future consumer (Creative Intelligence, template selection,
 * generation orchestration). Nothing downstream should read
 * `BUILTIN_CREATIVE_TEMPLATES` directly, hardcode a template id in a
 * switch statement, or re-implement lookup/filtering — that is exactly
 * the "Consumer A/B/C/D hardcoded IDs" fragmentation this module exists
 * to prevent.
 *
 * This is deliberately NOT template selection, ranking, recommendation,
 * AI, Business Brain analysis, or persistence. It answers exactly two
 * questions: "does a template with this id exist?" and "which templates
 * match these explicit filters?" — nothing more. See
 * docs/CREATIVE_INTELLIGENCE_PHASE_6_TEMPLATE_REGISTRY.md.
 */

export interface CreativeTemplateFilters {
  type?: CreativeTemplateType;
  vertical?: BusinessCategory;
  objective?: CreativeObjective;
}

export interface CreativeTemplateRegistry {
  /** Deterministic lookup by id. Returns `undefined` for an unknown id — never a fallback/default template. Active state is NOT applied here: a campaign that already recorded a templateId must still be able to retrieve it even if the template was later deactivated. */
  getCreativeTemplate(templateId: string): CreativeTemplate | undefined;
  /** Returns active templates matching every supplied filter (AND across filters; OR/"contains" within a template's own objectives/compatibleVerticals arrays). No filters returns all active templates. Order is deterministic (registration order) and is not a ranking. */
  listCreativeTemplates(filters?: CreativeTemplateFilters): readonly CreativeTemplate[];
}

/**
 * Built from a fixed template array at construction time. Validates every
 * template against the canonical Phase 3 schema and rejects duplicate ids
 * immediately (fail fast on a misconfigured built-in library) rather than
 * silently letting a plain object map overwrite one definition with
 * another. Templates are deep-cloned and deep-frozen on the way in, so a
 * consumer that retrieves a template and mutates it can never affect the
 * registry's internal state or any other caller's copy.
 */
export class BuiltinCreativeTemplateRegistry implements CreativeTemplateRegistry {
  private readonly templatesById: ReadonlyMap<string, CreativeTemplate>;
  private readonly orderedTemplates: readonly CreativeTemplate[];

  constructor(templates: readonly CreativeTemplate[]) {
    const byId = new Map<string, CreativeTemplate>();

    for (const template of templates) {
      const result = validateCreativeTemplate(template);
      if (!result.valid) {
        throw new Error(
          `CreativeTemplateRegistry: template "${template.id}" failed schema validation: ${result.errors.join('; ')}`
        );
      }
      if (byId.has(template.id)) {
        throw new Error(
          `CreativeTemplateRegistry: duplicate template id "${template.id}" — every built-in template id must be unique`
        );
      }
      byId.set(template.id, deepFreeze(structuredClone(template)));
    }

    this.templatesById = byId;
    this.orderedTemplates = Object.freeze([...byId.values()]);
  }

  getCreativeTemplate(templateId: string): CreativeTemplate | undefined {
    return this.templatesById.get(templateId);
  }

  listCreativeTemplates(filters: CreativeTemplateFilters = {}): readonly CreativeTemplate[] {
    return this.orderedTemplates.filter((template) => {
      if (!template.active) {
        return false;
      }
      if (filters.type && template.type !== filters.type) {
        return false;
      }
      if (filters.objective && !template.objectives.includes(filters.objective)) {
        return false;
      }
      if (filters.vertical && !template.compatibleVerticals.includes(filters.vertical)) {
        return false;
      }
      return true;
    });
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/**
 * The canonical, application-wide registry instance, built from the
 * built-in template library. A module-level singleton is appropriate
 * here specifically because the source data is immutable built-in
 * configuration (no writes, no request-scoped state, no dependency
 * injection needs) — the same pattern the codebase already uses for
 * config/verticals.ts's VERTICAL_CONFIGS and config/reels.ts's
 * REEL_TEMPLATES. Every consumer should import this instance rather than
 * constructing its own `BuiltinCreativeTemplateRegistry`; the class
 * itself stays exported for tests that need isolated fixtures.
 */
export const creativeTemplateRegistry: CreativeTemplateRegistry =
  new BuiltinCreativeTemplateRegistry(BUILTIN_CREATIVE_TEMPLATES);
