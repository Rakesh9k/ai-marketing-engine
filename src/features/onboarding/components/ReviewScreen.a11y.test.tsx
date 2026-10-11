import React from 'react';
import { render, screen, within } from '@testing-library/react';
import axe from 'axe-core';

/**
 * Found by running axe against the real review screen in a browser: the recap was a <dl> whose groups
 * also held a button and a paragraph, which definition lists do not allow (dlitem, definition-list:
 * both "serious"). It is a list of "label, value, Change" rows, so it is a list.
 */
jest.mock('@/components/ui/MitraMascot', () => ({ MitraMascot: () => <span /> }));

import { ReviewScreen } from './ReviewScreen';

const props: React.ComponentProps<typeof ReviewScreen> = {
  known: {
    'owner.name': 'Asha',
    'owner.role': 'owner',
    'identity.industry': 'restaurant_food',
    'identity.subcategory': 'cloud_kitchen',
    'identity.name': 'Smoky Pot Kitchen',
    'identity.city': 'Hyderabad',
    'identity.state': 'Telangana',
    'contact.whatsapp': '9876543210',
    'offering.signature': ['Biryani'],
    'audience.primary': ['Families'],
  },
  skipped: new Set(),
  suggestions: {},
  canConfirm: true,
  onShown: jest.fn(),
  onChange: jest.fn(),
  onAccept: jest.fn(),
  onConfirm: jest.fn(),
};

describe('review screen structure', () => {
  it('lists each understood fact as a list item with its own Change control', () => {
    render(<ReviewScreen {...props} />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(8);
    expect(within(items[0]!).getByRole('button', { name: /^change/i })).toBeInTheDocument();
  });

  it('passes the list-structure accessibility rules (no definition-list / dlitem violations)', async () => {
    const { container } = render(<ReviewScreen {...props} />);
    const result = await axe.run(container, {
      runOnly: { type: 'rule', values: ['definition-list', 'dlitem', 'list', 'listitem'] },
    });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
