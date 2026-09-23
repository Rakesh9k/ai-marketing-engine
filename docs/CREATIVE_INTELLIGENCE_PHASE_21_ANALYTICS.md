# Creative Intelligence Phase 21: Analytics

## Objective
Establish a structured, privacy-conscious analytics event layer for Creative Intelligence. These instrumentation boundaries make key interactions observable so Mitra can eventually connect template usage, generation, user feedback, and downstream outcomes into a longitudinal performance layer without conflating "template preferred" with "template generated revenue."

## Event Taxonomy
We have expanded the `ANALYTICS_EVENTS` registry and added a canonical `trackCreativeEvent` interface encompassing 7 core events:

1. `creative_template_viewed`: Fired client-side when the wizard displays a template in the list.
2. `creative_template_selected`: Fired client-side when a user clicks a template choice or recommendation.
3. `creative_generated`: Fired server-side upon successful AI generation and persistence of the asset (POST and REEL).
4. `creative_approved`: Fired server-side alongside writing `CreativeFeedback` when `sentiment = positive`.
5. `creative_rejected`: Fired server-side alongside writing `CreativeFeedback` when `sentiment = negative`.
6. `creative_regenerated`: Fired server-side when an asset goes through the `regenerateAsset` flow.
7. `creative_style_saved`: Fired server-side when a new `SavedStyle` profile is generated and persisted.

## Event Schema
The base event schema matches the existing Firestore canonical log layout (`analytics_events/{eventId}`), extending it natively at the document root to ensure direct queryability:

```typescript
export type CreativeAnalyticsEventType = 
  | 'creative_template_viewed'
  | 'creative_template_selected'
  | 'creative_generated'
  | 'creative_approved'
  | 'creative_rejected'
  | 'creative_regenerated'
  | 'creative_style_saved';

export interface CreativeEventPayload {
  eventType: CreativeAnalyticsEventType;
  userId: string;
  businessId: string;
  creativeId?: string;       // Lineage link to asset ID
  campaignId?: string;       // Lineage link to campaign
  templateId?: string;       // Lineage link to template
  templateVersion?: number;  // Template lineage tracking
  styleId?: string;          // Extracted style identifier
  styleVersion?: number;     // Style lineage tracking
  creativeType?: 'post' | 'reel';
  objective?: string;        // E.g. awareness, conversion
  metadata?: Record<string, unknown>; // Safe JSON context
}
```

## Security & Tenant Isolation
1. **Server-Side Authoritative Tracking**: Critical signals (`generated`, `approved`, `regenerated`) are fired strictly from backend Cloud Functions running trusted execution contexts. The client cannot spoof an AI generation or arbitrarily spoof a user's approval.
2. **Client-Side Boundaries**: `creative_template_viewed` and `creative_template_selected` originate from the browser. They pass through a newly defined `trackCreativeEventEndpoint` Cloud Function which strictly executes `verifyBusinessAccess(context.userId, data.businessId)` before allowing persistence. This enforces that Business A cannot log events on behalf of Business B.
3. **No PII**: Raw Business Brain details, Prompts, AI text responses, and user credentials are *never* logged into `analytics_events`.

## Idempotency & Duplicate Semantics
- `creative_template_viewed`: Non-idempotent by design. If a user scrolls or opens the page multiple times, multiple views are expected.
- `creative_template_selected`: Non-idempotent by design. Users may click between templates.
- `creative_generated`: Guaranteed exactly once per successful API transaction.

## Failure Isolation
All Analytics tracking functions—both on the client and within backend generation logic—are fire-and-forget or non-blocking in their primary operation loops:
- `trackCreativeEvent` catches its own Firestore errors internally.
- Client-side clicks (e.g. template selection) will not lock the React UI if the `trackCreativeEventEndpoint` endpoint timeouts.

## Future Performance Intelligence
Phase 21 introduces strong identifiers. The presence of `templateId` and `creativeId` allows future systems to query: `analytics_events (type: whatsapp_clicked)` → matching `campaignId/creativeId` → matching `creative_generated` → revealing `templateId`. This avoids polluting the Business Brain today while preparing the data architecture for Phase 22+ Outcome modeling.
