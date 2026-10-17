import { BUSINESS_IDENTITY as B } from '@/lib/config/businessIdentity';

/** Server-renderable, selectable-text business identity block for public pages. */
export function BusinessIdentity({ className = '' }: { className?: string }) {
  return (
    <section aria-labelledby="business-identity-heading" className={className}>
      <h2 id="business-identity-heading" className="text-text-primary text-sm font-bold">
        Business information
      </h2>
      <p className="text-text-secondary mt-2 text-xs leading-relaxed">{B.description}</p>
      <dl className="text-text-secondary mt-3 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[max-content_1fr]">
        <dt className="font-semibold">Product</dt>
        <dd>{B.product}</dd>
        <dt className="font-semibold">Trade Name</dt>
        <dd>
          {B.tradeName} ({B.structure})
        </dd>
        <dt className="font-semibold">Legal Name / Proprietor</dt>
        <dd>{B.proprietor}</dd>
        <dt className="font-semibold">Email</dt>
        <dd>
          <a href={`mailto:${B.email}`} className="hover:text-brand-600 underline">
            {B.email}
          </a>
        </dd>
        <dt className="font-semibold">Phone</dt>
        <dd>
          <a href={B.phoneHref} className="hover:text-brand-600 underline">
            {B.phone}
          </a>
        </dd>
        <dt className="font-semibold">Registered Address</dt>
        <dd>{B.address}</dd>
      </dl>
    </section>
  );
}
