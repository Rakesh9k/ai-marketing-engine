/**
 * The pricing route is a server component: it reads the CDN geo header and passes either a
 * real country code or NOTHING to the client. No sentinel or guessed country may ever
 * reach Paddle.
 */
const headersMock = jest.fn();
jest.mock('next/headers', () => ({ headers: () => headersMock() }));

const clientProps = jest.fn();
jest.mock('./PricingPageClient', () => ({
  __esModule: true,
  default: (props: unknown) => {
    clientProps(props);
    return null;
  },
}));

import PricingPage from './page';

function withHeader(value?: string) {
  headersMock.mockResolvedValue({
    get: (name: string) => (name.toLowerCase() === 'x-vercel-ip-country' ? (value ?? null) : null),
  });
}

async function renderedProps() {
  const element = (await PricingPage()) as { props: Record<string, unknown> };
  return element.props;
}

describe('pricing page (server) — country detection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes the country from x-vercel-ip-country', async () => {
    withHeader('IN');
    expect(await renderedProps()).toEqual({ countryCode: 'IN' });
  });

  it('passes no country when the header is absent', async () => {
    withHeader(undefined);
    const props = await renderedProps();
    expect(props['countryCode']).toBeUndefined();
  });

  it.each(['UNKNOWN', 'OTHERS', 'XX', 'T1', ''])(
    'never forwards the non-country value %p',
    async (value) => {
      withHeader(value);
      expect((await renderedProps())['countryCode']).toBeUndefined();
    }
  );
});
