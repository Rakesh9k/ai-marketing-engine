import Link from 'next/link';
import { BusinessIdentity } from '@/components/shared/BusinessIdentity';
import { MitraLogo } from '@/components/ui/MitraLogo';

export function LandingFooter() {
  const productLinks = [
    { label: 'Create Campaign', href: '/signup' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Solutions', href: '/solutions' },
  ];

  const companyLinks = [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const resourceLinks = [
    { label: 'Help & Support', href: '/support' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy', href: '/refund' },
    { label: 'Cancellation Policy', href: '/cancellation' },
  ];

  return (
    <footer className="border-border-light bg-bg-secondary border-t py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-5">
          {/* BRAND COLUMN */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block" aria-label="Mitra by Brainwise Home">
              <MitraLogo size="sm" decorative />
            </Link>
            <p className="text-text-tertiary mt-1 text-xs font-semibold">by Brainwise</p>
            <p className="text-text-secondary mt-4 max-w-sm text-xs leading-relaxed">
              Mitra is an AI marketing partner for small businesses, helping restaurants, salons,
              and local stores create, promote, and grow with complete local-language campaigns.
            </p>
          </div>

          {/* PRODUCT LINKS */}
          <div>
            <h4 className="text-text-primary text-xs font-bold tracking-wider uppercase">
              Product
            </h4>
            <ul className="text-text-secondary mt-4 space-y-2.5 text-xs">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-brand-600 cursor-pointer text-left transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COMPANY LINKS */}
          <div>
            <h4 className="text-text-primary text-xs font-bold tracking-wider uppercase">
              Company
            </h4>
            <ul className="text-text-secondary mt-4 space-y-2.5 text-xs">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-brand-600 cursor-pointer text-left transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* RESOURCES LINKS */}
          <div>
            <h4 className="text-text-primary text-xs font-bold tracking-wider uppercase">
              Resources
            </h4>
            <ul className="text-text-secondary mt-4 space-y-2.5 text-xs">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-brand-600 cursor-pointer text-left transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <BusinessIdentity className="border-border-light mt-10 border-t pt-8" />

        {/* BOTTOM COPYRIGHT BAR */}
        <div className="border-border-light text-text-tertiary mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs sm:flex-row">
          <p>
            © {new Date().getFullYear()} Mitra by BrainWise · Brainwise Solutions. All rights
            reserved.
          </p>
          <p className="flex items-center gap-1">
            <span>Built with care for Indian local businesses 🇮🇳</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
