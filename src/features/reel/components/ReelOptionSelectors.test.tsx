import { render, screen, fireEvent } from '@testing-library/react';
import { ReelGoalSelector } from '@/features/reel/components/ReelGoalSelector';
import { ReelStyleSelector } from '@/features/reel/components/ReelStyleSelector';
import { ReelDurationSelector } from '@/features/reel/components/ReelDurationSelector';
import { REEL_GOAL_OPTIONS, REEL_STYLE_OPTIONS } from '@/features/reel/constants';

describe('ReelGoalSelector', () => {
  it('renders all goal options', () => {
    render(<ReelGoalSelector value={null} onChange={jest.fn()} />);
    REEL_GOAL_OPTIONS.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('calls onChange with the selected goal', () => {
    const onChange = jest.fn();
    render(<ReelGoalSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('Offer / Promotion'));
    expect(onChange).toHaveBeenCalledWith('offer_promotion');
  });

  it('marks the selected option as pressed', () => {
    render(<ReelGoalSelector value="food_showcase" onChange={jest.fn()} />);
    const button = screen.getByText('Food Showcase').closest('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ReelStyleSelector', () => {
  it('renders all style options', () => {
    render(<ReelStyleSelector value={null} onChange={jest.fn()} />);
    REEL_STYLE_OPTIONS.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('calls onChange with the selected style', () => {
    const onChange = jest.fn();
    render(<ReelStyleSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('Cinematic'));
    expect(onChange).toHaveBeenCalledWith('cinematic');
  });
});

describe('ReelDurationSelector', () => {
  it('renders 15s, 30s and 45s options', () => {
    render(<ReelDurationSelector value={30} onChange={jest.fn()} />);
    expect(screen.getByText('15s')).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('calls onChange with the numeric duration', () => {
    const onChange = jest.fn();
    render(<ReelDurationSelector value={30} onChange={onChange} />);
    fireEvent.click(screen.getByText('45s'));
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it('marks the current duration as selected', () => {
    render(<ReelDurationSelector value={15} onChange={jest.fn()} />);
    expect(screen.getByText('15s')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('30s')).toHaveAttribute('aria-pressed', 'false');
  });
});
