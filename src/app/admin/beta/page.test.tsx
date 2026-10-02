import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BetaAdminPage from './page';

describe('BetaAdminPage — Real Business Beta Dashboard', () => {
  it('renders cohort summary cards and business table', () => {
    render(<BetaAdminPage />);

    expect(screen.getByText(/real business beta command center/i)).toBeInTheDocument();
    expect(screen.getByText(/activated businesses/i)).toBeInTheDocument();
    expect(screen.getByText(/real IG\/FB publications/i)).toBeInTheDocument();
    expect(screen.getByText(/second campaign repeat/i)).toBeInTheDocument();

    expect(screen.getAllByText('Hyderabad Biryani House')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Spicy Tandoor Cloud Kitchen')[0]).toBeInTheDocument();
  });

  it('filters friction logs by severity', async () => {
    render(<BetaAdminPage />);

    const filterSelect = screen.getByLabelText(/filter severity/i);
    await userEvent.selectOptions(filterSelect, 'P2');

    await waitFor(() => {
      expect(screen.getByText(/where do i find my facebook page admin role/i)).toBeInTheDocument();
    });
  });

  it('opens and submits new beta observation log', async () => {
    render(<BetaAdminPage />);

    const addButton = screen.getByRole('button', { name: /\+ log beta observation/i });
    await userEvent.click(addButton);

    expect(
      screen.getByRole('heading', { name: /log beta observation \/ feedback/i })
    ).toBeInTheDocument();

    const descInput = screen.getByPlaceholderText(/detail the exact friction point/i);
    await userEvent.type(descInput, 'User found the calendar scheduling button text clear.');

    const saveButton = screen.getByRole('button', { name: /save log/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /log beta observation \/ feedback/i })
      ).not.toBeInTheDocument();
    });
  });
});
