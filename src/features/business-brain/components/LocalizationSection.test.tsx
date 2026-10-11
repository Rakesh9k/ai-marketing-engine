import React from 'react';
import { render } from '@testing-library/react';
import type { Business } from '@/types';

jest.mock('@/services/api', () => ({
  callFunction: jest.fn().mockResolvedValue({ success: true }),
}));

import { LocalizationSection } from './LocalizationSection';

/**
 * The editor used to open with Telugu + Hyderabadi when the owner had nothing stored, and saving without a
 * change wrote that into their Business Brain. An owner with no preference starts at English and neutral.
 */
const business = (localization?: Record<string, string>) =>
  ({
    businessId: 'b1',
    name: 'Glow',
    category: 'salon',
    location: { city: 'Mumbai', state: 'Maharashtra' },
    businessBrain: localization ? { localization } : {},
  }) as unknown as Business;

const selectValues = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('select')).map((s) => (s as HTMLSelectElement).value);

describe('LocalizationSection starting values', () => {
  it('an owner with nothing stored starts at English, English, neutral (never Telugu / Hyderabadi)', () => {
    const { container } = render(
      <LocalizationSection business={business()} onSaved={jest.fn()} onCancel={jest.fn()} />
    );
    const [primary, secondary, style] = selectValues(container);
    expect([primary, secondary, style]).toEqual(['en', 'en', 'neutral']);
  });

  it("an owner's stored Hinglish / Mumbai preference is shown, not replaced", () => {
    const { container } = render(
      <LocalizationSection
        business={business({
          primaryLanguage: 'hi_en',
          secondaryLanguage: 'hi',
          regionalStyle: 'mumbai',
        })}
        onSaved={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const [primary, secondary, style] = selectValues(container);
    expect([primary, secondary, style]).toEqual(['hi_en', 'hi', 'mumbai']);
  });
});
