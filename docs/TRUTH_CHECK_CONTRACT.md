# Offer contract: copy prompt ⇄ Truth Check

**Single source:** `functions/src/services/ai/offerContract.ts`. The copy prompt builds its rules from it
(`buildOfferContractPrompt`) and Truth Check verifies with the same helpers. Neither may demand a fact the other does
not state.

## Why it existed

A benchmark of the real pipeline failed Truth Check on 23 of 24 runs whichever model wrote the copy. The cause was the
contract, not the models:

| Truth Check required | The prompt said |
|---|---|
| the literal `NN%` for a percentage offer | offer *type* and price only; never the original price or the discount |
| a numeric date in the copy | `duration` was passed as data; no instruction to state dates |
| `₹N` / `Rs N` / `INR N` (number after the sign) | "use ₹N" once; models often wrote `999 INR` |
| no phrase from a 50-phrase list | no list shown |
| the owner's exact headline for any non-percentage, non-fixed offer | the headline was context, not a requirement |

and one defect underneath: `generateCampaignStrategy` never passed the owner's **original price** to the pipeline
(`regenerateAsset` did), so for a real campaign neither the generator nor Truth Check could know a discount existed.

## The rules now

A statement is **required only if the campaign has the fact**. Nothing is asked for, or invented, to satisfy a check.

| Campaign has | Copy is told | Truth Check verifies |
|---|---|---|
| an offer price | write `₹N`, rupee sign first | the same amount, exact, in any normal spelling (`₹N`, `Rs. N`, `N INR`, `N/-`, `N rupees`, commas); a bare number is never a price |
| percentage offer **and** an original price above the price | the real discount, derived: `"P% off"`, `was ₹X` | `P%` stated (FAIL if absent); any other percentage is flagged |
| percentage offer, **no** original price | no percentage, no "was" price | REVIEW_REQUIRED, basis `missing_input` (the campaign lacks the fact); never a FAIL, never a demanded headline |
| fixed price with an original price | may show `was ₹X`; no percentage | price present; a percentage is flagged |
| bogo / combo / free delivery / loyalty | say so plainly | the concept's words, or the owner's headline |
| a validity window | the dates, pre-formatted (`10 Oct 2026`, India time), once in the caption, no other date | some date stated and every date inside the window; a date **outside** it is an invalid claim (FAIL) |
| no validity window | do not mention any date | nothing (PASS, `not_applicable`) |
| anything | never write the prohibited phrases (shown to the model) | the same list. A free-delivery offer is exempt for "free delivery"; vertical-only phrases (`best restaurant`, `best property`) are shown only to that vertical but rejected for all |

### Operations claims (checked as claims, not as words)

| Business has | Copy is told | Truth Check verifies |
|---|---|---|
| real opening hours | nothing | hours claims pass |
| no opening hours | do not state opening/closing times, days open, "open late/till/daily" | a *claim* about when the business is open: a clock time, "open daily/late/till …", "business hours", "timings", "24/7". The words "open" and "close" alone are not a claim ("open house", "close to the metro", "opening soon" pass). Before, any occurrence of "open", "close", "hours" or "timing" was REVIEW_REQUIRED, so an open-house campaign could never PASS |
| a delivery radius **or** an owner-stated delivery mode (a cloud kitchen) | nothing | "we deliver" is supported. A distance claim ("within 5 km") still needs a radius on file |

## Missing vs invalid

`TruthCheckItem.basis` says why something did not simply pass:

- `missing_input`: the campaign lacks the fact needed to verify;
- `required_mention_missing`: the copy was asked to state something and did not;
- `invalid_claim`: the copy states something wrong;
- `not_applicable`: nothing to verify for this campaign.

Fail-closed is unchanged: only an explicit PASS activates a regenerated asset, FAIL still discards a campaign, and
REVIEW_REQUIRED still escalates the overall status exactly where it did before (the validity check, as before, escalates
only on FAIL).

## Not changed (and why)

- No check was removed or loosened to be easier to pass. The equivalent spellings are the *same* verified amount.
- Wrong phone/WhatsApp numbers still produce REVIEW_REQUIRED, not FAIL (existing behaviour); see the open findings.

## Also aligned (second round)

- **Contact numbers.** Any number the copy presents *as the business contact* (after "WhatsApp", "call", "phone"…, or in a
  wa.me / tel: link) must be one the business has, from the input and the Business Brain. A different number is an invalid
  claim: FAIL. A business with no number on file cannot present one. A number with no contact cue is ignored, and nothing is
  demanded: leaving the number out is still the existing REVIEW (the prompt asks for it). The prompt names the only number
  allowed, or says none is on file. The presence check also recognises "98765 43210" and "+91 98765-43210".
- **Salon** (services/ai/verticalContract.ts): the copy is told the owner's known services and packages (defined services,
  signature offerings, the campaign's own product) and to name no other; with none on file it must not name a specific
  treatment. Truth Check flags a named treatment (keratin, facial, bridal makeup…) that is not among them (REVIEW).
- **Real estate**: the copy is given the listing's recorded facts only (bedrooms, bathrooms, area, possession status,
  amenities), told what is not recorded, and "never state a possession date". Truth Check verifies the same facts, and flags a
  possession *date* (no record holds one).
- **Calendar-created campaigns** no longer invent a price: an item with no product (or a product with no price) is refused
  before any credits are reserved, with a message to choose a product when creating the plan. (Real price-less generation
  would run through the offer schema, the compositor and Truth Check, and is a separate decision.)
- **Wizard discount badge / was-price** for an owner-supplied original price is kept; the original price now reaches
  generation as it already did regeneration.

## Still open

- Calendar items have no way to attach a product after the plan is created (updateCalendarItem has no product field).
- createBusiness stores deliveryRadiusKm 5 and minimumOrder 0 when the owner gave none (see LOCALIZATION_CONTRACT.md).
