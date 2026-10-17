/**
 * Guards the customer-facing legal wording (Terms, Privacy, Refund, Cancellation) against the
 * regressions the D1-D6 decisions ruled out. Text is normalised, so line wrapping is irrelevant.
 */
import React from 'react';
import { render } from '@testing-library/react';

import TermsPage from './terms/page';
import PrivacyPage from './privacy/page';
import RefundPage from './refund/page';
import CancellationPage from './cancellation/page';

const text = (el: React.ReactElement) =>
  (render(el).container.textContent ?? '').replace(/\s+/g, ' ');

describe('legal pages', () => {
  const terms = text(<TermsPage />);
  const privacy = text(<PrivacyPage />);
  const refund = text(<RefundPage />);
  const cancellation = text(<CancellationPage />);
  const all = [terms, privacy, refund, cancellation];

  it('states the supplied business identity exactly and invents no registration numbers', () => {
    expect(terms).toContain('Brainwise Solutions');
    expect(terms).toContain('sole proprietorship');
    expect(terms).toContain('Aliabad Jhanda, Charminar, Hyderabad, Telangana – 500053, India');
    expect(terms).toContain('Mitra by BrainWise');
    expect(terms).toContain('laws of India');
    expect(terms).toMatch(/courts\s+having jurisdiction in Hyderabad, Telangana, India/);
    expect(terms).not.toMatch(/exclusive jurisdiction/i);
    for (const t of all) {
      // GST status is unresolved: no page may assert it either way until the owner confirms it.
      expect(t).not.toMatch(
        /(not\s+)?registered\s+(under|for|with)\s+(the\s+)?GST|GST[- ]registered|GST\s+not\s+applicable/i
      );
      expect(t).not.toMatch(/GSTIN\s*[:\-]?\s*[0-9A-Z]{15}/);
      expect(t).not.toMatch(/\b(CIN|LLPIN)\b\s*[:\-]?\s*[A-Z0-9]{8,}/);
    }
  });

  it('has no unresolved "founder decision required" placeholders in Terms/Refund/Cancellation', () => {
    for (const t of [terms, refund, cancellation]) {
      expect(t).not.toMatch(/founder decision required/i);
    }
  });

  it('describes Cashfree prepaid checkout without obsolete provider or recurring-billing claims', () => {
    for (const t of all) {
      expect(t).not.toMatch(/renews automatically until you cancel|Merchant of Record/i);
    }
    expect(terms).toMatch(/hosted checkout of Cashfree Payments, our payment gateway/i);
    expect(terms).toMatch(
      /prepaid for a fixed term of 30 days \(monthly\) or 365 days \(yearly\)/i
    );
    expect(terms).toMatch(/Plans do not renew automatically/i);
    expect(terms).not.toMatch(/cancel your subscription|Merchant of Record/i);
    expect(privacy).toMatch(/Cashfree Payments/i);
    expect(privacy).not.toMatch(/Merchant of Record/i);
    expect(privacy).toMatch(/subprocessor DPA status: not verified/);
    expect(privacy).toMatch(/Re-acceptance: users may be required to acknowledge or consent/);
    expect(privacy).not.toMatch(/founder decision required/i);
    expect(refund).toMatch(/Payments are processed through Cashfree Payments/i);
    expect(cancellation).toMatch(/Nothing renews by itself/i);
  });

  it('publishes no retention number of years/months and uses the generic D5 wording', () => {
    for (const t of all) {
      expect(t).not.toMatch(/\b(6|7|8|six|seven|eight)\s*(years?|yrs?)\b|\b72\s*months?\b/i);
    }
    const d5 =
      'Billing, transaction, accounting, tax, and related business records may be retained for as long as required by applicable law and legitimate accounting/business purposes';
    expect(terms).toContain(d5);
    expect(privacy).toContain(d5);
  });

  it('states the published refund policy for prepaid plan terms and credit packs', () => {
    expect(refund).toMatch(/First-time paid plan purchase: refundable within 7 days/);
    expect(refund).toMatch(/credits associated with that purchase have not been used/);
    expect(refund).toMatch(
      /Credit packs: refundable within 7 days .* none of the purchased credits/
    );
    expect(refund).toMatch(/Other purchases: refund requests are reviewed individually/);
    expect(refund).toMatch(/billing errors, duplicate charges/);
    expect(refund).toMatch(/reviewed manually/);
    expect(refund).toMatch(/Applicable law takes precedence/i);
  });

  it('states the D6 renewal/cancellation policy and makes no forbidden promises', () => {
    expect(terms).toMatch(/do not renew automatically/i);
    expect(terms).toMatch(/term ending does not by itself trigger a refund or credit reversal/i);
    expect(terms).toMatch(
      /A different plan or term can be purchased after your current access ends/i
    );
    expect(cancellation).toMatch(/At the end of that term, your account moves to the Free plan/i);
    for (const t of all) {
      expect(t).not.toMatch(
        /upgrade anytime|change plans? anytime|one[- ]click|GST invoices|free trial (?!\.)|credits? (will )?roll over(?! into)/i
      );
      expect(t).not.toMatch(/automatic(ally)? (refund|reverse)[^.]*credits? (are|is|will be)/i);
    }
    expect(terms).toMatch(/do not roll over/);
  });
});
