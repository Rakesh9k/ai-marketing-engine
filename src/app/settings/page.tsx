'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function MainSettingsPage() {
  const settingsTabs = [
    {
      title: 'Business Profile',
      description: 'Manage name, address, phone number, category, and operational details.',
      href: '/business-profile',
      icon: '🏢',
    },
    {
      title: 'Brand & Visual Style',
      description: 'Configure brand voice, color tokens, and design style guides.',
      href: '/brand',
      icon: '🎨',
    },
    {
      title: 'Connected Social Accounts',
      description: 'Link Facebook and Instagram pages for 1-click publishing.',
      href: '/settings/social',
      icon: '🔗',
    },
    {
      title: 'Billing & Plan Subscriptions',
      description: 'View active plan tier, billing frequency, and purchase additional credits.',
      href: '/billing',
      icon: '💳',
    },
    {
      title: 'Credit Usage History',
      description: 'Track AI credit logs for campaign, image, and reel generation.',
      href: '/usage',
      icon: '📊',
    },
    {
      title: 'Support & Help Center',
      description: 'Contact Brainwise support or submit a ticket.',
      href: '/support',
      icon: '❓',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-text-primary text-3xl font-bold tracking-tight">
          Account &amp; Workspace Settings
        </h1>
        <p className="text-text-secondary mt-2">
          Configure your business profile, brand preferences, social channels, and billing plan.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {settingsTabs.map((tab) => (
          <Link
            key={tab.title}
            href={tab.href}
            className="border-border-light bg-surface hover:border-brand-500/50 flex items-start gap-4 rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="text-3xl">{tab.icon}</div>
            <div>
              <h2 className="text-text-primary text-lg font-semibold">{tab.title}</h2>
              <p className="text-text-secondary mt-1 text-sm">{tab.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
