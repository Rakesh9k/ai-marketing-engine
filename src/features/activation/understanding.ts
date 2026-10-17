/**
 * The plain-language summary shown before the owner presses Generate ("What Mitra understood"). It is built only
 * from what the owner entered or what is saved in Business Brain, so it can be checked and corrected for free.
 */
export function describeUnderstanding(input: {
  businessName: string;
  offerHeadline?: string;
  localities?: string[];
  languageLabel?: string;
  ctaLabel?: string;
}): string {
  const promote = input.offerHeadline?.trim() || 'your offer';
  const where =
    input.localities && input.localities.length > 0
      ? `, for people in ${input.localities.join(', ')}`
      : '';
  const language = input.languageLabel ? `, written in ${input.languageLabel}` : '';
  const action = input.ctaLabel ? `, with the action “${input.ctaLabel}”` : '';
  return `You want to promote “${promote}” for ${input.businessName}${where}${language}${action}. If anything is wrong, press Back and change it.`;
}
