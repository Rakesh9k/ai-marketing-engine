import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const loadDraftMock = jest.fn();
const saveDraftMock = jest.fn();
const discoverFactsMock = jest.fn();
jest.mock('../draft/draftService', () => ({
  loadDraft: (...a: unknown[]) => loadDraftMock(...a),
  saveDraft: (...a: unknown[]) => saveDraftMock(...a),
  discoverFacts: (...a: unknown[]) => discoverFactsMock(...a),
}));
jest.mock('@/components/ui/MitraMascot', () => ({
  MitraMascot: () => <span data-testid="mascot" />,
}));
jest.mock('@/components/ui/MitraMark', () => ({ MitraMark: () => <span /> }));

import { ConversationShell } from './ConversationShell';

const view = (over: Record<string, unknown> = {}) => ({
  known: {},
  suggestions: {},
  skipped: [],
  welcomed: true,
  status: 'in_progress',
  revision: 3,
  ...over,
});

const PERSON = { 'owner.name': 'Asha', 'owner.role': 'owner' };
const CLOUD_KITCHEN = {
  ...PERSON,
  'identity.industry': 'restaurant_food',
  'identity.subcategory': 'cloud_kitchen',
};
const NAMED = { ...CLOUD_KITCHEN, 'identity.name': 'Biryani House' };
const LOCATED = {
  ...NAMED,
  'identity.city': 'Hyderabad',
  'identity.state': 'Telangana',
  'contact.whatsapp': '98765 43210',
};
const CAFE = {
  ...PERSON,
  'identity.industry': 'restaurant_food',
  'identity.subcategory': 'cafe',
  'identity.name': 'Cafe 9',
  'identity.city': 'Pune',
  'identity.state': 'Maharashtra',
  'contact.whatsapp': '9876543210',
};

const heading = (re: RegExp) => screen.findByRole('heading', { name: re });
const continueButton = () => screen.getByRole('button', { name: /^continue$/i });

