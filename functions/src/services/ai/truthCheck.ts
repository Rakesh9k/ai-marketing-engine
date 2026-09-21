import type {
  TruthCheckResult,
  TruthCheckItem,
  ExtractedFacts,
  ExtractedPrice,
  TruthCheckStatus,
  GenerationPipelineInput,
} from '../../types';
import { getVerticalConfigOrDefault } from '../../config/verticals';

/**
 * Normalize price strings to a standard format for comparison
 */
export function normalizePrice(priceStr: string): number | null {
  if (!priceStr) return null;

  const cleaned = priceStr
    .replace(/[₹Rs\.INR]/gi, '')
    .replace(/[,\s]/g, '')
    .replace(/rupees?/gi, '')
    .trim();

  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  return parseFloat(match[1]!);
}

/**
 * Normalize location strings for comparison
 */
export function normalizeLocation(locStr: string): string {
  if (!locStr) return '';

  return locStr.toLowerCase().replace(/[-,]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize phone/WhatsApp numbers for comparison
 */
export function normalizePhone(phoneStr: string): string {
  if (!phoneStr) return '';

  const digits = phoneStr.replace(/\D/g, '');

  if (digits.length >= 10) {
    return digits.slice(-10);
  }

  return digits;
}

/**
 * Normalize discount strings for comparison
 */
export function normalizeDiscount(discountStr: string): number | null {
  if (!discountStr) return null;

  const cleaned = discountStr
    .toLowerCase()
    .replace(/%/g, '')
    .replace(/percent/gi, '')
    .replace(/discount/gi, '')
    .replace(/off/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  return parseFloat(match[1]!);
}

/**
 * Extract prices from text
 */
export function extractPrices(text: string): ExtractedPrice[] {
  const prices: ExtractedPrice[] = [];

  const priceRegex = /(?:₹|Rs\.?\s?|INR\s?)(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi;
  let match: RegExpExecArray | null;

  while ((match = priceRegex.exec(text)) !== null) {
    const rawText = match[0];
    const amount = parseFloat(match[1]!.replace(/,/g, ''));

    prices.push({
      amount,
      currency: 'INR',
      rawText: rawText.trim(),
    });
  }

  const contextPriceRegex = /(?:price|cost|rs|₹|inr)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi;
  let contextMatch: RegExpExecArray | null;

  while ((contextMatch = contextPriceRegex.exec(text)) !== null) {
    const rawText = contextMatch[0];
    const amount = parseFloat(contextMatch[1]!.replace(/,/g, ''));

    if (!prices.some((p) => p.rawText === contextMatch![0].trim())) {
      prices.push({
        amount,
        currency: 'INR',
        rawText: rawText.trim(),
      });
    }
  }

  return prices;
}

/**
 * Extract discount percentages from text
 */
export function extractDiscounts(text: string): number[] {
  const discounts: number[] = [];

  const discountRegex = /(\d{1,3}(?:\.\d+)?)\s*%?\s*(?:percent\s*)?(?:off)?/gi;
  let match: RegExpExecArray | null;

  while ((match = discountRegex.exec(text)) !== null) {
    const value = parseFloat(match[1]!);
    if (value > 0 && value <= 100) {
      discounts.push(value);
    }
  }

  const percentRegex = /(\d{1,3}(?:\.\d+)?)\s*percent/gi;
  let percentMatch: RegExpExecArray | null;

  while ((percentMatch = percentRegex.exec(text)) !== null) {
    const value = parseFloat(percentMatch[1]!);
    if (value > 0 && value <= 100) {
      discounts.push(value);
    }
  }

  return [...new Set(discounts)];
}

/**
 * Extract locations from text
 */
export function extractLocations(text: string): string[] {
  const locations: string[] = [];

  const hyderabadLocalities = [
    'kondapur',
    'gachibowli',
    'hitech city',
    'madhapur',
    'jubilee hills',
    'banjara hills',
    'somajiguda',
    'punjagutta',
    'ameerpet',
    'kukatpally',
    'miyapur',
    'manikonda',
    'nallagandla',
    'tellapur',
    'chandanagar',
    'hyderabad',
    'secunderabad',
    'telangana',
  ];

  const lowerText = text.toLowerCase();

  for (const loc of hyderabadLocalities) {
    if (lowerText.includes(loc.toLowerCase())) {
      locations.push(loc);
    }
  }

  return [...new Set(locations)];
}

/**
 * Extract phone numbers from text
 */
export function extractPhoneNumbers(text: string): string[] {
  const phones: string[] = [];

  const phoneRegex = /(?:\+91[\s-]?)?(?:9|8|7|6)\d{9}/g;
  let match: RegExpExecArray | null;

  while ((match = phoneRegex.exec(text)) !== null) {
    phones.push(match[0]);
  }

  return [...new Set(phones.map((p) => p.replace(/\D/g, '')))];
}

/**
 * Extract WhatsApp numbers from text
 */
export function extractWhatsAppNumbers(text: string): string[] {
  const waLinkRegex = /wa\.me\/91(\d{10})/gi;
  const waMatches = text.match(waLinkRegex);

  if (waMatches) {
    return [...new Set(waMatches.map((m) => m.replace(/.*91/, '')))];
  }

  return [];
}

/**
 * Extract business names from text
 */
export function extractBusinessNames(text: string, knownBusinessNames: string[]): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const name of knownBusinessNames) {
    if (name && lowerText.includes(name.toLowerCase())) {
      found.push(name);
    }
  }

  return [...new Set(found)];
}

/**
 * Extract product names from text
 */
export function extractProductNames(text: string, knownProducts: string[]): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const product of knownProducts) {
    if (product && lowerText.includes(product.toLowerCase())) {
      found.push(product);
    }
  }

  return [...new Set(found)];
}

/**
 * Extract operational claims from text
 */
export function extractOperationalClaims(text: string): string[] {
  const claims: string[] = [];
  const lowerText = text.toLowerCase();

  const opsKeywords = [
    'delivery',
    'takeaway',
    'dine-in',
    'dine in',
    'take away',
    'home delivery',
    'online ordering',
    'booking',
    'reservation',
    'open',
    'close',
    'hours',
    'timing',
    'timings',
  ];

  for (const keyword of opsKeywords) {
    if (lowerText.includes(keyword)) {
      claims.push(keyword);
    }
  }

  return [...new Set(claims)];
}

/**
 * Extract marketing claims from text
 */
export function extractMarketingClaims(text: string): string[] {
  const claims: string[] = [];
  const lowerText = text.toLowerCase();

  const claimPatterns = [
    'best in',
    'best restaurant',
    'best food',
    'number 1',
    '#1',
    'no. 1',
    'number 1',
    'top rated',
    'highest rated',
    'most popular',
    'famous',
    'renowned',
    'legendary',
    'iconic',
    'guaranteed',
    'guarantee',
    'risk-free',
    'risk free',
    '100%',
    'hundred percent',
    'doctor recommended',
    'clinically proven',
    'expert recommended',
    'award winning',
    'award-winning',
    'awarded',
    'certified',
    'verified',
    'trusted',
    'free delivery',
    'free home delivery',
    'open 24/7',
    'open 24x7',
    '24/7',
    '24x7',
    'round the clock',
    'always open',
    'unlimited',
    'unlimited refills',
    '1000+ customers',
    '1000+ reviews',
    'rated 5 star',
    '5 star rating',
    '5/5',
  ];

  for (const pattern of claimPatterns) {
    if (lowerText.includes(pattern)) {
      claims.push(pattern);
    }
  }

  return [...new Set(claims)];
}

