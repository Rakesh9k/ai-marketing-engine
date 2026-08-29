export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-display text-text-primary font-bold">AI Marketing Engine</h1>
          <p className="text-h3 text-text-secondary mx-auto max-w-2xl">
            One Photo + One Offer → Complete Local Campaign
          </p>
        </div>

        <div className="text-text-tertiary space-y-3">
          <p className="text-body-sm">Phase 1 — Local Development Foundation</p>
          <p className="text-caption">Repository initialized. Ready for Phase 2 development.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <a
            href="/dashboard"
            className="btn btn-primary btn-lg"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              borderRadius: '0.375rem',
              transition: 'color 150ms, background-color 150ms',
              minHeight: '44px',
              padding: '0 1.5rem',
              backgroundColor: 'var(--color-brand-600)',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            Dashboard (Coming Soon)
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-lg"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              borderRadius: '0.375rem',
              transition: 'color 150ms, background-color 150ms',
              minHeight: '44px',
              padding: '0 1.5rem',
              backgroundColor: 'var(--color-neutral-100)',
              color: 'var(--color-neutral-900)',
              border: '1px solid var(--color-neutral-200)',
              textDecoration: 'none',
            }}
          >
            View on GitHub
          </a>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 pt-8 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <div className="text-brand-600 mb-2 text-3xl font-bold">Next.js 15</div>
            <div className="text-sm text-neutral-600">App Router + TypeScript</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <div className="text-brand-600 mb-2 text-3xl font-bold">Firebase</div>
            <div className="text-sm text-neutral-600">Auth + Firestore + Functions</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <div className="text-brand-600 mb-2 text-3xl font-bold">Tailwind CSS</div>
            <div className="text-sm text-neutral-600">Design System Ready</div>
          </div>
        </div>
      </div>
    </main>
  );
}
