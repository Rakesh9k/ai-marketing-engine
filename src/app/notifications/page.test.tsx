import React from 'react';
import { render, screen } from '@testing-library/react';
import NotificationsPage from './page';

jest.mock('@/features/auth/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('NotificationsPage', () => {
  it('renders notifications title and items', () => {
    render(<NotificationsPage />);
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText(/your instagram reel is ready to review/i)).toBeInTheDocument();
  });
});
