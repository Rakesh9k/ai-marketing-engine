import fs from 'fs';
import path from 'path';

/**
 * The wizard asks for the campaign's dates and, separately, whether the OFFER has dates. The offer's dates are never
 * filled in from the campaign's unless the owner picks "the whole campaign". Source guards (the DOM path is covered by
 * buildCampaignInput.validity.test.ts, which is the single place the payload is built).
 */
const wizard = fs.readFileSync(path.join(__dirname, 'CampaignWizard.tsx'), 'utf8');
const builder = fs.readFileSync(path.join(__dirname, '..', 'buildCampaignInput.ts'), 'utf8');

describe('CampaignWizard offer dates', () => {
  it("labels the dates as the campaign's and offers three explicit choices for the offer", () => {
    expect(wizard).toMatch(/Campaign start date/);
    expect(wizard).toMatch(/Campaign end date/);
    expect(wizard).toMatch(/No specific offer dates/);
    expect(wizard).toMatch(/The offer is valid for the whole campaign/);
    expect(wizard).toMatch(/The offer has its own dates/);
    expect(wizard).toMatch(/offer-validity-mode/);
  });

  it('validates custom offer dates', () => {
    expect(wizard).toMatch(/offer start and end dates/);
    expect(wizard).toMatch(/offer end date must be on or after/);
  });

  it('the payload builder never copies the campaign dates into the offer by default', () => {
    // The only place the campaign duration feeds the offer is the explicit whole_campaign branch.
    const offerBlock = builder.slice(builder.indexOf('offer: {'), builder.indexOf('duration: {'));
    expect(offerBlock).toMatch(/\.\.\.offerValidity/);
    expect(offerBlock).not.toMatch(/validityStart:\s*toIsoDateTime\(state\.duration/);
    expect(builder).toMatch(/validity\?\.mode === 'whole_campaign'/);
  });
});
