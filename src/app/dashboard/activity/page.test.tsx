import React from 'react';
import { render, screen } from '@testing-library/react';
import ActivityPage from './page';

jest.mock('@/features/auth/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ActivityPage', () => {
  it('renders activity timeline title and items', () => {
    render(<ActivityPage />);
    expect(screen.getByRole('heading', { name: /activity & work timeline/i })).toBeInTheDocument();
    expect(screen.getByText(/mitra generated your instagram reel draft/i)).toBeInTheDocument();
  });
});
