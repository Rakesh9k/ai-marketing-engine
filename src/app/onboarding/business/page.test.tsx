import { redirect } from 'next/navigation';
import OnboardingBusinessPage from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('/onboarding/business redirect', () => {
  it('redirects to the canonical /onboarding path', () => {
    OnboardingBusinessPage();
    expect(redirect).toHaveBeenCalledWith('/onboarding');
  });
});