describe('ConversationShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // tests/setup.ts replaces localStorage with inert mocks; this flow needs a real one.
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    });
    saveDraftMock.mockImplementation(async () => ({ draft: view({ revision: 4 }), stale: false }));
    discoverFactsMock.mockResolvedValue({ status: 'unavailable' });
  });

  describe('opening', () => {
    it('opens with a human welcome, not a form', async () => {
      loadDraftMock.mockResolvedValue(null);
      render(<ConversationShell uid="u1" />);
      expect(await heading(/hey, i'm mitra/i)).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('records that the welcome was seen, then asks at most two things at once (name + role)', async () => {
      loadDraftMock.mockResolvedValue(null);
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await user.click(await screen.findByRole('button', { name: /let's begin/i }));

      expect(await heading(/what should i call you/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /your role/i })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          { updates: {}, skip: [], welcomed: true },
          undefined
        )
      );
    });

    it('will not continue without the required name, and explains why each question is asked', async () => {
      loadDraftMock.mockResolvedValue(view());
      render(<ConversationShell uid="u1" />);
      await heading(/what should i call you/i);
      expect(continueButton()).toBeDisabled();
      expect(screen.getAllByText(/why i'm asking/i).length).toBeGreaterThan(0);
    });
  });

  describe('discover, then confirm', () => {
    it("pre-fills the name read from the owner's Google account, and it only counts once they continue", async () => {
      loadDraftMock.mockResolvedValue(view({ suggestions: { 'owner.name': 'Asha' } }));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      expect(await screen.findByRole('textbox')).toHaveValue('Asha');
      expect(screen.getByText(/from your google account/i)).toBeInTheDocument();
      expect(saveDraftMock).not.toHaveBeenCalled(); // seeing a guess is not confirming it

      await user.click(continueButton());
      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          expect.objectContaining({ updates: expect.objectContaining({ 'owner.name': 'Asha' }) }),
          3
        )
      );
    });

    it('lets the owner overwrite a pre-filled guess', async () => {
      loadDraftMock.mockResolvedValue(view({ suggestions: { 'owner.name': 'Asha' } }));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      const name = await screen.findByRole('textbox');
      await user.clear(name);
      await user.type(name, 'Ashu');
      await user.click(continueButton());
      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          expect.objectContaining({ updates: expect.objectContaining({ 'owner.name': 'Ashu' }) }),
          3
        )
      );
    });

    it('does not run discovery until it knows the business type, name and city', async () => {
      loadDraftMock.mockResolvedValue(view({ known: CLOUD_KITCHEN }));
      render(<ConversationShell uid="u1" />);
      await heading(/what's your business called/i);
      expect(discoverFactsMock).not.toHaveBeenCalled();
    });

    it("shows Mitra's guesses as flagged chips beside the presets, never pre-selected", async () => {
      loadDraftMock.mockResolvedValue(
        view({ known: LOCATED, suggestions: { 'offering.signature': ['Haleem', 'Mandi'] } })
      );
      render(<ConversationShell uid="u1" />);

      expect(await heading(/what do people usually order from you/i)).toBeInTheDocument();
      const haleem = screen.getByRole('button', { name: /haleem/i });
      expect(haleem).toHaveAttribute('aria-pressed', 'false');
      expect(within(haleem).getByText(/mitra's guess/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^biryani$/i })).toBeInTheDocument(); // a preset
    });

    it('a guess the owner taps becomes their answer, saved as something they chose', async () => {
      loadDraftMock.mockResolvedValue(
        view({ known: LOCATED, suggestions: { 'offering.signature': ['Haleem'] } })
      );
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await user.click(await screen.findByRole('button', { name: /haleem/i }));
      await user.click(screen.getByRole('button', { name: /^biryani$/i }));
      await user.type(screen.getByLabelText(/add your own/i), 'Mandi{Enter}');
      await user.click(continueButton());

      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          expect.objectContaining({
            updates: { 'offering.signature': ['Haleem', 'Biryani', 'Mandi'] },
          }),
          3
        )
      );
    });

    it('asks for discovery only after the answers it needs have been saved', async () => {
      loadDraftMock.mockResolvedValue(view({ known: NAMED }));
      discoverFactsMock.mockResolvedValue({
        status: 'completed',
        revision: 6,
        suggestions: { 'offering.signature': ['Kebabs'] },
      });
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await user.type(await screen.findByRole('textbox', { name: /which city/i }), 'Hyderabad');
      await user.type(screen.getByRole('textbox', { name: /which state/i }), 'Telangana');
      await user.click(continueButton());

      await waitFor(() => expect(discoverFactsMock).toHaveBeenCalledTimes(1));
      // The server reads the saved draft, so discovery must come after the save.
      expect(saveDraftMock.mock.invocationCallOrder[0]!).toBeLessThan(
        discoverFactsMock.mock.invocationCallOrder[0]!
      );
    });

    it('survives a failed discovery silently: no error shown, the conversation carries on', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      discoverFactsMock.mockRejectedValue(new Error('503 provider down'));
      loadDraftMock.mockResolvedValue(view({ known: { ...NAMED, 'identity.city': 'Hyderabad' } }));
      render(<ConversationShell uid="u1" />);

      await waitFor(() => expect(discoverFactsMock).toHaveBeenCalledTimes(1));
      expect(await heading(/which state/i)).toBeInTheDocument(); // still asking, normally
      expect(screen.queryByText(/503|provider down|couldn't/i)).not.toBeInTheDocument();
      warn.mockRestore();
    });
  });

  describe('page structure', () => {
    it('every question screen has exactly one page-level heading (found by an accessibility scan)', async () => {
      loadDraftMock.mockResolvedValue(view());
      render(<ConversationShell uid="u1" />);
      await screen.findByRole('textbox');
      // The questions themselves are h2s; without this the page had no h1 at all.
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    });
  });

  describe('adaptive branching', () => {
    it('the follow-up depends on the industry just chosen, and every answer is saved', async () => {
      loadDraftMock.mockResolvedValue(view());
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await user.type(await screen.findByRole('textbox'), 'Asha');
      await user.click(screen.getByRole('radio', { name: /owner/i }));
      await user.click(continueButton());

      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          { updates: { 'owner.name': 'Asha', 'owner.role': 'owner' }, skip: [] },
          3
        )
      );
      expect(await screen.findByText(/nice to meet you, asha/i)).toBeInTheDocument();

      await user.click(screen.getByRole('radio', { name: /salon & beauty/i }));
      expect(await heading(/what kind of beauty business is it/i)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /barbershop/i })).toBeInTheDocument();
    });

    it('a cloud kitchen is asked where it delivers from, not where it is "based"', async () => {
      loadDraftMock.mockResolvedValue(view({ known: NAMED }));
      render(<ConversationShell uid="u1" />);
      expect(await heading(/which city do you deliver from/i)).toBeInTheDocument();
    });

    it('uses the owner\'s own words on the generic path ("something else")', async () => {
      loadDraftMock.mockResolvedValue(view({ known: { ...PERSON, 'identity.industry': 'other' } }));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      expect(await heading(/in a few words, what does your business do/i)).toBeInTheDocument();
      await user.type(screen.getByRole('textbox'), 'Pottery classes');
      await user.click(continueButton());
      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          expect.objectContaining({ updates: { 'identity.subcategory': 'Pottery classes' } }),
          3
        )
      );
    });

    it('asks city and state together, as exactly two questions', async () => {
      loadDraftMock.mockResolvedValue(view({ known: NAMED }));
      render(<ConversationShell uid="u1" />);
      await heading(/which city do you deliver from/i);
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
    });
  });

  describe('validation and skipping', () => {
    it('rejects a WhatsApp number that is not a number, with a plain message, and blocks Continue', async () => {
      loadDraftMock.mockResolvedValue(
        view({
          known: { ...NAMED, 'identity.city': 'Hyderabad', 'identity.state': 'Telangana' },
        })
      );
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      const box = await screen.findByRole('textbox');
      await user.type(box, 'call me');
      expect(await screen.findByRole('alert')).toHaveTextContent(/mobile number/i);
      expect(continueButton()).toBeDisabled();

      await user.clear(box);
      await user.type(box, '98765 43210');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(continueButton()).toBeEnabled();
    });

    it('lets the owner skip an optional question, remembers it, and moves on', async () => {
      loadDraftMock.mockResolvedValue(view({ known: LOCATED }));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await heading(/what do people usually order from you/i);
      await user.click(screen.getByRole('button', { name: /skip for now/i }));

      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          expect.objectContaining({ skip: ['offering.signature'] }),
          3
        )
      );
      expect(await heading(/who do you most want ordering from you/i)).toBeInTheDocument();
    });

    it('does not offer to skip a required question', async () => {
      loadDraftMock.mockResolvedValue(view({ known: PERSON }));
      render(<ConversationShell uid="u1" />);
      await heading(/what kind of business are we working with/i);
      expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
    });

    it('limits a list to five choices', async () => {
      loadDraftMock.mockResolvedValue(view({ known: CAFE }));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await heading(/best known for/i);
      for (const label of ['Biryani', 'Meals', 'Tiffins', 'Snacks', 'Desserts']) {
        await user.click(screen.getByRole('button', { name: new RegExp(`^${label}$`) }));
      }
      expect(screen.getByRole('button', { name: /^beverages$/i })).toBeDisabled();
    });
  });

  describe('resume and persistence', () => {
    it('resumes after a refresh: skips the welcome, greets the owner, continues where they stopped', async () => {
      loadDraftMock.mockResolvedValue(view({ known: PERSON }));
      render(<ConversationShell uid="u1" />);

      expect(
        await screen.findByText(/welcome back, asha\. we were getting to know your business/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /what kind of business are we working with/i })
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /hey, i'm mitra/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /what should i call you/i })
      ).not.toBeInTheDocument();
    });

    it('delivers an answer that never reached the server before the page was closed', async () => {
      window.localStorage.setItem(
        'mitra-onboarding-pending:u1',
        JSON.stringify({ updates: { 'owner.name': 'Asha' }, skip: [] })
      );
      loadDraftMock.mockResolvedValue(view());
      render(<ConversationShell uid="u1" />);

      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          { updates: { 'owner.name': 'Asha' }, skip: [] },
          3
        )
      );
      expect(
        screen.queryByRole('heading', { name: /what should i call you/i })
      ).not.toBeInTheDocument();
    });

    it('keeps going when a save fails, and tells the owner their answers are safe', async () => {
      loadDraftMock.mockResolvedValue(view());
      saveDraftMock.mockRejectedValue(new Error('offline'));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await user.type(await screen.findByRole('textbox'), 'Asha');
      await user.click(continueButton());

      expect(await screen.findByText(/couldn't save just now/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(await heading(/what kind of business are we working with/i)).toBeInTheDocument();
    });

    it('shows a calm recovery, not a technical error, if the draft cannot be loaded', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      loadDraftMock.mockRejectedValue(new Error('permission-denied'));
      render(<ConversationShell uid="u1" />);
      expect(await screen.findByText(/couldn't load where we left off/i)).toBeInTheDocument();
      expect(screen.queryByText(/permission-denied/i)).not.toBeInTheDocument();
      spy.mockRestore();
    });
  });

  describe('two tabs (lightweight, last write wins)', () => {
    it('says so when another tab changed the conversation, adopts the latest, and can be dismissed', async () => {
      loadDraftMock.mockResolvedValue(view({ known: PERSON, revision: 3 }));
      saveDraftMock.mockResolvedValue({
        // Another tab had also answered the industry in the meantime.
        draft: view({ known: { ...PERSON, 'identity.industry': 'fitness' }, revision: 5 }),
        stale: true,
      });
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await user.click(await screen.findByRole('radio', { name: /real estate/i }));

      expect(await screen.findByText(/also updated somewhere else/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /got it/i }));
      expect(screen.queryByText(/also updated somewhere else/i)).not.toBeInTheDocument();
    });

    it('sends the revision it last saw, and advances it after each save', async () => {
      loadDraftMock.mockResolvedValue(view({ known: PERSON, revision: 3 }));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await user.click(await screen.findByRole('radio', { name: /fitness/i }));
      await waitFor(() => expect(saveDraftMock).toHaveBeenCalledTimes(1));
      expect(saveDraftMock.mock.calls[0]![1]).toBe(3);

      await user.click(await screen.findByRole('radio', { name: /^gym$/i }));
      await waitFor(() => expect(saveDraftMock).toHaveBeenCalledTimes(2));
      expect(saveDraftMock.mock.calls[1]![1]).toBe(4); // from the previous save's response
    });

    it('does not show the notice for an ordinary save', async () => {
      loadDraftMock.mockResolvedValue(view({ known: PERSON }));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await user.click(await screen.findByRole('radio', { name: /fitness/i }));
      await waitFor(() => expect(saveDraftMock).toHaveBeenCalled());
      expect(screen.queryByText(/also updated somewhere else/i)).not.toBeInTheDocument();
    });
  });

  describe('recap', () => {
    const ALL = {
      ...LOCATED,
      'offering.signature': ['Biryani', 'Haleem'],
      'audience.primary': ['Families'],
      'positioning.usp': 'Cooked dum style',
    };

    it('summarises everything it understood, in friendly words', async () => {
      loadDraftMock.mockResolvedValue(view({ known: ALL }));
      render(<ConversationShell uid="u1" />);

      expect(await heading(/here's what i've understood so far, asha/i)).toBeInTheDocument();
      for (const text of [
        'Biryani House',
        'Hyderabad',
        'Telangana',
        'Restaurant & Food',
        'Cloud Kitchen',
        'Biryani, Haleem',
        'Families',
        'Cooked dum style',
      ]) {
        expect(screen.getByText(text)).toBeInTheDocument();
      }
    });

    it('lets the owner change one answer without restarting, and re-asks what depended on it', async () => {
      loadDraftMock.mockResolvedValue(view({ known: ALL }));
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);

      await heading(/here's what i've understood/i);
      await user.click(screen.getByRole('button', { name: /change your business$/i }));
      await user.click(await screen.findByRole('radio', { name: /fitness/i }));

      // The old "Cloud Kitchen" cannot survive a switch to Fitness, so Mitra asks the new follow-up.
      expect(await heading(/what kind of fitness business is it/i)).toBeInTheDocument();
    });
  });
});
