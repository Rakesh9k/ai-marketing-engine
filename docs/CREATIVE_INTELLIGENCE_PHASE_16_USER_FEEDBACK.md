# PHASE 16 — User Feedback for Creative Intelligence

## Objective
Connect Mitra's Creative Intelligence system to longitudinal creative feedback without immediately mutating core structures. Users can provide lightweight feedback on generated creatives (POST and REEL) which acts as a signal-collection layer, informing future understanding of creative preferences.

## Architecture

```text
Generated Creative (POST/REEL)
       ↓
Creative Feedback UI (👍 / 👎)
       ↓
(If 👎) Structured Feedback Reasons (more_premium, less_text, etc.) + Optional Custom Reason
       ↓
submitCreativeFeedback (Firebase Callable Function)
       ↓
CreativeFeedback Document (Firestore: creative_feedback)
```

## Data Model

`CreativeFeedback` interface securely attaches feedback to a specific creative, storing:
- `feedbackId`
- `creativeId`
- `campaignId`
- `userId`
- `businessId`
- Snapshot context: `templateId`, `templateVersion`, `styleId`, `styleVersion`
- `creativeType` (post | reel)
- `sentiment` (positive | negative)
- `reasons` (array of `CreativeFeedbackReason`)
- `customReason`
- `createdAt`
- `updatedAt`

## Key Principles & Constraints

1. **No Autonomous Mutation**: Feedback does **NOT** automatically mutate the `BusinessBrain` or `SavedStyle`. A single rejection should not drastically alter a user's creative profile.
2. **Signal Collection**: This acts purely as a longitudinal signal-collection layer for future creative intelligence.
3. **Tenant Safety & Idempotency**: Strict tenant authorization is enforced via `verifyBusinessAccess` in the backend. Feedback is only allowed for businesses the user owns.
4. **Non-blocking UI**: The UI provides a lightweight, optional feedback mechanism on the results page (Campaign/Reel) without blocking asset delivery, downloading, or WhatsApp sharing.
5. **Unified Domain Model**: Both POST and REEL pipelines are supported by the identical `CreativeFeedback` structure and submission endpoint.

## Components

- **Frontend**:
  - `CreativeFeedbackControls` component for handling user interactions and reason selection.
  - Integration into `CampaignDetailContent` (POST) and `ReelPreview` (REEL).
- **Backend**:
  - `submitCreativeFeedback.ts`: Validated callable function using strict Zod schema validation.
  - Firestore service mapping: `createCreativeFeedbackDoc` for saving to the `creative_feedback` collection.
