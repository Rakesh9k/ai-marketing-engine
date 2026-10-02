import React from 'react';
import { render, screen } from '@testing-library/react';
import CreatePage from './page';

jest.mock('@/features/auth/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('CreatePage', () => {
  it('renders quick create launcher title and options', () => {
    render(<CreatePage />);
    expect(screen.getByRole('heading', { name: /quick create launcher/i })).toBeInTheDocument();
    expect(screen.getAllByText(/full campaign pack/i).length).toBeGreaterThan(0);
  });
});
