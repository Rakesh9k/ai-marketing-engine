/**
 * initPaddle: explicit environment/token, PricePreview with the country omitted when unknown,
 * formatted totals passed through untouched, and a one-page overlay checkout with a /welcome
 * success URL.
 */
import type * as InitPaddle from './initPaddle';

const initializePaddleMock = jest.fn();
jest.mock('@paddle/paddle-js', () => ({
  initializePaddle: (...args: unknown[]) => initializePaddleMock(...args),
}));

const pricePreview = jest.fn();
const checkoutOpen = jest.fn();
const checkoutClose = jest.fn();

function loadFresh() {
  let mod!: typeof InitPaddle;
  jest.isolateModules(() => {
    mod = require('./initPaddle');
  });
  return mod;
}

describe('initPaddle', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: 'sandbox',
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: 'test_clienttoken',
    };
    initializePaddleMock.mockResolvedValue({
      PricePreview: pricePreview,
      Checkout: { open: checkoutOpen, close: checkoutClose },
    });
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('initialises explicitly for the configured environment with the configured token', async () => {
    pricePreview.mockResolvedValue({ data: { details: { lineItems: [] } } });
    const { previewPrices } = loadFresh();
    await previewPrices(['pri_a']);
    expect(initializePaddleMock).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'sandbox', token: 'test_clienttoken' })
    );
  });

  it('fails loudly — without contacting Paddle — when the environment is missing', async () => {
    delete process.env['NEXT_PUBLIC_PADDLE_ENVIRONMENT'];
    const { previewPrices } = loadFresh();
    await expect(previewPrices(['pri_a'])).rejects.toThrow(/NEXT_PUBLIC_PADDLE_ENVIRONMENT/);
    expect(initializePaddleMock).not.toHaveBeenCalled();
  });

  it('fails loudly when the token is missing or is for the other environment', async () => {
    delete process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'];
    await expect(loadFresh().previewPrices(['pri_a'])).rejects.toThrow(/CLIENT_TOKEN/);

    process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'] = 'live_abc';
    await expect(loadFresh().previewPrices(['pri_a'])).rejects.toThrow(/does not match/);
    expect(initializePaddleMock).not.toHaveBeenCalled();
  });

  it('PricePreview with a country passes it; without one the address is omitted entirely', async () => {
    pricePreview.mockResolvedValue({ data: { details: { lineItems: [] } } });
    const { previewPrices } = loadFresh();

    await previewPrices(['pri_a', 'pri_b'], 'IN');
    expect(pricePreview).toHaveBeenLastCalledWith({
      items: [
        { priceId: 'pri_a', quantity: 1 },
        { priceId: 'pri_b', quantity: 1 },
      ],
      address: { countryCode: 'IN' },
    });

    await previewPrices(['pri_a']);
    const lastArg = pricePreview.mock.calls.at(-1)![0];
    expect(lastArg).toEqual({ items: [{ priceId: 'pri_a', quantity: 1 }] });
    expect('address' in lastArg).toBe(false);
  });

  it("returns Paddle's formattedTotals.total verbatim, keyed by price ID", async () => {
    pricePreview.mockResolvedValue({
      data: {
        details: {
          lineItems: [
            {
              price: { id: 'pri_a' },
              formattedTotals: { total: '₹999.00' },
              totals: { total: '99900' },
            },
            {
              price: { id: 'pri_b' },
              formattedTotals: { total: 'US$12.34' },
              totals: { total: '1234' },
            },
          ],
        },
      },
    });
    const { previewPrices } = loadFresh();
    expect(await previewPrices(['pri_a', 'pri_b'])).toEqual({
      pri_a: '₹999.00',
      pri_b: 'US$12.34',
    });
  });

  it('does not call Paddle at all for an empty price list', async () => {
    const { previewPrices } = loadFresh();
    expect(await previewPrices([])).toEqual({});
    expect(initializePaddleMock).not.toHaveBeenCalled();
  });

  it('opens a one-page overlay for the transaction with a success URL', async () => {
    const { openPaddleCheckout } = loadFresh();
    await openPaddleCheckout({ transactionId: 'txn_1', successUrl: 'https://app.test/welcome' });
    expect(checkoutOpen).toHaveBeenCalledWith({
      transactionId: 'txn_1',
      settings: expect.objectContaining({
        displayMode: 'overlay',
        variant: 'one-page',
        successUrl: 'https://app.test/welcome',
      }),
    });
  });
});