/**
 * Extract all facts from generated campaign content
 */
export function extractFacts(
  copyPack: any,
  businessContext: any,
  productContext: any
): {
  businessNames: string[];
  productNames: string[];
  prices: ExtractedPrice[];
  discounts: string[];
  offers: string[];
  locations: string[];
  phoneNumbers: string[];
  whatsappNumbers: string[];
  dates: string[];
  operationalClaims: string[];
  marketingClaims: string[];
} {
  const allText = JSON.stringify(copyPack).toLowerCase();

  const knownBusinessNames: string[] = [];
  if (businessContext?.businessFacts) {
    for (const fact of businessContext.businessFacts) {
      if (fact.category === 'identity' && fact.fact.toLowerCase().includes('name')) {
        knownBusinessNames.push(fact.fact);
      }
    }
  }

  const knownProducts: string[] = [];
  if (productContext?.productFacts) {
    for (const fact of productContext.productFacts) {
      if (fact.fact.toLowerCase().includes('name') || fact.fact.toLowerCase().includes('dish')) {
        knownProducts.push(fact.fact);
      }
    }
  }

  if (productContext?.visualAttributes?.dishName) {
    knownProducts.push(productContext.visualAttributes.dishName);
  }

  return {
    businessNames: extractBusinessNames(JSON.stringify(copyPack), knownBusinessNames),
    productNames: extractProductNames(JSON.stringify(copyPack), knownProducts),
    prices: extractPrices(JSON.stringify(copyPack)),
    discounts: extractDiscounts(JSON.stringify(copyPack)).map((d) => `${d}%`),
    offers: [],
    locations: extractLocations(JSON.stringify(copyPack)),
    phoneNumbers: extractPhoneNumbers(JSON.stringify(copyPack)),
    whatsappNumbers: extractWhatsAppNumbers(JSON.stringify(copyPack)),
    dates: [],
    operationalClaims: extractOperationalClaims(JSON.stringify(copyPack)),
    marketingClaims: extractMarketingClaims(JSON.stringify(copyPack)),
  };
}

/**
 * Normalize a fact value for comparison
 */
export function normalizeFactValue(
  value: string,
  type: 'price' | 'location' | 'phone' | 'discount' | 'text'
): string {
  switch (type) {
    case 'price':
      const normalizedPrice = normalizePrice(value);
      return normalizedPrice ? `₹${normalizedPrice}` : value;
    case 'location':
      return normalizeLocation(value);
    case 'phone':
      return normalizePhone(value);
    case 'discount':
      const normalizedDiscount = normalizeDiscount(value);
      return normalizedDiscount ? `${normalizedDiscount}%` : value;
    default:
      return value.toLowerCase().trim();
  }
}

/**
 * Deterministic Truth Check - Phase 16
 * Compares generated content against Business Brain facts using deterministic logic
 */
