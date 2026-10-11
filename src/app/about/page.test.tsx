import { render, screen } from '@testing-library/react';
import AboutPage from './page';
import { ThemeProvider } from '@/hooks/useTheme';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/about',
}));

const renderAboutPage = () =>
  render(
    <ThemeProvider>
      <AboutPage />
    </ThemeProvider>
  );

describe('About Page Component', () => {
  it('renders main hero headline and story branding', () => {
    renderAboutPage();
    expect(screen.getAllByText(/Small Businesses/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/That’s Why We’re Here/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Mitra by Brainwise was born from a simple belief/i)
    ).toBeInTheDocument();
  });

  it('renders problem section and reality cards', () => {
    renderAboutPage();
    expect(screen.getByText(/Running a business is already a/i)).toBeInTheDocument();
    expect(screen.getByText(/Restaurant & Food Business/i)).toBeInTheDocument();
    expect(screen.getByText(/Salon & Beauty Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Real Estate & Properties/i)).toBeInTheDocument();
  });

  it('renders Brainwise origin story and Enso transition', () => {
    renderAboutPage();
    expect(screen.getByText(/Where It All Started/i)).toBeInTheDocument();
    expect(screen.getByText(/Brainwise Story/i)).toBeInTheDocument();
    expect(screen.getByText(/What if AI could actually understand people/i)).toBeInTheDocument();
  });

  it('renders Product Philosophy and Why Mitra sections', () => {
    renderAboutPage();
    expect(screen.getByText(/Understand before creating/i)).toBeInTheDocument();
    expect(screen.getByText(/Why "Mitra"\?/i)).toBeInTheDocument();
  });

  it('renders local business sectors and final CTA banner', () => {
    renderAboutPage();
    expect(screen.getByText(/Built for Real Indian Businesses/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Next Chapter/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1000\+/i)).toBeInTheDocument();
  });
});
