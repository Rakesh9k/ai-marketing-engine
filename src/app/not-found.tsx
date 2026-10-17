import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 py-16 text-center">
      <Link href="/" aria-label="Mitra — Home" className="mb-8 inline-block">
        <MitraLogo size="md" />
      </Link>

      <span className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-600">
        404 Error
      </span>

      <h1 className="mb-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
        Page not found
      </h1>

      <p className="mb-8 max-w-md text-base text-text-secondary">
        The page you are looking for doesn&apos;t exist, has been removed, or has moved to a new address.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center rounded-xl border border-border-default bg-surface px-6 py-3 text-sm font-medium text-text-primary transition hover:bg-surface-hover"
        >
          Set Up Business
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium text-text-tertiary transition hover:text-text-primary"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
