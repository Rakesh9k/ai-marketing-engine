import type {
  TruthCheckResult,
  TruthCheckItem,
  ExtractedFacts,
  ExtractedPrice,
  TruthCheckStatus,
  GenerationPipelineInput,
} from '../../types';

/**
 * Normalize price strings to a standard format for comparison
 */
export function normalizePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  
  const cleaned = priceStr
    .replace(/[₹Rs\.INR]/gi, '')
    .replace(/[,\s]/g, '')
    .replace(/rupees?/gi, '')
    .trim();
  
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  
  return parseFloat(match[1]);
}

/**
 * Normalize location strings for comparison
 */
export function normalizeLocation(locStr: string | undefined): string {
  if (!locStr) return '';
  
  return locStr
    .toLowerCase()
    .replace(/[-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize phone/WhatsApp numbers for comparison
 */
export function normalizePhone(phoneStr: string | undefined): string {
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
export function normalizeDiscount(discountStr: string | undefined): number | null {
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
  
  return parseFloat(match[1]);
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
    const amount = parseFloat(match[1].replace(/,/g, ''));
    
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
    const amount = parseFloat(contextMatch[1].replace(/,/g, ''));
    
    if (!prices.some(p => p.rawText === contextMatch[0].trim())) {
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
    const value = parseFloat(match[1]);
    if (value > 0 && value <= 100) {
      discounts.push(value);
    }
  }
  
  const percentRegex = /(\d{1,3}(?:\.\d+)?)\s*percent/gi;
  let percentMatch: RegExpExecArray | null;
  
  while ((percentMatch = percentRegex.exec(text)) !== null) {
    const value = parseFloat(percentMatch[1]);
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
    'kondapur', 'gachibowli', 'hitech city', 'madhapur', 'jubilee hills',
    'banjara hills', 'somajiguda', 'punjagutta', 'ameerpet', 'kukatpally',
    'miyapur', 'manikonda', 'nallagandla', 'tellapur', 'chandanagar',
    'hyderabad', 'secunderabad', 'telangana'
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
  
  return [...new Set(phones.map(p => p.replace(/\D/g, '')))];
}

/**
 * Extract WhatsApp numbers from text
 */
export function extractWhatsAppNumbers(text: string): string[] {
  const waLinkRegex = /wa\.me\/91(\d{10})/gi;
  const waMatches = text.match(waLinkRegex);
  
  if (waMatches) {
    return [...new Set(waMatches.map(m => m.replace(/.*91/, '')))];
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
    'delivery', 'takeaway', 'dine-in', 'dine in', 'take away',
    'home delivery', 'online ordering', 'booking', 'reservation',
    'open', 'close', 'hours', 'timing', 'timings'
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
    'best in', 'best restaurant', 'best food',
    'number 1', '#1', 'no. 1', 'number 1',
    'top rated', 'highest rated', 'most popular',
    'famous', 'renowned', 'legendary', 'iconic',
    'guaranteed', 'guarantee', 'risk-free', 'risk free',
    '100%', 'hundred percent',
    'doctor recommended', 'clinically proven', 'expert recommended',
    'award winning', 'award-winning', 'awarded',
    'certified', 'verified', 'trusted',
    'free delivery', 'free home delivery',
    'open 24/7', 'open 24x7', '24/7', '24x7',
    'round the clock', 'always open',
    'unlimited', 'unlimited refills',
    '1000+ customers', '1000+ reviews',
    'rated 5 star', '5 star rating', '5/5',
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
    discounts: extractDiscounts(JSON.stringify(copyPack)).map(d => `${d}%`),
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
export function normalizeFactValue(value: string, type: 'price' | 'location' | 'phone' | 'discount' | 'text'): string {
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

function normalizePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  
  const cleaned = priceStr
    .replace(/[₹Rs\.INR]/gi, '')
    .replace(/[,\s]/g, '')
    .replace(/rupees?/gi, '')
    .trim();
  
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  
  return parseFloat(match[1]);
}

function normalizeLocation(locStr: string | undefined): string {
  if (!locStr) return '';
  
  return locStr
    .toLowerCase()
    .replace(/[-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phoneStr: string | undefined): string {
  if (!phoneStr) return '';
  
  const digits = phoneStr.replace(/\D/g, '');
  
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  
  return digits;
}

function normalizeDiscount(discountStr: string | undefined): number | null {
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
  
  return parseFloat(match[1]);
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
  const expectedLocation = input.businessLocation?.locality || input.businessLocation?.city ?? '';
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
  const promoPriceCheck = checkPromotionalPrice(allText, expectedOfferPrice, input.offerOriginalPrice);
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
  const offerCheck = checkOffer(allText, input.offerType ?? '', expectedOfferPrice, input.offerOriginalPrice, input.offerHeadline);
  checks.push(offerCheck);
  if (offerCheck.status === 'FAIL') overallStatus = 'FAIL';
  else if (offerCheck.status === 'REVIEW_REQUIRED' && overallStatus === 'PASS') {
    overallStatus = 'REVIEW_REQUIRED';
  }

  // 9. Offer Validity Check
  const validityCheck = checkOfferValidity(allText, input.offerValidityStart, input.offerValidityEnd);
  checks.push(validityCheck);
  if (validityCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 10. Claims Check - Prohibited Claims
  const claimsCheck = checkProhibitedClaims(allText);
  checks.push(claimsCheck);
  if (claimsCheck.status === 'FAIL') overallStatus = 'FAIL';

  // 11. Unsupported Claims Check
  const unsupportedClaimsCheck = checkUnsupportedClaims(allText, previousResults);
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
  const priceMentions = allText.match(/₹\s*\d+/g) || [];
  const priceMatch = priceMentions.some((p) => p.replace(/\s/g, '') === expectedPriceStr.replace(/\s/g, ''));

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

function checkPromotionalPrice(allText: string, offerPrice: number, originalPrice?: number): TruthCheckItem | null {
  if (!originalPrice || originalPrice <= offerPrice) {
    return null;
  }

  const expectedPriceStr = `₹${offerPrice}`;
  const priceMentions = allText.match(/₹\s*\d+/g) || [];
  const priceMatch = priceMentions.some((p) => p.replace(/\s/g, '') === `₹${offerPrice}`.replace(/\s/g, ''));

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

  const normalizedExpected = expectedLocation.toLowerCase()
    .replace(/[-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const normalizedAllText = allText
    .replace(/[-,]/g, ' ')
    .replace(/\s+/g, ' ');

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

function checkOffer(allText: string, offerType: string, offerPrice: number, originalPrice?: number, offerHeadline?: string): TruthCheckItem {
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

  const discountPercent = offerType === 'percentage' && originalPrice 
    ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
    : null;

  let passed = false;
  let reason = '';

  if (discountPercent) {
    const discountText = `${discountPercent}%`;
    const discountMatch = allText.includes(discountText) || allTextLower.includes(`${discountPercent} percent`);
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
    status: passed ? 'PASS' : 'REVIEW_REQUIRED',
    expectedValue: expectedOfferText || offerHeadline,
    reason,
  };
}

function checkOfferValidity(allText: string, validityStart?: string, validityEnd?: string): TruthCheckItem {
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
    'best in', 'best restaurant', 'best food',
    'number 1', '#1', 'no. 1', 'number 1',
    'top rated', 'highest rated', 'most popular',
    'famous', 'renowned', 'legendary', 'iconic',
    'guaranteed', 'guarantee', 'risk-free', 'risk free',
    '100%', 'hundred percent',
    'doctor recommended', 'clinically proven', 'expert recommended',
    'award winning', 'award-winning', 'awarded',
    'certified', 'verified', 'trusted',
    'free delivery', 'free home delivery',
    'open 24/7', 'open 24x7', '24/7', '24x7',
    'round the clock', 'always open',
    'unlimited', 'unlimited refills',
    '1000+ customers', '1000+ reviews',
    'rated 5 star', '5 star rating', '5/5',
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

function checkUnsupportedClaims(allText: string, previousResults: any): TruthCheckItem {
  const allTextLower = allText.toLowerCase();
  
  const claimChecks = [
    { keyword: 'free delivery', category: 'delivery', factCategory: 'delivery' },
    { keyword: 'free home delivery', category: 'delivery', factCategory: 'delivery' },
    { keyword: 'delivery available', category: 'delivery', factCategory: 'delivery' },
    { keyword: 'home delivery', category: 'delivery', factCategory: 'delivery' },
    { keyword: 'dine in', category: 'dine-in', factCategory: 'dine-in' },
    { keyword: 'dine-in', category: 'dine-in', factCategory: 'dine-in' },
    { keyword: 'takeaway', category: 'takeaway', factCategory: 'takeaway' },
    { keyword: 'take away', category: 'takeaway', factCategory: 'takeaway' },
    { keyword: 'open 24', category: 'hours', factCategory: 'hours' },
    { keyword: '24/7', category: 'hours', factCategory: 'hours' },
    { keyword: '24x7', category: 'hours', factCategory: 'hours' },
    { keyword: 'always open', category: 'hours', factCategory: 'hours' },
    { keyword: 'parking', category: 'parking', factCategory: 'parking' },
    { keyword: 'parking available', category: 'parking', factCategory: 'parking' },
    { keyword: 'valet', category: 'parking', factCategory: 'parking' },
    { keyword: 'wifi', category: 'wifi', factCategory: 'wifi' },
    { keyword: 'free wifi', category: 'wifi', factCategory: 'wifi' },
    { keyword: 'ac', category: 'ac', factCategory: 'ac' },
    { keyword: 'air conditioned', category: 'ac', factCategory: 'ac' },
    { keyword: 'outdoor seating', category: 'seating', factCategory: 'seating' },
    { keyword: 'indoor seating', category: 'seating', factCategory: 'seating' },
    { keyword: 'private dining', category: 'private', factCategory: 'private' },
    { keyword: 'catering', category: 'catering', factCategory: 'catering' },
    { keyword: 'party', category: 'events', factCategory: 'events' },
    { keyword: 'event', category: 'events', factCategory: 'events' },
  ];

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

function checkOperations(allText: string, previousResults: any): TruthCheckItem {
  const allTextLower = allText.toLowerCase();
  
  const opsKeywords = ['delivery', 'takeaway', 'dine-in', 'dine in', 'take away', 'home delivery', 'online ordering'];
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
    const domain = input.businessWebsite.replace(/^https?:\/\//, '').split('/')[0];
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
    const instaMatch = allTextLower.includes(input.businessInstagram.toLowerCase().replace('@', ''));
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

  const hasFail = checks.some(c => c.status === 'FAIL');
  const hasReview = checks.some(c => c.status === 'REVIEW_REQUIRED');

  return {
    category: 'contact',
    status: hasFail ? 'FAIL' : checks.some(c => c.status === 'REVIEW_REQUIRED') ? 'REVIEW_REQUIRED' : 'PASS',
    generatedValue: checks.map(c => c.generatedValue).join('; '),
    expectedValue: checks.map(c => c.expectedValue).join('; '),
    reason: checks.map(c => c.reason).join('; '),
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
  
  const radiusKeywords = ['radius', 'km', 'kilometer', 'distance', 'delivery area', 'delivery zone'];
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