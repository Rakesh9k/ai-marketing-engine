import React from 'react';
import { render } from '@testing-library/react';
import MarketingCalendarPage from './page';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

describe('MarketingCalendarPage', () => {
  it('redirects to /creative', () => {
    render(<MarketingCalendarPage />);
    expect(mockReplace).toHaveBeenCalledWith('/creative');
  });
});
