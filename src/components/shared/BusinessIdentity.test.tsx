import { render } from '@testing-library/react';
import { BusinessIdentity } from './BusinessIdentity';
import ContactPage from '@/app/contact/page';
import { LandingFooter } from '@/features/landing/components/LandingFooter';

const REQUIRED = ['Mitra by BrainWise', 'VISHESH KAKAR', 'vishesh.kakar@gmail.com', '8688693097'];

describe('public business identity', () => {
  it.each([
    ['BusinessIdentity', <BusinessIdentity key="a" />],
    ['Contact page', <ContactPage key="b" />],
    ['Landing footer', <LandingFooter key="c" />],
  ])('%s shows the proprietor details as selectable text', (_n, el) => {
    const text = render(el).container.textContent ?? '';
    for (const v of REQUIRED) expect(text).toContain(v);
  });

  it('footer navigation uses crawlable anchor links', () => {
    const { container } = render(<LandingFooter />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    for (const h of ['/pricing', '/about', '/contact', '/privacy', '/terms', '/refund']) {
      expect(hrefs).toContain(h);
    }
  });
});
