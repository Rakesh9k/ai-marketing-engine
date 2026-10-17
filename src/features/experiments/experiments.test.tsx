import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

import { resetExperimentCache, useExperiment } from './useExperiment';
import { FeedbackPrompt } from '@/features/billing/FeedbackPrompt';

function Probe({ enabled = true }: { enabled?: boolean }) {
  const v = useExperiment(
    'annual_saving_display',
    ['amount_only', 'effective_monthly'] as const,
    enabled
  );
  return <p data-testid="variant">{v}</p>;
}

describe('useExperiment', () => {
  beforeEach(() => {
    resetExperimentCache();
    callFunctionMock.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('is control until the server answers, then the assigned variant', async () => {
    callFunctionMock.mockResolvedValue({ assignments: { annual_saving_display: 'amount_only' } });
    render(<Probe />);
    expect(screen.getByTestId('variant')).toHaveTextContent('control');
    await waitFor(() => expect(screen.getByTestId('variant')).toHaveTextContent('amount_only'));
    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'getExperimentAssignments',
      data: {},
    });
  });

  it('falls back to control for no assignment, an unknown variant, a failure, or when disabled', async () => {
    callFunctionMock.mockResolvedValue({ assignments: {} });
    const { unmount } = render(<Probe />);
    await waitFor(() => expect(callFunctionMock).toHaveBeenCalled());
    expect(screen.getByTestId('variant')).toHaveTextContent('control');
    unmount();

    resetExperimentCache();
    callFunctionMock.mockResolvedValue({
      assignments: { annual_saving_display: 'a_variant_from_the_future' },
    });
    const second = render(<Probe />);
    await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('variant')).toHaveTextContent('control');
    second.unmount();

    resetExperimentCache();
    callFunctionMock.mockRejectedValue(new Error('offline'));
    const third = render(<Probe />);
    await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(3));
    expect(screen.getByTestId('variant')).toHaveTextContent('control');
    third.unmount();

    callFunctionMock.mockClear();
    resetExperimentCache();
    render(<Probe enabled={false} />);
    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('variant')).toHaveTextContent('control');
  });

  it('asks the server once per page load however many components use it', async () => {
    callFunctionMock.mockResolvedValue({ assignments: {} });
    render(
      <>
        <Probe />
        <Probe />
        <Probe />
      </>
    );
    await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
  });
});

describe('FeedbackPrompt', () => {
  beforeEach(() => {
    callFunctionMock.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('one tap sends one reason (with the order for an abandoned checkout) and says thank you', async () => {
    callFunctionMock.mockResolvedValue({ recorded: true });
    render(<FeedbackPrompt context="checkout_abandoned" orderId="order_1" />);
    await userEvent.click(screen.getByRole('button', { name: /costs more than i expected/i }));
    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'submitCommercialFeedback',
      data: { context: 'checkout_abandoned', reason: 'too_expensive', orderId: 'order_1' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/thank you/i);
  });

  it('the not-renewing question sends no order and offers reasons that fit', async () => {
    callFunctionMock.mockResolvedValue({ recorded: true });
    render(<FeedbackPrompt context="not_renewing" />);
    expect(screen.getByRole('group', { name: /not renewing/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /do not need it right now/i }));
    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'submitCommercialFeedback',
      data: { context: 'not_renewing', reason: 'not_needed_now' },
    });
  });

  it('is optional: "No thanks" removes it without sending anything', async () => {
    const { container } = render(<FeedbackPrompt context="not_renewing" />);
    await userEvent.click(screen.getByRole('button', { name: /no thanks/i }));
    expect(container).toBeEmptyDOMElement();
    expect(callFunctionMock).not.toHaveBeenCalled();
  });

  it('a failure says it can be ignored and does not block anything', async () => {
    callFunctionMock.mockRejectedValue(new Error('x'));
    render(<FeedbackPrompt context="not_renewing" />);
    await userEvent.click(screen.getByRole('button', { name: /switched to another tool/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/can ignore this question/i);
  });
});
