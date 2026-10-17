import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

describe('NotFound (404 page)', () => {
  it('renders brand heading and recovery navigation links', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /set up business/i })).toHaveAttribute('href', '/onboarding');
  });
});
