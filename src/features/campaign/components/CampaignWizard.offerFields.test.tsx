import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Business } from '@/types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const getByUserIdMock = jest.fn();
const listByBusinessMock = jest.fn();
jest.mock('@/services/database', () => ({
  businessService: { getByUserId: (...a: unknown[]) => getByUserIdMock(...a) },
  productService: { listByBusiness: (...a: unknown[]) => listByBusinessMock(...a) },
  subscriptionService: { getByUserId: jest.fn().mockResolvedValue(null) },
  usageService: { getCurrentPeriod: jest.fn().mockResolvedValue(null) },
  campaignService: { get: jest.fn() },
}));
jest.mock('@/hooks/useToast', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));
jest.mock('@/features/asset/components/ImageUploader', () => ({ ImageUploader: () => null }));
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { CampaignWizard } from './CampaignWizard';

/**
 * The offer step shows the SAME rules the callable enforces (shared validator) as a specific message next to
 * the offending field, with aria-invalid / aria-describedby, updating live as the owner fixes it. The server
 * revalidates regardless (generateCampaignStrategy.offerValidation.test.ts).
 */
const business = {
  businessId: 'biz_1',
  userId: 'user_1',
  name: 'Kondapur Biryani House',
  category: 'restaurant',
  location: { city: 'Hyderabad', state: 'Telangana' },
  contact: { phone: '9876543210', whatsapp: '9876543210' },
  businessBrain: {},
  settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as Business;

const product = {
  productId: 'p1',
  businessId: 'biz_1',
  name: 'Chicken Dum Biryani',
  price: 250,
  images: [{ url: 'https://example.com/biryani.png' }],
  status: 'active',
};

async function reachOfferStep() {
  const user = userEvent.setup();
  const view = render(<CampaignWizard userId="user_1" />);
  await screen.findByRole('button', { name: /post/i });
  // Adaptive: on each pass make whatever selection the current step offers, then continue.
  for (let i = 0; i < 12 && !screen.queryByPlaceholderText('e.g., 299'); i++) {
    for (const name of [/^post/i, /weekend/i, /template one/i, /chicken dum biryani/i]) {
      // The objective step also shows quick-idea shortcuts with similar names; only the real option
      // buttons carry aria-pressed.
      const option = screen
        .queryAllByRole('button', { name })
        .find((b) => b.getAttribute('aria-pressed') === 'false');
      if (option) await user.click(option);
    }
    await user.click(screen.getByRole('button', { name: /continue/i }));
  }
  await screen.findByPlaceholderText('e.g., 299');
  return { user, container: view.container };
}

const priceInput = () => screen.getByPlaceholderText('e.g., 299') as HTMLInputElement;
const originalInput = () => screen.getByPlaceholderText('e.g., 349') as HTMLInputElement;
const setNumber = (el: HTMLInputElement, value: string) =>
  fireEvent.change(el, { target: { value } });
const dates = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

/** The alert wired to `input` through aria-describedby, or null. */
const errorFor = (input: HTMLElement) => {
  const id = input.getAttribute('aria-describedby');
  return id ? document.getElementById(id) : null;
};

async function fillBasics(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
  await user.selectOptions(screen.getByDisplayValue('Select an offer type'), 'percentage');
  await user.type(screen.getByPlaceholderText('e.g., Weekend Biryani Special'), 'Weekend Special');
  const [start, end] = dates(container);
  fireEvent.change(start!, { target: { value: '2026-10-10' } });
  fireEvent.change(end!, { target: { value: '2026-10-15' } });
}

describe('CampaignWizard offer step: field-level errors from the shared rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getByUserIdMock.mockResolvedValue([business]);
    listByBusinessMock.mockResolvedValue([product]);
    callFunctionMock.mockImplementation(async ({ functionName }: { functionName: string }) =>
      functionName === 'listCreativeTemplates'
        ? { templates: [{ id: 't1', name: 'Template One', description: 'A template' }] }
        : {}
    );
  });

  it('a "was" price below the offer price: specific error beside Original price; fixing it clears it and moves on', async () => {
    const { user, container } = await reachOfferStep();
    await fillBasics(user, container);
    setNumber(originalInput(), '249');
    setNumber(priceInput(), '299');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    const original = originalInput();
    expect(original).toHaveAttribute('aria-invalid', 'true');
    const alert = errorFor(original);
    expect(alert).toHaveTextContent(
      /original price \(₹249\) is lower than the offer price \(₹299\)/i
    );
    expect(alert).toHaveAttribute('role', 'alert');
    expect(priceInput()).toHaveAttribute('aria-invalid', 'false'); // the OTHER field is not blamed
    expect(screen.getByPlaceholderText('e.g., 299')).toBeInTheDocument(); // still on the offer step

    // Live: correcting the figure removes the error, and Continue now proceeds.
    // A genuinely valid pair for a product whose catalogue price is ₹250.
    setNumber(priceInput(), '199');
    setNumber(originalInput(), '250');
    await waitFor(() => expect(originalInput()).toHaveAttribute('aria-invalid', 'false'));
    expect(errorFor(originalInput())).toBeNull();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.queryByPlaceholderText('e.g., 299')).not.toBeInTheDocument());
  });

  it('percentage offer with equal prices: no discount to state', async () => {
    const { user, container } = await reachOfferStep();
    await fillBasics(user, container);
    setNumber(originalInput(), '299');
    setNumber(priceInput(), '299');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(errorFor(originalInput())).toHaveTextContent(/no discount to state/i);
  });

  it('a "was" price that disagrees with the catalogue price of the chosen product', async () => {
    const { user, container } = await reachOfferStep(); // the product's catalogue price is ₹250
    await fillBasics(user, container);
    setNumber(originalInput(), '200');
    setNumber(priceInput(), '160');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(errorFor(originalInput())).toHaveTextContent(
      /does not match this product's price in your catalogue \(₹250\)/i
    );
  });

  it('campaign end before start: error beside the campaign end date', async () => {
    const { user, container } = await reachOfferStep();
    await fillBasics(user, container);
    setNumber(originalInput(), '250');
    setNumber(priceInput(), '199');
    const [start, end] = dates(container);
    fireEvent.change(start!, { target: { value: '2026-10-15' } });
    fireEvent.change(end!, { target: { value: '2026-10-10' } });
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(errorFor(dates(container)[1]!)).toHaveTextContent(
      /campaign end date is earlier than its start/i
    );
    expect(errorFor(dates(container)[0]!)).toBeNull();
  });

  it('own offer dates: end before start, and an offer that is over before the campaign starts', async () => {
    const { user, container } = await reachOfferStep();
    await fillBasics(user, container);
    setNumber(originalInput(), '250');
    setNumber(priceInput(), '199');
    await user.click(screen.getByLabelText(/the offer has its own dates/i));

    let [, , offerStart, offerEnd] = dates(container);
    fireEvent.change(offerStart!, { target: { value: '2026-10-14' } });
    fireEvent.change(offerEnd!, { target: { value: '2026-10-12' } });
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(errorFor(dates(container)[3]!)).toHaveTextContent(
      /offer end date is earlier than its start/i
    );

    [, , offerStart, offerEnd] = dates(container);
    fireEvent.change(offerStart!, { target: { value: '2026-10-01' } });
    fireEvent.change(offerEnd!, { target: { value: '2026-10-05' } }); // before the campaign starts on the 10th
    await waitFor(() =>
      expect(errorFor(dates(container)[3]!)).toHaveTextContent(/ends before the campaign starts/i)
    );
  });

  it('missing required values get a message on that field (not one generic banner)', async () => {
    const { user, container } = await reachOfferStep();
    await user.selectOptions(screen.getByDisplayValue('Select an offer type'), 'percentage');
    await user.type(
      screen.getByPlaceholderText('e.g., Weekend Biryani Special'),
      'Weekend Special'
    );
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(errorFor(priceInput())).toHaveTextContent(/enter the offer price/i);
    expect(errorFor(dates(container)[0]!)).toHaveTextContent(/campaign start date/i);
    const field = priceInput().closest('div')!;
    expect(within(field).getByRole('alert')).toBeInTheDocument();
  });
});
