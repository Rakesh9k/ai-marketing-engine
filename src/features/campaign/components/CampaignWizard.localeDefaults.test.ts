import * as fs from 'fs';
import * as path from 'path';

/**
 * Guard: the wizard must not hard-code a language, a style, a price or a claim. It used to default every
 * business to `te_en` + `hyderabadi` in its presets, and the presets also invented prices ("295", "599"),
 * a "15% OFF" discount and claims ("Free delivery within 3km", "Includes 2 Special Biryanis…"). The
 * step-by-step form is not DOM-tested (see CampaignWizard.test.tsx), so this pins the source; the behaviour
 * itself is tested in quickIdeas.test.ts and localizationOptions.test.ts.
 */
const source = fs.readFileSync(path.join(__dirname, 'CampaignWizard.tsx'), 'utf8');

describe('CampaignWizard', () => {
  it('hard-codes no language or regional style', () => {
    expect(source).not.toMatch(/\|\|\s*'te_en'/);
    expect(source).not.toMatch(/\|\|\s*'hyderabadi'/);
  });

  it('contains none of the invented preset facts', () => {
    expect(source).not.toMatch(
      /Lunch Special 15% OFF|Weekend Family Biryani|Festive Season Celebration/
    );
    expect(source).not.toMatch(/Free delivery within|Serves 3-4|Special Biryanis/);
    expect(source).not.toMatch(/originalPrice:\s*'\d+'/);
    expect(source).not.toMatch(/price:\s*'\d+'/);
    expect(source).not.toContain('applyQuickPreset');
  });

  it('starts from the shared, per-business ideas and takes language defaults from the place', () => {
    expect(source).toMatch(/quickIdeasFor\(business\?\.category\)/);
    expect(source).toMatch(/applyQuickIdea\(/);
    expect(source).toMatch(/defaultLocalizationFor\(/);
  });

  it('understands a stored language and style instead of collapsing them', () => {
    // The prefill goes through ownerStatedLocalization, which understands a stored value as it is (via
    // normalizeLanguage / normalizeRegionalStyle) but ignores the placeholder an onboarding Brain stores.
    expect(source).toMatch(/ownerStatedLocalization\(bb\)\.primaryLanguage/);
    expect(source).toMatch(/ownerStatedLocalization\(bb\)\.regionalStyle/);
    expect(source).toMatch(/normalizeRegionalStyle\(/);
    expect(source).toMatch(/regionalStylesFor\(/);
    expect(source).not.toMatch(/function normalizeLanguage/);
  });
});
