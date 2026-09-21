import {
  composeCreativeSVG,
  wrapText,
  escapeSvgText,
  CREATIVE_DIMENSIONS,
  DEFAULT_BRAND_STYLE,
  type CreativeTextOverlay,
} from './compositor';

const BASE_OVERLAY: CreativeTextOverlay = {
  businessName: 'Test Biryani House',
  productName: 'Paneer Biryani',
  headline: 'Weekend Biryani Special',
  priceText: '₹299',
  originalPriceText: '₹332',
  offerBadge: '10% OFF',
  ctaText: 'Order on WhatsApp',
  phone: '9876543210',
  locality: 'Kondapur',
};

describe('escapeSvgText', () => {
  it('escapes characters that would break SVG XML or allow injection', () => {
    expect(escapeSvgText(`<script>alert("x")</script> & 'quote'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &apos;quote&apos;'
    );
  });
});

describe('wrapText', () => {
  it('keeps short text on one line', () => {
    expect(wrapText('Order Now', 30, 2)).toEqual(['Order Now']);
  });

  it('wraps long text across multiple lines without losing words', () => {
    const lines = wrapText('This is a fairly long marketing headline about biryani', 20, 4);
    expect(lines.join(' ').replace(/…$/, '')).toContain('This is a fairly long');
    expect(lines.length).toBeLessThanOrEqual(4);
  });

  it('truncates with an ellipsis rather than exceeding maxLines (no canvas overflow)', () => {
    const veryLong = 'word '.repeat(50).trim();
    const lines = wrapText(veryLong, 10, 2);
    expect(lines.length).toBe(2);
    expect(lines[1]!.endsWith('…')).toBe(true);
  });

  it('never returns more lines than maxLines for any input length', () => {
    for (const len of [5, 20, 100, 500]) {
      const text = 'a'.repeat(len);
      const lines = wrapText(text, 15, 3);
      expect(lines.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('composeCreativeSVG — factual accuracy (Phase 7 golden tests)', () => {
  const svg = composeCreativeSVG('https://storage.example.com/hero.png', BASE_OVERLAY, DEFAULT_BRAND_STYLE, 'poster');

  it('is well-formed SVG referencing the given (permanent) base image URL', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<image href="https://storage.example.com/hero.png"');
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  it('renders the exact authoritative price — never an invented one', () => {
    expect(svg).toContain('₹299');
    expect(svg).not.toContain('₹399');
  });

  it('renders the exact authoritative discount — never an invented one', () => {
    expect(svg).toContain('10% OFF');
    expect(svg).not.toContain('50% OFF');
  });

  it('renders the exact authoritative phone number — never an invented one', () => {
    expect(svg).toContain('9876543210');
    expect(svg).not.toContain('9111111111');
  });

  it('renders the exact authoritative CTA text', () => {
    expect(svg).toContain('Order on WhatsApp');
  });

  it('renders the business name and locality', () => {
    expect(svg).toContain('Test Biryani House');
    expect(svg).toContain('Kondapur');
  });

  it('is deterministic — identical input always produces identical output', () => {
    const svg2 = composeCreativeSVG('https://storage.example.com/hero.png', BASE_OVERLAY, DEFAULT_BRAND_STYLE, 'poster');
    expect(svg).toBe(svg2);
  });
});

describe('composeCreativeSVG — dimensions', () => {
  it('poster format uses the declared 4:5 dimensions', () => {
    const svg = composeCreativeSVG('https://x/y.png', BASE_OVERLAY, DEFAULT_BRAND_STYLE, 'poster');
    expect(svg).toContain(`width="${CREATIVE_DIMENSIONS.poster.width}"`);
    expect(svg).toContain(`height="${CREATIVE_DIMENSIONS.poster.height}"`);
  });

  it('story format uses the declared 9:16 dimensions', () => {
    const svg = composeCreativeSVG('https://x/y.png', BASE_OVERLAY, DEFAULT_BRAND_STYLE, 'story');
    expect(svg).toContain(`width="${CREATIVE_DIMENSIONS.story.width}"`);
    expect(svg).toContain(`height="${CREATIVE_DIMENSIONS.story.height}"`);
  });
});

describe('composeCreativeSVG — readability across headline lengths (no overflow/clipping)', () => {
  const lengths: Array<[string, string]> = [
    ['short', 'Special'],
    ['medium', 'Weekend Biryani Special Offer'],
    ['long', 'Weekend Biryani Special Offer Just For You This Saturday And Sunday Only'],
  ];

  it.each(lengths)('%s headline stays within the canvas (no text coordinate exceeds declared width/height)', (_label, headline) => {
    const overlay = { ...BASE_OVERLAY, headline };
    const svg = composeCreativeSVG('https://x/y.png', overlay, DEFAULT_BRAND_STYLE, 'poster');
    const { width, height } = CREATIVE_DIMENSIONS.poster;

    const xMatches = [...svg.matchAll(/x="(-?\d+(?:\.\d+)?)"/g)].map((m) => parseFloat(m[1]!));
    const yMatches = [...svg.matchAll(/y="(-?\d+(?:\.\d+)?)"/g)].map((m) => parseFloat(m[1]!));

    expect(xMatches.every((x) => x >= 0 && x <= width)).toBe(true);
    expect(yMatches.every((y) => y >= 0 && y <= height)).toBe(true);
  });

  it('a very long business name does not break SVG well-formedness', () => {
    const overlay = { ...BASE_OVERLAY, businessName: 'The Absolute Best Biryani And Kebab House Of Old City Hyderabad Est. 1970' };
    const svg = composeCreativeSVG('https://x/y.png', overlay, DEFAULT_BRAND_STYLE, 'poster');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });
});

describe('composeCreativeSVG — no unauthorized claims injected', () => {
  it('never renders a discount badge when none is authorized (offerBadge undefined)', () => {
    const { offerBadge: _drop, ...withoutBadge } = BASE_OVERLAY;
    const svg = composeCreativeSVG('https://x/y.png', withoutBadge, DEFAULT_BRAND_STYLE, 'poster');
    expect(svg).not.toContain('% OFF');
  });

  it('omits the original-price strikethrough when none is provided', () => {
    const { originalPriceText: _drop, ...withoutOriginal } = BASE_OVERLAY;
    const svg = composeCreativeSVG('https://x/y.png', withoutOriginal, DEFAULT_BRAND_STYLE, 'poster');
    expect(svg).not.toContain('₹332');
  });
});
