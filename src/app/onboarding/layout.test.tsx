import React from 'react';
import { render, screen } from '@testing-library/react';

// The conversation animates with motion/react. useReducedMotion only covered the mascot and the
// progress path; the entrance fades/slides on every screen ignored "reduce motion". One
// MotionConfig at the layout makes the whole onboarding honour the visitor's setting.
const motionConfigProps: Array<Record<string, unknown>> = [];
jest.mock('motion/react', () => ({
  MotionConfig: ({ children, ...props }: { children: React.ReactNode }) => {
    motionConfigProps.push(props);
    return <>{children}</>;
  },
}));
jest.mock('@/features/auth/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/onboarding/OnboardingGate', () => ({
  OnboardingGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import OnboardingLayout from './layout';

describe('onboarding layout', () => {
  it("honours the visitor's reduce-motion setting for every onboarding screen", () => {
    render(
      <OnboardingLayout>
        <div>screen</div>
      </OnboardingLayout>
    );
    expect(screen.getByText('screen')).toBeInTheDocument();
    expect(motionConfigProps).toContainEqual(expect.objectContaining({ reducedMotion: 'user' }));
  });
});
