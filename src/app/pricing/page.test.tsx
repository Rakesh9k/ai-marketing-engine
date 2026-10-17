const clientProps = jest.fn();
jest.mock('./PricingPageClient', () => ({
  __esModule: true,
  default: (props: unknown) => {
    clientProps(props);
    return null;
  },
}));

import PricingPage from './page';

async function renderedProps() {
  const element = (await PricingPage()) as { props: Record<string, unknown> };
  return element.props;
}

describe('pricing page (server)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the Cashfree pricing client without gateway-specific geo props', async () => {
    expect(await renderedProps()).toEqual({});
  });
});
