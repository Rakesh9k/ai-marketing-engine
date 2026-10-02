import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanWizardModal } from './PlanWizardModal';
import { calendarService } from '../services/calendarService';

jest.mock('../services/calendarService', () => ({
  calendarService: {
    generateMarketingPlan: jest.fn(),
  },
}));

describe('PlanWizardModal', () => {
  const mockProducts = [
    {
      productId: 'prod-1',
      businessId: 'biz-123',
      name: 'Special Biryani',
      category: 'main',
      price: 350,
      currency: 'INR' as const,
      description: 'Delicious biryani',
      images: [],
      tags: [],
      variants: [],
      attributes: {},
      status: 'active' as const,
      sortOrder: 1,
      createdAt: '2026-09-28T10:00:00.000Z',
      updatedAt: '2026-09-28T10:00:00.000Z',
    },
  ];

  const defaultProps = {
    businessId: 'biz-123',
    products: mockProducts,
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Step 1 goal selection and navigates to Step 2 frequency selection', () => {
    render(<PlanWizardModal {...defaultProps} />);

    expect(screen.getByText('Create Your 30-Day Marketing Plan')).toBeInTheDocument();
    expect(screen.getByText('What is your primary marketing goal?')).toBeInTheDocument();
    expect(screen.getByText('Get more customers')).toBeInTheDocument();
    expect(screen.getByText('Promote offers')).toBeInTheDocument();
    expect(screen.getByText('Build brand awareness')).toBeInTheDocument();
    expect(screen.getByText('Promote specific products')).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('How often do you want to post?')).toBeInTheDocument();
    expect(screen.getByText('3 posts / week')).toBeInTheDocument();
    expect(screen.getByText('5 posts / week')).toBeInTheDocument();
    expect(screen.getByText('Daily posting')).toBeInTheDocument();
  });

  it('navigates through wizard steps and submits plan generation', async () => {
    (calendarService.generateMarketingPlan as jest.Mock).mockResolvedValue({
      plan: { planId: 'plan-123' },
      items: [],
    });

    render(<PlanWizardModal {...defaultProps} />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    expect(screen.getByText(/Anything specific to promote\?/i)).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /Generate 30-Day Plan/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(calendarService.generateMarketingPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'biz-123',
          goal: 'get_customers',
          frequency: 'three_per_week',
        })
      );
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('displays an error message when generation fails', async () => {
    (calendarService.generateMarketingPlan as jest.Mock).mockRejectedValue(
      new Error('AI Service unavailable')
    );

    render(<PlanWizardModal {...defaultProps} products={[]} />);

    // Step 1 -> Step 2 (No products so Step 2 has final Generate button)
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    const generateBtn = screen.getByRole('button', { name: /Generate 30-Day Plan/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('AI Service unavailable')).toBeInTheDocument();
    });
  });
});
