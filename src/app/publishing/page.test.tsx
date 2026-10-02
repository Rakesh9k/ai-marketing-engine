import React from 'react';
import { render } from '@testing-library/react';
import PublishingDashboardPage from './page';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

describe('PublishingDashboardPage', () => {
  it('redirects to /creative', () => {
    render(<PublishingDashboardPage />);
    expect(mockReplace).toHaveBeenCalledWith('/creative');
  });
});
