import { StyledLink } from '@/components/ui/Link';
import { MitraLogo } from '@/components/ui/MitraLogo';

/**
 * Phase 17: Privacy Policy and Terms routes do not exist in this
 * application (confirmed: no src/app/privacy or src/app/terms). Per the
 * phase's explicit instruction not to fabricate legal pages just to fill
 * space, those links are intentionally omitted rather than pointed at
 * dead routes — see docs/PHASE_17_LANDING_PAGE_REPORT.md.
 */
export function LandingFooter() {
  return (
    <footer className="border-border-light bg-bg-secondary border-t">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <MitraLogo size="sm" />
            <p className="text-text-tertiary mt-1 text-center text-sm">by Brainwise</p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2 sm:flex-row sm:gap-8">
            <a href="#how-it-works" className="text-text-secondary hover:text-text-primary text-sm">
              How it works
            </a>
            <a href="#pricing" className="text-text-secondary hover:text-text-primary text-sm">
              Pricing
            </a>
            <StyledLink href="/login" variant="secondary" size="sm">
              Login
            </StyledLink>
            <StyledLink href="/signup" variant="secondary" size="sm">
              Signup
            </StyledLink>
          </nav>
        </div>

        <p className="text-text-tertiary mt-8 text-xs">
          © {new Date().getFullYear()} Mitra by Brainwise. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