export function runDeterministicTruthCheck(
  input: GenerationPipelineInput,
  previousResults: any
): TruthCheckResult {
  const checks: TruthCheckItem[] = [];
  let overallStatus: TruthCheckStatus = 'PASS';

  const businessFacts = previousResults.businessUnderstanding?.businessFacts || [];
  const productFacts = previousResults.productUnderstanding?.productFacts || [];
  const copyPack = previousResults.copyPack;

  const allText = JSON.stringify(copyPack).toLowerCase();

  const expectedBusinessName = input.businessName ?? '';
  const expectedProductName = input.productName ?? '';
  const expectedOfferPrice = input.offerPrice ?? 0;
  const expectedOriginalPrice = input.offerOriginalPrice ?? 0;
  const expectedOfferType = input.offerType ?? '';
  const expectedLocation = input.businessLocation?.locality ?? input.businessLocation?.city ?? '';
  const expectedWhatsApp = input.whatsappNumber ?? '';
  const expectedOfferHeadline = input.offerHeadline ?? '';

  // 1. Business Name Check
  const businessNameCheck = checkBusinessName(allText, expectedBusinessName);
  checks.push(businessNameCheck);
  if (businessNameCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 2. Product Name Check
  const productNameCheck = checkProductName(allText, expectedProductName);
  checks.push(productNameCheck);
  if (productNameCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 3. Price Check (Critical)
  const priceCheck = checkPrice(allText, expectedOfferPrice);
  checks.push(priceCheck);
  if (priceCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 4. Original Price Check (if provided)
  if (input.offerOriginalPrice !== undefined && input.offerOriginalPrice !== null) {
    const originalPriceCheck = checkOriginalPrice(allText, input.offerOriginalPrice);
    checks.push(originalPriceCheck);
    if (originalPriceCheck.status === 'FAIL') overallStatus = 'FAIL';
    else if (originalPriceCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
      overallStatus = 'REVIEW_REQUIRED';
    }
  }

  // 4b. Promotional Price Logic Check
  const promoPriceCheck = checkPromotionalPrice(
    allText,
    expectedOfferPrice,
    input.offerOriginalPrice
  );
  if (promoPriceCheck) {
    checks.push(promoPriceCheck);
    if (promoPriceCheck.status === 'FAIL') overallStatus = 'FAIL';
  }

  // 5. Location Check
  const locationCheck = checkLocation(allText, expectedLocation);
  checks.push(locationCheck);
  if (locationCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 6. WhatsApp Number Check
  const whatsappCheck = checkWhatsApp(allText, expectedWhatsApp);
  checks.push(whatsappCheck);
  if (whatsappCheck.status === 'FAIL') overallStatus = 'FAIL';
  else if (whatsappCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
    overallStatus = 'REVIEW_REQUIRED';
  }

  // 7. Business Phone Check
  const phoneCheck = checkPhone(allText, input.businessPhone ?? '');
  checks.push(phoneCheck);
  if (phoneCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 8. Offer Type/Discount Check
  const offerCheck = checkOffer(
    allText,
    input.offerType ?? '',
    expectedOfferPrice,
    input.offerOriginalPrice,
    input.offerHeadline
  );
  checks.push(offerCheck);
  if (offerCheck.status === 'FAIL') overallStatus = 'FAIL';
  else if (offerCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
    overallStatus = 'REVIEW_REQUIRED';
  }

  // 8b. Unauthorized Discount Claim Check — catches a hallucinated discount
  // percentage even when it appears alongside (not instead of) a correct
  // one, and catches ANY percentage-off claim when no discount is
  // authorized at all (offerType isn't 'percentage'). checkOffer (#8) only
  // verifies the correct discount text is present somewhere; it does not
  // notice an additional, unauthorized discount claim in the same content.
  const unauthorizedDiscountCheck = checkUnauthorizedDiscountClaims(
    allText,
    input.offerType ?? '',
    expectedOfferPrice,
    input.offerOriginalPrice
  );
  checks.push(unauthorizedDiscountCheck);
  if (unauthorizedDiscountCheck.status === 'FAIL') overallStatus = 'FAIL';
  else if (unauthorizedDiscountCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
    overallStatus = 'REVIEW_REQUIRED';
  }

  // 9. Offer Validity Check
  const validityCheck = checkOfferValidity(
    allText,
    input.offerValidityStart,
    input.offerValidityEnd
  );
  checks.push(validityCheck);
  if (validityCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 10. Claims Check - Prohibited Claims
  const claimsCheck = checkProhibitedClaims(allText);
  checks.push(claimsCheck);
  if (claimsCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 11. Unsupported Claims Check
  const unsupportedClaimsCheck = checkUnsupportedClaims(allText, previousResults, input.vertical);
  checks.push(unsupportedClaimsCheck);
  if (unsupportedClaimsCheck.status === 'FAIL') overallStatus = 'FAIL';
  else if (unsupportedClaimsCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
    overallStatus = 'REVIEW_REQUIRED';
  }

  // 11. Operations Check (Delivery, Takeaway, Dine-in, Hours)
  const operationsCheck = checkOperations(allText, previousResults);
  checks.push(operationsCheck);
  if (operationsCheck.status === 'FAIL') overallStatus = 'FAIL';
  else if (operationsCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
    overallStatus = 'REVIEW_REQUIRED';
  }

  // 12. Contact Information Check (Business Phone, Website, Instagram)
  const contactCheck = checkContactInfo(allText, input);
  checks.push(contactCheck);
  if (contactCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 13. Business Hours Check
  const hoursCheck = checkBusinessHours(allText, previousResults);
  checks.push(hoursCheck);
  if (hoursCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 14. Minimum Order Check
  const minOrderCheck = checkMinimumOrder(allText, previousResults);
  checks.push(minOrderCheck);
  if (minOrderCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 15. Delivery Radius Check
  const deliveryRadiusCheck = checkDeliveryRadius(allText, previousResults);
  checks.push(deliveryRadiusCheck);
  if (deliveryRadiusCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 16. Salon Service/Package Catalog Check (Phase 30) — vertical-gated,
  // extends this SAME shared Truth Check rather than a separate one. Only
  // meaningful for salon, and only when the business actually has a
  // services/packages catalog on file (verticalProfile), consistent with
  // "missing facts must not PASS": a package claim with zero defined
  // packages is flagged, not silently passed.
  if (input.vertical === 'salon') {
    const catalogCheck = checkVerticalCatalogClaims(allText, input);
    if (catalogCheck) {
      checks.push(catalogCheck);
      if (catalogCheck.status === 'FAIL') overallStatus = 'FAIL';
      else if (catalogCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
        overallStatus = 'REVIEW_REQUIRED';
      }
    }
  }

  // 17. Real Estate Property Fact Checks (Phase 31) — vertical-gated, same
  // rationale as #16: extends this shared Truth Check rather than forking
  // one. Catches invented bedrooms/bathrooms/area/possession-status/
  // amenities claims — the exact list the phase brief names — against the
  // specific listing's own recorded facts, not a generic keyword table.
  if (input.vertical === 'real_estate') {
    const propertyChecks = checkPropertyFactClaims(allText, input);
    for (const propertyCheck of propertyChecks) {
      checks.push(propertyCheck);
      if (propertyCheck.status === 'FAIL') overallStatus = 'FAIL';
      else if (propertyCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
        overallStatus = 'REVIEW_REQUIRED';
      }
    }
  }

  // Build summary
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const reviewCount = checks.filter((c) => c.status === 'REVIEW_REQUIRED').length;

  const summary = `Truth Check: ${passCount} passed, ${failCount} failed, ${reviewCount} require review. ${failCount > 0 ? 'CRITICAL FAILURES DETECTED.' : reviewCount > 0 ? 'Review recommended before publishing.' : 'All checks passed.'}`;

  return {
    status: overallStatus,
    checkedAt: new Date().toISOString(),
    checks,
    summary,
  };
}

// ============ Individual Check Functions ============

function checkBusinessName(allText: string, expectedName: string): TruthCheckItem {
  if (!expectedName) {
    return {
      category: 'business',
      status: 'REVIEW_REQUIRED',
      expectedValue: 'NOT_PROVIDED',
      reason: 'Business name not provided in input',
    };
  }

  const passed = allText.includes(expectedName.toLowerCase());
  return {
    category: 'business',
    status: passed ? 'PASS' : 'FAIL',
    generatedValue: passed ? expectedName : 'NOT_FOUND',
    expectedValue: expectedName,
    reason: passed
      ? 'Business name matches'
      : `Business name "${expectedName}" not found in generated content`,
  };
}

function checkProductName(allText: string, expectedName: string): TruthCheckItem {
  if (!expectedName) {
    return {
      category: 'product',
      status: 'REVIEW_REQUIRED',
      expectedValue: 'NOT_PROVIDED',
      reason: 'Product name not provided in input',
    };
  }

  const passed = allText.includes(expectedName.toLowerCase());
  return {
    category: 'product',
    status: passed ? 'PASS' : 'FAIL',
    generatedValue: passed ? expectedName : 'NOT_FOUND',
    expectedValue: expectedName,
    reason: passed
      ? 'Product name matches'
      : `Product name "${expectedName}" not found in generated content`,
  };
}

function checkPrice(allText: string, expectedPrice: number): TruthCheckItem {
  if (!expectedPrice) {
    return {
      category: 'price',
      status: 'REVIEW_REQUIRED',
      expectedValue: 'NOT_PROVIDED',
      reason: 'Offer price not provided in input',
    };
  }

  const expectedPriceStr = `₹${expectedPrice}`;
  const priceMentions = allText.match(/(?:₹|Rs\.?\s?|INR\s?)\s*\d+/gi) || [];
  const priceMatch = priceMentions.some((p) => {
    const normalized = p.replace(/\s/g, '').replace(/Rs\.?/gi, '₹').replace(/INR/gi, '₹');
    return normalized === expectedPriceStr.replace(/\s/g, '');
  });

  return {
    category: 'price',
    status: priceMatch ? 'PASS' : 'FAIL',
    generatedValue: priceMentions.join(', ') || 'NONE',
    expectedValue: expectedPriceStr,
    reason: priceMatch
      ? 'Price matches exactly'
      : `Price mismatch. Expected ${expectedPriceStr}, found: ${priceMentions.join(', ') || 'none'}`,
  };
}

function checkOriginalPrice(allText: string, originalPrice: number): TruthCheckItem {
  if (!originalPrice) {
    return {
      category: 'price',
      status: 'REVIEW_REQUIRED',
      expectedValue: 'NOT_PROVIDED',
      reason: 'Original price not provided in input',
    };
  }

  const expectedOriginalPriceStr = `₹${originalPrice}`;
  const originalPriceMatch = allText.includes(expectedOriginalPriceStr.toLowerCase());

  return {
    category: 'price',
    status: originalPriceMatch ? 'PASS' : 'REVIEW_REQUIRED',
    generatedValue: originalPriceMatch ? expectedOriginalPriceStr : 'NOT_FOUND',
    expectedValue: expectedOriginalPriceStr,
    reason: originalPriceMatch
      ? 'Original price matches'
      : 'Original price not explicitly mentioned',
  };
}

function checkPromotionalPrice(
  allText: string,
  offerPrice: number,
  originalPrice?: number
): TruthCheckItem | null {
  if (!originalPrice || originalPrice <= offerPrice) {
    return null;
  }

  const expectedPriceStr = `₹${offerPrice}`;
  const priceMentions = allText.match(/₹\s*\d+/g) || [];
  const priceMatch = priceMentions.some(
    (p) => p.replace(/\s/g, '') === `₹${offerPrice}`.replace(/\s/g, '')
  );

  if (!priceMatch) {
    return {
      category: 'price',
      status: 'FAIL',
      generatedValue: allText.match(/₹\s*\d+/g)?.join(', ') || 'NONE',
      expectedValue: `₹${offerPrice} (promotional)`,
      reason: `Promotional price ₹${offerPrice} not found in generated content`,
    };
  }

  return null;
}

function checkLocation(allText: string, expectedLocation: string): TruthCheckItem {
  if (!expectedLocation) {
    return {
      category: 'location',
      status: 'REVIEW_REQUIRED',
      expectedValue: 'NOT_PROVIDED',
      reason: 'Location not provided in input',
    };
  }

  const normalizedExpected = expectedLocation
    .toLowerCase()
    .replace(/[-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedAllText = allText.replace(/[-,]/g, ' ').replace(/\s+/g, ' ');

  const locationMatch = normalizedAllText.includes(normalizedExpected);

  return {
    category: 'location',
    status: locationMatch ? 'PASS' : 'FAIL',
    generatedValue: locationMatch ? expectedLocation : 'NOT_FOUND',
    expectedValue: expectedLocation,
    reason: locationMatch
      ? 'Location matches'
      : `Location "${expectedLocation}" not found in generated content`,
  };
}

function checkWhatsApp(allText: string, whatsappNumber: string): TruthCheckItem {
  if (!whatsappNumber) {
    return {
      category: 'contact',
      status: 'REVIEW_REQUIRED',
      expectedValue: 'NOT_PROVIDED',
      reason: 'WhatsApp number not provided in input',
    };
  }

  const expectedDigits = whatsappNumber.replace(/\D/g, '').slice(-10);
  const whatsappMatch = allText.includes(expectedDigits);

  return {
    category: 'contact',
    status: whatsappMatch ? 'PASS' : 'REVIEW_REQUIRED',
    generatedValue: whatsappMatch ? whatsappNumber : 'NOT_FOUND',
    expectedValue: whatsappNumber,
    reason: whatsappMatch
      ? 'WhatsApp number present'
      : 'WhatsApp number not found in generated content',
  };
}

function checkPhone(allText: string, phoneNumber: string): TruthCheckItem {
  if (!phoneNumber) {
    return {
      category: 'contact',
      status: 'PASS',
      expectedValue: 'NOT_PROVIDED',
      reason: 'Business phone not provided in input',
    };
  }

  const expectedDigits = phoneNumber.replace(/\D/g, '').slice(-10);
  const phoneMatch = allText.includes(expectedDigits);

  return {
    category: 'contact',
    status: phoneMatch ? 'PASS' : 'FAIL',
    generatedValue: phoneMatch ? phoneNumber : 'NOT_FOUND',
    expectedValue: phoneNumber,
    reason: phoneMatch
      ? 'Business phone matches'
      : `Business phone "${phoneNumber}" not found in generated content`,
  };
}

function checkOffer(
  allText: string,
  offerType: string,
  offerPrice: number,
  originalPrice?: number,
  offerHeadline?: string
): TruthCheckItem {
  let expectedOfferText = '';

  switch (offerType) {
    case 'percentage':
      if (originalPrice && originalPrice > 0) {
        const discountPercent = Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
        expectedOfferText = `${discountPercent}%`;
      }
      break;
    case 'fixed':
      expectedOfferText = `₹${offerPrice}`;
      break;
    case 'bogo':
      expectedOfferText = 'bogo';
      break;
    case 'combo':
      expectedOfferText = 'combo';
      break;
    case 'free_delivery':
      expectedOfferText = 'free delivery';
      break;
    case 'loyalty':
      expectedOfferText = 'loyalty';
      break;
  }

  const allTextLower = allText.toLowerCase();
  const expectedLower = expectedOfferText.toLowerCase();

  const discountPercent =
    offerType === 'percentage' && originalPrice
      ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
      : null;

  let passed = false;
  let reason = '';

  if (discountPercent) {
    const discountText = `${discountPercent}%`;
    const discountMatch =
      allText.includes(discountText) || allTextLower.includes(`${discountPercent} percent`);
    passed = discountMatch;
    reason = discountMatch
      ? 'Discount percentage matches'
      : `Discount ${discountText} not explicitly mentioned`;
  } else if (offerType === 'fixed') {
    const priceStr = `₹${offerPrice}`;
    const priceMatch = allText.includes(priceStr);
    passed = priceMatch;
    reason = priceMatch ? 'Fixed price matches' : `Fixed price ₹${offerPrice} not mentioned`;
  } else {
    if (offerHeadline && allTextLower.includes(offerHeadline.toLowerCase())) {
      passed = true;
      reason = 'Offer headline mentioned';
    } else {
      passed = false;
      reason = 'Offer type not clearly communicated';
    }
  }

  return {
    category: 'offer',
    status: passed ? 'PASS' : 'FAIL',
    expectedValue: expectedOfferText || offerHeadline,
    reason,
  };
}

/**
 * Stricter than extractDiscounts() (which matches almost any 1-3 digit
 * number since '%'/'percent'/'off' are all optional in its regex, and
 * would false-positive on things like an age range "25-45" or a plain
 * price digit run). Requires an explicit '%' sign or the word "percent"
 * directly attached to the number, so it only matches things that actually
 * read as a percentage claim.
 */
function extractExplicitPercentages(text: string): number[] {
  // The \b must apply only to the "percent" alternative — '%' is itself a
  // non-word character, so `(?:%|percent)\b` never matches when a '%' is
  // followed by whitespace (e.g. "20% OFF"): the position right after '%'
  // sits between two non-word characters, which \b never treats as a
  // boundary, so the whole match silently fails.
  const regex = /(\d{1,3}(?:\.\d+)?)\s*(?:%|percent\b)/gi;
  const values: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const value = parseFloat(match[1]!);
    if (value > 0 && value <= 100) values.push(value);
  }
  return [...new Set(values)];
}

/**
 * checkOffer (above) only verifies the CORRECT discount text is present
 * somewhere in the content — it does not notice an additional, unauthorized
 * discount percentage claimed alongside it, and it does nothing at all when
 * offerType isn't 'percentage' (i.e. when no discount is authorized). This
 * closes that gap: any percentage claim not matching the authorized
 * discount is flagged, and any percentage claim at all when no discount is
 * authorized is flagged for review (not an automatic FAIL in that case,
 * since a bare "%" could occasionally be a non-discount claim like
 * "100% basmati rice" — see checkProhibitedClaims for the existing handling
 * of "100%" specifically. A mismatch against a *known* authorized discount
 * is unambiguous and FAILs outright).
 */
function checkUnauthorizedDiscountClaims(
  allText: string,
  offerType: string,
  offerPrice: number,
  originalPrice?: number
): TruthCheckItem {
  const mentionedPercentages = extractExplicitPercentages(allText);

  if (mentionedPercentages.length === 0) {
    return {
      category: 'offer',
      status: 'PASS',
      reason: 'No percentage-discount claims in generated content',
    };
  }

  const authorizedPercent =
    offerType === 'percentage' && originalPrice && originalPrice > 0
      ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
      : null;

  const unauthorized = mentionedPercentages.filter((p) => p !== authorizedPercent);

  if (unauthorized.length === 0) {
    return {
      category: 'offer',
      status: 'PASS',
      reason: 'All percentage-discount claims match the authorized discount',
    };
  }

  const unauthorizedText = unauthorized.map((p) => `${p}%`).join(', ');

  return {
    category: 'offer',
    status: authorizedPercent !== null ? 'FAIL' : 'REVIEW_REQUIRED',
    generatedValue: unauthorizedText,
    expectedValue: authorizedPercent !== null ? `${authorizedPercent}%` : 'NO DISCOUNT AUTHORIZED',
    reason:
      authorizedPercent !== null
        ? `Unauthorized discount claim(s) ${unauthorizedText} do not match the authorized discount of ${authorizedPercent}%`
        : `Discount claim(s) ${unauthorizedText} found but no discount is authorized for this offer (type: ${offerType || 'none'})`,
  };
}

function checkOfferValidity(
  allText: string,
  validityStart?: string,
  validityEnd?: string
): TruthCheckItem {
  if (!validityStart && !validityEnd) {
    return {
      category: 'offer',
      status: 'REVIEW_REQUIRED',
      expectedValue: 'NOT_PROVIDED',
      reason: 'Offer validity dates not provided in input',
    };
  }

  const dateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g;
  const dateMentions = allText.match(dateRegex) || [];

  let passed = true;
  let reason = 'Validity dates not explicitly verified in content';

  if (validityStart && dateMentions.length === 0) {
    passed = false;
    reason = 'Offer start date not mentioned in generated content';
  }

  return {
    category: 'offer',
    status: passed ? 'PASS' : 'REVIEW_REQUIRED',
    reason,
  };
}

function checkProhibitedClaims(allText: string): TruthCheckItem {
  const prohibitedClaims = [
    'best in',
    'best restaurant',
    'best food',
    'number 1',
    '#1',
    'no. 1',
    'number 1',
    'top rated',
    'highest rated',
    'most popular',
    'famous',
    'renowned',
    'legendary',
    'iconic',
    'guaranteed',
    'guarantee',
    'risk-free',
    'risk free',
    '100%',
    'hundred percent',
    'doctor recommended',
    'clinically proven',
    'expert recommended',
    'award winning',
    'award-winning',
    'awarded',
    'certified',
    'verified',
    'trusted',
    'free delivery',
    'free home delivery',
    'open 24/7',
    'open 24x7',
    '24/7',
    '24x7',
    'round the clock',
    'always open',
    'unlimited',
    'unlimited refills',
    '1000+ customers',
    '1000+ reviews',
    'rated 5 star',
    '5 star rating',
    '5/5',
    // Phase 31 — real estate financial/investment overclaims. These sit in
    // the universal list (not a vertical keyword table) for the same
    // reason 'best restaurant' does: it's a hype phrase that must never
    // appear regardless of vertical, not merely one requiring a supporting
    // fact.
    'best property',
    'guaranteed investment',
    'highest returns',
    'guaranteed returns',
    'assured returns',
    'guaranteed appreciation',
  ];

  const allTextLower = allText.toLowerCase();
  const foundClaims = prohibitedClaims.filter((claim) => allTextLower.includes(claim));

  if (foundClaims.length > 0) {
    return {
      category: 'claim',
      status: 'FAIL',
      generatedValue: foundClaims.join(', '),
      expectedValue: 'NONE',
      reason: `Prohibited claims detected: ${foundClaims.join(', ')}`,
    };
  }

  return {
    category: 'claim',
    status: 'PASS',
    reason: 'No prohibited claims detected',
  };
}

function checkUnsupportedClaims(
  allText: string,
  previousResults: any,
  vertical: GenerationPipelineInput['vertical']
): TruthCheckItem {
  const allTextLower = allText.toLowerCase();

  // Phase 29: this table now lives in config/verticals.ts (VerticalConfig.truthCheckClaimKeywords)
  // instead of being hard-coded here, so a vertical's Truth Check rules are
  // defined in exactly one place. Restaurant's table is unchanged (moved
  // verbatim); salon/real_estate intentionally have an empty table until
  // their claim dictionaries are actually built — see that file's header.
  const claimChecks = getVerticalConfigOrDefault(vertical).truthCheckClaimKeywords;

  const businessFacts = previousResults?.businessUnderstanding?.businessFacts || [];
  const businessRules = previousResults?.businessUnderstanding?.businessRules || {};

  let hasUnsupportedClaim = false;
  let unsupportedDetails = '';

  for (const check of claimChecks) {
    if (allTextLower.includes(check.keyword)) {
      const supportedByFacts = businessFacts.some((f: any) =>
        f.fact.toLowerCase().includes(check.factCategory)
      );

      const supportedByRules = (() => {
        switch (check.factCategory) {
          case 'delivery':
            return businessRules?.availability?.deliveryRadiusKm > 0;
          case 'dine-in':
            return true;
          case 'takeaway':
            return true;
          case 'hours':
            return !!businessRules?.factuality?.operatingHoursRespectRequired;
          default:
            return false;
        }
      })();

      if (!supportedByFacts && !supportedByRules) {
        hasUnsupportedClaim = true;
        unsupportedDetails += `${check.keyword} (${check.category}) not supported by Business Brain; `;
      }
    }
  }

  if (hasUnsupportedClaim) {
    return {
      category: 'claim',
      status: 'REVIEW_REQUIRED',
      generatedValue: unsupportedDetails.trim(),
      expectedValue: 'Supported by Business Brain',
      reason: `Unsupported claims detected: ${unsupportedDetails.trim()}`,
    };
  }

  return {
    category: 'claim',
    status: 'PASS',
    reason: 'No unsupported claims detected',
  };
}

/**
 * Phase 30 — salon-only. Verifies generated copy doesn't claim a "package"
 * exists when the business hasn't defined any, and (when the business HAS
 * defined named services/packages) that any specifically-named service or
 * package the copy mentions is one that's actually on file — never a name
 * invented by the model. Returns null (not applicable) for any business
 * with no verticalProfile catalog at all, rather than guessing.
 */
function checkVerticalCatalogClaims(
  allText: string,
  input: GenerationPipelineInput
): TruthCheckItem | null {
  const verticalProfile = (input.businessBrain as any)?.verticalProfile;
  const services: Array<{ name: string }> = verticalProfile?.services || [];
  const packages: Array<{ name: string }> = verticalProfile?.packages || [];

  if (services.length === 0 && packages.length === 0) {
    return null;
  }

  const allTextLower = allText.toLowerCase();

  if (/\bpackage\b/.test(allTextLower) && packages.length === 0) {
    return {
      category: 'claim',
      status: 'REVIEW_REQUIRED',
      generatedValue: 'package mention',
      expectedValue: 'a defined package',
      reason:
        'Generated content mentions a package, but no packages are defined for this business.',
    };
  }

  // A named package the copy claims that isn't in the defined catalog is a
  // more serious, specific invention than a generic "package" mention.
  const definedPackageNames = packages.map((p) => p.name.toLowerCase());
  const mentionedUndefinedPackage =
    packages.length > 0 &&
    /\bpackage\b/.test(allTextLower) &&
    !definedPackageNames.some((name) => allTextLower.includes(name));
  if (mentionedUndefinedPackage) {
    return {
      category: 'claim',
      status: 'REVIEW_REQUIRED',
      generatedValue: 'package mention (name not matched)',
      expectedValue: definedPackageNames.join(', '),
      reason:
        'Generated content mentions a package, but does not name one of the packages actually defined for this business.',
    };
  }

  const definedServiceNames = services.map((s) => s.name.toLowerCase());
  const anyServiceNameMatches =
    services.length === 0 || definedServiceNames.some((name) => allTextLower.includes(name));
  if (!anyServiceNameMatches) {
    return {
      category: 'claim',
      status: 'REVIEW_REQUIRED',
      generatedValue: 'none of the defined services mentioned',
      expectedValue: definedServiceNames.join(', '),
      reason: 'Generated content does not name any of the services defined for this business.',
    };
  }

  return {
    category: 'claim',
    status: 'PASS',
    reason: 'Service/package claims are consistent with the defined catalog.',
  };
}

const REAL_ESTATE_AMENITY_KEYWORDS = [
  'swimming pool',
  'gym',
  'clubhouse',
  'play area',
  'park',
  'security',
  'lift',
  'elevator',
  'power backup',
  'parking',
  'garden',
  'jogging track',
];

/**
 * Phase 31 — real-estate-only. Verifies bedroom/bathroom/area/possession-
 * status/amenity claims in generated copy against the specific property
 * this campaign is about (matched by title against `input.productName`,
 * the same identifier the campaign was generated for). Returns an empty
 * array (not applicable) when the business has no property catalog at all.
 * When the catalog exists but the campaign's listing can't be matched to
 * any entry in it, returns a single REVIEW_REQUIRED item rather than
 * silently passing unverifiable facts — "missing information must not
 * PASS" per the phase brief, not merely "no information available."
 */
function checkPropertyFactClaims(
  allText: string,
  input: GenerationPipelineInput
): TruthCheckItem[] {
  const verticalProfile = (input.businessBrain as any)?.verticalProfile;
  const properties: Array<{
    title: string;
    bedrooms?: number;
    bathrooms?: number;
    areaSqft?: number;
    possessionStatus?: 'ready_to_move' | 'under_construction' | 'upcoming';
    amenities?: string[];
  }> = verticalProfile?.properties || [];

  if (properties.length === 0) {
    return [];
  }

  const productName = (input.productName || '').toLowerCase().trim();
  const titleMatches = (p: { title: string }) =>
    p.title.toLowerCase().includes(productName) || productName.includes(p.title.toLowerCase());
  const property = productName ? properties.find(titleMatches) : undefined;

  if (!property) {
    return [
      {
        category: 'product',
        status: 'REVIEW_REQUIRED',
        generatedValue: input.productName || 'NOT_PROVIDED',
        expectedValue: properties.map((p) => p.title).join(', '),
        reason:
          "This business has a defined property catalog, but the campaign's listing could not be matched to any entry in it — property facts cannot be verified.",
      },
    ];
  }

  const allTextLower = allText.toLowerCase();
  const items: TruthCheckItem[] = [];

  const bedroomMatch = allTextLower.match(/(\d+)\s*(?:bhk|bed(?:room)?s?)/);
  if (bedroomMatch) {
    const claimed = parseInt(bedroomMatch[1]!, 10);
    if (property.bedrooms !== undefined && claimed !== property.bedrooms) {
      items.push({
        category: 'product',
        status: 'FAIL',
        generatedValue: `${claimed} BHK`,
        expectedValue: `${property.bedrooms} BHK`,
        reason: `Generated content claims ${claimed} bedrooms, but this listing has ${property.bedrooms}.`,
      });
    } else if (property.bedrooms === undefined) {
      items.push({
        category: 'product',
        status: 'REVIEW_REQUIRED',
        generatedValue: `${claimed} BHK`,
        expectedValue: 'NOT_PROVIDED',
        reason:
          'Generated content claims a bedroom count that was never recorded for this listing.',
      });
    }
  }

  const bathroomMatch = allTextLower.match(/(\d+)\s*bathrooms?/);
  if (bathroomMatch) {
    const claimed = parseInt(bathroomMatch[1]!, 10);
    if (property.bathrooms !== undefined && claimed !== property.bathrooms) {
      items.push({
        category: 'product',
        status: 'FAIL',
        generatedValue: `${claimed} bathrooms`,
        expectedValue: `${property.bathrooms} bathrooms`,
        reason: `Generated content claims ${claimed} bathrooms, but this listing has ${property.bathrooms}.`,
      });
    }
  }

  const areaMatch = allTextLower.match(/(\d[\d,]*)\s*(?:sq\.?\s?ft|sqft|square\s?feet)/);
  if (areaMatch) {
    const claimed = parseInt(areaMatch[1]!.replace(/,/g, ''), 10);
    if (property.areaSqft !== undefined && claimed !== property.areaSqft) {
      items.push({
        category: 'product',
        status: 'FAIL',
        generatedValue: `${claimed} sqft`,
        expectedValue: `${property.areaSqft} sqft`,
        reason: `Generated content claims ${claimed} sqft, but this listing is ${property.areaSqft} sqft.`,
      });
    } else if (property.areaSqft === undefined) {
      items.push({
        category: 'product',
        status: 'REVIEW_REQUIRED',
        generatedValue: `${claimed} sqft`,
        expectedValue: 'NOT_PROVIDED',
        reason: 'Generated content claims an area that was never recorded for this listing.',
      });
    }
  }

  const claimsReadyToMove = /ready[\s-]?to[\s-]?move/.test(allTextLower);
  const claimsUnderConstruction = /under[\s-]?construction/.test(allTextLower);
  if (
    (claimsReadyToMove && property.possessionStatus !== 'ready_to_move') ||
    (claimsUnderConstruction && property.possessionStatus !== 'under_construction')
  ) {
    items.push({
      category: 'product',
      status: 'FAIL',
      generatedValue: claimsReadyToMove ? 'ready to move' : 'under construction',
      expectedValue: property.possessionStatus || 'NOT_PROVIDED',
      reason: `Generated content states a possession status that contradicts this listing's recorded status (${property.possessionStatus || 'not recorded'}).`,
    });
  }

  const definedAmenities = (property.amenities || []).map((a) => a.toLowerCase());
  const invalidAmenityMentions = REAL_ESTATE_AMENITY_KEYWORDS.filter(
    (kw) =>
      allTextLower.includes(kw) && !definedAmenities.some((a) => a.includes(kw) || kw.includes(a))
  );
  if (invalidAmenityMentions.length > 0) {
    items.push({
      category: 'claim',
      status: 'REVIEW_REQUIRED',
      generatedValue: invalidAmenityMentions.join(', '),
      expectedValue: definedAmenities.join(', ') || 'NOT_PROVIDED',
      reason: `Generated content mentions amenities not recorded for this listing: ${invalidAmenityMentions.join(', ')}.`,
    });
  }

  if (items.length === 0) {
    items.push({
      category: 'product',
      status: 'PASS',
      reason:
        'Property facts (bedrooms/bathrooms/area/possession/amenities) are consistent with the defined listing.',
    });
  }

  return items;
}

function checkOperations(allText: string, previousResults: any): TruthCheckItem {
  const allTextLower = allText.toLowerCase();

  const opsKeywords = [
    'delivery',
    'takeaway',
    'dine-in',
    'dine in',
    'take away',
    'home delivery',
    'online ordering',
  ];
  const opsMentions = opsKeywords.filter((kw) => allTextLower.includes(kw));

  if (opsMentions.length === 0) {
    return {
      category: 'operations',
      status: 'PASS',
      reason: 'No operational claims made in generated content',
    };
  }

  const businessFacts = previousResults?.businessUnderstanding?.businessFacts || [];
  const businessRules = previousResults?.businessUnderstanding?.businessRules || {};

  const supportedOps = businessFacts.filter((f: any) =>
    opsKeywords.some((kw) => f.fact.toLowerCase().includes(kw))
  );

  const deliverySupported = businessRules?.availability?.deliveryRadiusKm > 0;

  const unsupportedOps = opsMentions.filter((op) => {
    if (op === 'delivery' || op === 'home delivery') return !deliverySupported;
    if (op === 'takeaway' || op === 'take away') return false;
    if (op === 'dine-in' || op === 'dine in') return false;
    if (op === 'online ordering') return false;
    return false;
  });

  if (unsupportedOps.length > 0) {
    return {
      category: 'operations',
      status: 'REVIEW_REQUIRED',
      generatedValue: unsupportedOps.join(', '),
      expectedValue: 'Only if in Business Brain',
      reason: 'Operational claims found but not verified in Business Brain',
    };
  }

  return {
    category: 'operations',
    status: 'PASS',
    reason: 'Operational claims supported by Business Brain',
  };
}

function checkContactInfo(allText: string, input: GenerationPipelineInput): TruthCheckItem {
  const checks: TruthCheckItem[] = [];
  const allTextLower = allText.toLowerCase();

  if (input.businessWebsite) {
    const domain = input.businessWebsite.replace(/^https?:\/\//, '').split('/')[0] ?? '';
    const websiteMatch = allTextLower.includes(domain.toLowerCase());
    checks.push({
      category: 'contact',
      status: websiteMatch ? 'PASS' : 'REVIEW_REQUIRED',
      generatedValue: websiteMatch ? input.businessWebsite : 'NOT_FOUND',
      expectedValue: input.businessWebsite,
      reason: websiteMatch ? 'Website mentioned' : 'Website not mentioned in generated content',
    });
  }

  if (input.businessInstagram) {
    const instaMatch = allTextLower.includes(
      input.businessInstagram.toLowerCase().replace('@', '')
    );
    checks.push({
      category: 'contact',
      status: instaMatch ? 'PASS' : 'REVIEW_REQUIRED',
      generatedValue: instaMatch ? input.businessInstagram : 'NOT_FOUND',
      expectedValue: input.businessInstagram,
      reason: instaMatch ? 'Instagram mentioned' : 'Instagram not mentioned in generated content',
    });
  }

  if (checks.length === 0) {
    return {
      category: 'contact',
      status: 'PASS',
      reason: 'No contact info provided to verify',
    };
  }

  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasReview = checks.some((c) => c.status === 'REVIEW_REQUIRED');

  return {
    category: 'contact',
    status: hasFail
      ? 'FAIL'
      : checks.some((c) => c.status === 'REVIEW_REQUIRED')
        ? 'REVIEW_REQUIRED'
        : 'PASS',
    generatedValue: checks.map((c) => c.generatedValue).join('; '),
    expectedValue: checks.map((c) => c.expectedValue).join('; '),
    reason: checks.map((c) => c.reason).join('; '),
  };
}

function checkBusinessHours(allText: string, previousResults: any): TruthCheckItem {
  const allTextLower = allText.toLowerCase();

  const hoursKeywords = ['open', 'close', 'hours', 'timing', 'timings'];
  const hoursMentions = hoursKeywords.filter((kw) => allTextLower.includes(kw));

  if (hoursMentions.length === 0) {
    return {
      category: 'operations',
      status: 'PASS',
      reason: 'No business hours mentioned in generated content',
    };
  }

  const businessFacts = previousResults?.businessUnderstanding?.businessFacts || [];
  const supportedOps = businessFacts.filter((f: any) =>
    hoursKeywords.some((kw) => f.fact.toLowerCase().includes(kw))
  );

  if (supportedOps.length === 0) {
    return {
      category: 'operations',
      status: 'REVIEW_REQUIRED',
      generatedValue: hoursMentions.join(', '),
      expectedValue: 'Only if in Business Brain',
      reason: 'Hours mentioned but not verified in Business Brain',
    };
  }

  return {
    category: 'operations',
    status: 'PASS',
    reason: 'Business hours claims supported by Business Brain',
  };
}

function checkMinimumOrder(allText: string, previousResults: any): TruthCheckItem {
  const allTextLower = allText.toLowerCase();

  const minOrderKeywords = ['minimum order', 'min order', 'minimum value', 'min value'];
  const minOrderMentions = minOrderKeywords.filter((kw) => allTextLower.includes(kw));

  if (minOrderMentions.length === 0) {
    return {
      category: 'operations',
      status: 'PASS',
      reason: 'No minimum order claims in generated content',
    };
  }

  const businessRules = previousResults?.businessUnderstanding?.businessRules || {};
  const minOrderRequired = businessRules?.availability?.minimumOrderRequired;
  const minOrderAmount = businessRules?.availability?.minimumOrder;

  if (!minOrderRequired || !minOrderAmount) {
    return {
      category: 'operations',
      status: 'REVIEW_REQUIRED',
      generatedValue: minOrderMentions.join(', '),
      expectedValue: 'Only if defined in Business Brain',
      reason: 'Minimum order mentioned but not defined in Business Brain',
    };
  }

  return {
    category: 'operations',
    status: 'PASS',
    reason: 'Minimum order claims supported by Business Brain',
  };
}

function checkDeliveryRadius(allText: string, previousResults: any): TruthCheckItem {
  const allTextLower = allText.toLowerCase();

  const radiusKeywords = [
    'radius',
    'km',
    'kilometer',
    'distance',
    'delivery area',
    'delivery zone',
  ];
  const radiusMentions = radiusKeywords.filter((kw) => allTextLower.includes(kw));

  if (radiusMentions.length === 0) {
    return {
      category: 'operations',
      status: 'PASS',
      reason: 'No delivery radius claims in generated content',
    };
  }

  const businessFacts = previousResults?.businessUnderstanding?.businessFacts || [];
  const supportedOps = businessFacts.filter((f: any) =>
    radiusKeywords.some((kw) => f.fact.toLowerCase().includes(kw))
  );

  if (supportedOps.length === 0) {
    return {
      category: 'operations',
      status: 'REVIEW_REQUIRED',
      generatedValue: radiusMentions.join(', '),
      expectedValue: 'Only if in Business Brain',
      reason: 'Delivery radius claims found but not verified in Business Brain',
    };
  }

  return {
    category: 'operations',
    status: 'PASS',
    reason: 'Delivery radius claims supported by Business Brain',
  };
}

// ============ Source Staleness Detection (Phase 6) ============
//
// No source-version/fingerprint tracking existed anywhere in the codebase
// before this. A campaign's Truth Check result is only ever as trustworthy
// as the source facts it was checked against at that moment — if the
// business's phone/WhatsApp/location or the verified product's price
// changes afterward, a stored PASS must not go on being presented as a
// fresh, currently-accurate verification. This is the smallest mechanism
// that detects that without redesigning how campaigns/businesses are
// stored: a deterministic fingerprint of the facts actually used by
// runDeterministicTruthCheck, stored on the result, recomputed and compared
// against the CURRENT Business/Product data on demand.

export interface SourceFactsForFingerprint {
  businessPhone: string;
  businessWhatsApp: string;
  businessLocationText: string;
  productPrice?: number;
}

/**
 * Deterministic (not cryptographic — collision resistance isn't the goal,
 * detecting drift is) fingerprint of the source facts Truth Check actually
 * compared against. Same inputs always produce the same output; any change
 * to phone/WhatsApp/location/price produces a different one.
 */
// djb2 — simple, deterministic, dependency-free. Shared by both fingerprint
// functions below so they produce the same kind of opaque hex string, but
// they are two SEPARATE fingerprints (see computeVerticalFactsFingerprint's
// own comment for why they are never merged into one hash).
function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function computeSourceFingerprint(facts: SourceFactsForFingerprint): string {
  const key = JSON.stringify({
    phone: normalizePhone(facts.businessPhone),
    whatsapp: normalizePhone(facts.businessWhatsApp),
    location: normalizeLocation(facts.businessLocationText),
    price: facts.productPrice ?? null,
  });
  return djb2Hash(key);
}

/**
 * Phase 33 — a SEPARATE fingerprint covering the additional facts Truth
 * Check began verifying in Phases 30/31 (checkDeliveryRadius/
 * checkMinimumOrder against businessRules; checkVerticalCatalogClaims/
 * checkPropertyFactClaims against verticalProfile's services/packages/
 * properties) once Business Brain editing (Phase 33) made those fields
 * editable after generation. Deliberately NOT merged into
 * computeSourceFingerprint's hash: that would change what that function
 * outputs for every fact combination it already covers, which would make
 * every pre-Phase-33 campaign's STORED fingerprint (computed under the old,
 * narrower shape) mismatch a freshly recomputed one purely because the
 * input shape changed — spuriously flagging campaigns as stale for a
 * reason that has nothing to do with their actual facts changing. Keeping
 * this as an independent, optional second fingerprint means an old
 * campaign with no stored vertical fingerprint is simply not checked on
 * this dimension (see isVerificationStale below), exactly as a campaign
 * with no fingerprint at all was always "not stale" on the original one.
 *
 * `verticalProfileSnapshot` is the caller's responsibility to serialize
 * deterministically (e.g. JSON.stringify of the business's verticalProfile)
 * — this function does not reach into Firestore itself.
 */
export interface VerticalFactsForFingerprint {
  deliveryRadiusKm?: number;
  minimumOrder?: number;
  verticalProfileSnapshot?: string;
}

export function computeVerticalFactsFingerprint(facts: VerticalFactsForFingerprint): string {
  const key = JSON.stringify({
    deliveryRadiusKm: facts.deliveryRadiusKm ?? null,
    minimumOrder: facts.minimumOrder ?? null,
    verticalProfile: facts.verticalProfileSnapshot ?? null,
  });
  return djb2Hash(key);
}

/**
 * True when the source facts have changed since the fingerprint was
 * recorded. A campaign with no stored fingerprint predates this mechanism —
 * there is nothing to compare against, so it is reported as not-stale
 * (unknown) rather than fabricating a positive or negative signal for data
 * this function was never given the means to check. This does not weaken
 * the original Truth Check result itself, which remains whatever it was.
 */
/**
 * The single gate that decides whether a (re)generated asset is allowed to
 * become the active version. Extracted as its own pure function so the
 * exact rule regenerateAsset.ts activates a new version with is directly
 * unit-testable, rather than only testable by exercising the whole Cloud
 * Function. REVIEW_REQUIRED is intentionally treated the same as FAIL here:
 * this endpoint has no human-review step, so nothing short of an explicit
 * PASS may replace a valid active asset (fail closed).
 */
export function shouldActivateRegeneration(truthCheckStatus: TruthCheckStatus): boolean {
  return truthCheckStatus === 'PASS';
}

export function isVerificationStale(
  storedFingerprint: string | undefined,
  currentFacts: SourceFactsForFingerprint,
  storedVerticalFingerprint?: string,
  currentVerticalFacts?: VerticalFactsForFingerprint
): boolean {
  const coreStale =
    !!storedFingerprint && computeSourceFingerprint(currentFacts) !== storedFingerprint;
  // Only checked when the campaign actually HAS a stored vertical
  // fingerprint (i.e. it was generated after Phase 33) — a campaign that
  // predates this dimension is not retroactively judged against it, the
  // same backward-compatibility rule the original check already used.
  const verticalStale =
    !!storedVerticalFingerprint &&
    !!currentVerticalFacts &&
    computeVerticalFactsFingerprint(currentVerticalFacts) !== storedVerticalFingerprint;
  return coreStale || verticalStale;
}
