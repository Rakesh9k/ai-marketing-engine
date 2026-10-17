import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssistantWorkspace } from './AssistantWorkspace';
import { useAuth } from '@/features/auth/hooks/useAuth';

jest.mock('@/features/auth/hooks/useAuth');
jest.mock('next/navigation', () => ({
  usePathname: () => '/assistant',
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/services/api', () => ({
  callFunction: jest.fn().mockResolvedValue({ text: 'Strategy response' }),
}));

const mockUseAuth = useAuth as jest.Mock;

describe('AssistantWorkspace Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'user-123', email: 'test@brainwise.ai' },
      status: 'authenticated',
    });
  });

  it('renders the Assistant Workspace header and welcome message', () => {
    render(<AssistantWorkspace />);
    expect(screen.getByText('Mitra AI Assistant')).toBeInTheDocument();
    expect(screen.getByText(/What would you like to achieve today\?/i)).toBeInTheDocument();
  });

  it('renders sub-navigation links', () => {
    render(<AssistantWorkspace />);
    expect(screen.getByText('💬 Assistant Hub')).toBeInTheDocument();
    expect(screen.getByText('📜 Conversation History')).toBeInTheDocument();
    expect(screen.getByText('💡 Recommendations')).toBeInTheDocument();
  });

  it('allows user to send a prompt and displays typing / progress response', async () => {
    render(<AssistantWorkspace />);
    const textarea = screen.getByPlaceholderText(/Ask Mitra anything about your marketing/i);
    const sendButton = screen.getByRole('button', { name: /Ask Mitra/i });

    fireEvent.change(textarea, { target: { value: 'Write a festival offer caption' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('Write a festival offer caption')).toBeInTheDocument();
    expect(screen.getByText(/Reading Business Brain context.../i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText(/Reading Business Brain context.../i)).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
