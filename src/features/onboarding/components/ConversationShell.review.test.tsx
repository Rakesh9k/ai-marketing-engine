import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const loadDraftMock = jest.fn();
const saveDraftMock = jest.fn();
const discoverFactsMock = jest.fn();
const confirmMock = jest.fn();
jest.mock('../draft/draftService', () => ({
  loadDraft: (...a: unknown[]) => loadDraftMock(...a),
  saveDraft: (...a: unknown[]) => saveDraftMock(...a),
  discoverFacts: (...a: unknown[]) => discoverFactsMock(...a),
  confirmOnboarding: (...a: unknown[]) => confirmMock(...a),
}));
const getIdTokenMock = jest.fn().mockResolvedValue('token');
jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: () => ({
    currentUser: { getIdToken: (...a: unknown[]) => getIdTokenMock(...a) },
  }),
}));
jest.mock('@/components/ui/MitraMascot', () => ({ MitraMascot: () => <span /> }));
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

const ALL = {
  'owner.name': 'Asha',
  'owner.role': 'founder',
  'identity.industry': 'fitness',
  'identity.subcategory': 'yoga',
  'identity.name': 'Prana Yoga Studio',
  'identity.city': 'Hyderabad',
  'identity.state': 'Telangana',
  'contact.whatsapp': '98765 43210',
  'offering.signature': ['Group classes'],
  'audience.primary': ['Working professionals'],
  'positioning.usp': 'Small batches',
};

const reviewable = (over: Record<string, unknown> = {}) =>
  view({ known: ALL, status: 'in_progress', ...over });

const heading = (re: RegExp) => screen.findByRole('heading', { name: re });
const looksRight = () => screen.getByRole('button', { name: /^looks right$/i });

describe('review and confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    discoverFactsMock.mockResolvedValue({ status: 'unavailable' });
    // The server acknowledges the review: status flips to ready_for_review at a new revision.
    saveDraftMock.mockImplementation(async (patch: { reviewShown?: boolean }) => ({
      draft: view({
        known: ALL,
        status: patch.reviewShown ? 'ready_for_review' : 'in_progress',
        revision: 4,
      }),
      stale: false,
    }));
    confirmMock.mockResolvedValue({ ok: true, businessId: 'biz-1' });
  });

  it('tells the server the review is on screen', async () => {
    loadDraftMock.mockResolvedValue(reviewable());
    render(<ConversationShell uid="u1" />);
    await heading(/here's what i've understood so far, asha/i);
    await waitFor(() =>
      expect(saveDraftMock).toHaveBeenCalledWith(expect.objectContaining({ reviewShown: true }), 3)
    );
  });

  it('shows everything the owner is about to be committed to, in plain words', async () => {
    loadDraftMock.mockResolvedValue(reviewable());
    render(<ConversationShell uid="u1" />);
    await heading(/here's what i've understood/i);
    for (const text of [
      'Prana Yoga Studio',
      'Hyderabad',
      'Telangana',
      'Fitness',
      'Yoga / Pilates',
      'Group classes',
      'Working professionals',
      'Small batches',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText(/is this a good representation of your business/i)).toBeInTheDocument();
  });

  it('shows the WhatsApp number normalised, and is honest that it will also be used for calls', async () => {
    loadDraftMock.mockResolvedValue(reviewable());
    render(<ConversationShell uid="u1" />);
    await heading(/here's what i've understood/i);
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(
      screen.getByText(/i'll use this number for calls too\. you can add a different one any time/i)
    ).toBeInTheDocument();
  });

  it('keeps "Looks right" disabled until the server has acknowledged the review', async () => {
    let acknowledge!: () => void;
    saveDraftMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          acknowledge = () =>
            resolve({
              draft: view({ known: ALL, status: 'ready_for_review', revision: 4 }),
              stale: false,
            });
        })
    );
    loadDraftMock.mockResolvedValue(reviewable());
    render(<ConversationShell uid="u1" />);
    await heading(/here's what i've understood/i);
    expect(looksRight()).toBeDisabled();

    acknowledge();
    await waitFor(() => expect(looksRight()).toBeEnabled());
  });

  it('never creates anything until the owner says so', async () => {
    loadDraftMock.mockResolvedValue(reviewable());
    render(<ConversationShell uid="u1" />);
    await waitFor(() => expect(looksRight()).toBeEnabled());
    expect(confirmMock).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing is set up until you say/i)).toBeInTheDocument();
  });

  it('confirms exactly the revision the server acknowledged, refreshes the sign-in token, and finishes', async () => {
    loadDraftMock.mockResolvedValue(reviewable());
    const user = userEvent.setup();
    render(<ConversationShell uid="u1" />);
    await waitFor(() => expect(looksRight()).toBeEnabled());

    await user.click(looksRight());

    expect(confirmMock).toHaveBeenCalledWith(4); // the revision from the server's acknowledgement
    expect(await heading(/mitra knows your business now, asha/i)).toBeInTheDocument();
    expect(getIdTokenMock).toHaveBeenCalledWith(true); // so the new business's claims reach the token
  });

  it('a double-click confirms once', async () => {
    let finish!: (v: unknown) => void;
    confirmMock.mockImplementation(() => new Promise((r) => (finish = r)));
    loadDraftMock.mockResolvedValue(reviewable());
    const user = userEvent.setup();
    render(<ConversationShell uid="u1" />);
    await waitFor(() => expect(looksRight()).toBeEnabled());

    await user.dblClick(looksRight());
    expect(confirmMock).toHaveBeenCalledTimes(1);
    finish({ ok: true, businessId: 'biz-1' });
    await heading(/mitra knows your business now/i);
  });

  describe('the completion screen', () => {
    beforeEach(async () => {
      loadDraftMock.mockResolvedValue(reviewable());
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await waitFor(() => expect(looksRight()).toBeEnabled());
      await user.click(looksRight());
      await heading(/mitra knows your business now/i);
    });

    it('is warm and truthful', () => {
      expect(
        screen.getByText(/i'll use what you've told me whenever i create marketing for you/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/onboarding completed/i)).not.toBeInTheDocument();
    });

    it('does NOT promise a first campaign — whether the plan can generate one is a separate matter', () => {
      expect(screen.queryByText(/first campaign/i)).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go to my dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard'
      );
      expect(screen.getByRole('link', { name: /see what mitra knows/i })).toHaveAttribute(
        'href',
        '/business'
      );
    });
  });

  it('a draft that is already completed goes straight to the completion screen, never back into questions', async () => {
    loadDraftMock.mockResolvedValue(
      view({ known: {}, status: 'completed', businessId: 'biz-1', revision: 9 })
    );
    render(<ConversationShell uid="u1" />);
    expect(await heading(/mitra knows your business now/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /what should i call you/i })
    ).not.toBeInTheDocument();
  });

  describe('when confirming fails', () => {
    it('explains it in plain words, keeps the review on screen, and loses nothing', async () => {
      confirmMock.mockResolvedValue({
        ok: false,
        reason: 'limit',
        message: 'Your plan includes one business. You already have one set up.',
      });
      loadDraftMock.mockResolvedValue(reviewable());
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await waitFor(() => expect(looksRight()).toBeEnabled());
      await user.click(looksRight());

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /your plan includes one business/i
      );
      expect(
        screen.getByRole('heading', { name: /here's what i've understood/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/mitra knows your business now/i)).not.toBeInTheDocument();
      expect(looksRight()).toBeEnabled(); // they can retry
    });

    it('if the answers changed since the review (another tab), reloads the latest so they review THAT', async () => {
      confirmMock.mockResolvedValueOnce({
        ok: false,
        reason: 'changed',
        message: 'Your answers changed since you looked at them, so please have another look.',
      });
      loadDraftMock
        .mockResolvedValueOnce(reviewable())
        .mockResolvedValue(
          view({ known: { ...ALL, 'identity.city': 'Mumbai' }, status: 'in_progress', revision: 8 })
        );
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await waitFor(() => expect(looksRight()).toBeEnabled());
      await user.click(looksRight());

      expect(await screen.findByRole('alert')).toHaveTextContent(/have another look/i);
      expect(await screen.findByText('Mumbai')).toBeInTheDocument(); // the latest, not the stale view
      expect(loadDraftMock).toHaveBeenCalledTimes(2);
    });

    it('never shows a raw technical error', async () => {
      confirmMock.mockResolvedValue({
        ok: false,
        reason: 'failed',
        message: "I couldn't set that up just now. Nothing is lost. Please try again.",
      });
      loadDraftMock.mockResolvedValue(reviewable());
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await waitFor(() => expect(looksRight()).toBeEnabled());
      await user.click(looksRight());
      expect(await screen.findByRole('alert')).toHaveTextContent(/nothing is lost/i);
      expect(screen.queryByText(/internal|500|functions\//i)).not.toBeInTheDocument();
    });
  });

  describe("Mitra's guesses are never part of the business unless kept", () => {
    const withGuess = () =>
      reviewable({
        known: { ...ALL, 'offering.signature': undefined, 'positioning.usp': 'Small batches' },
        skipped: ['offering.signature'],
        suggestions: { 'offering.signature': ['Diet plans', 'Yoga'] },
      });

    it('lists them apart from the answers, with a clear note that they are not saved', async () => {
      loadDraftMock.mockResolvedValue(withGuess());
      render(<ConversationShell uid="u1" />);
      expect(await screen.findByRole('heading', { name: /mitra's guesses/i })).toBeInTheDocument();
      expect(
        screen.getByText(/i haven't saved these\. they only count if you keep them/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Diet plans, Yoga')).toBeInTheDocument();
    });

    it("keeping one turns it into the owner's own answer", async () => {
      loadDraftMock.mockResolvedValue(withGuess());
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await user.click(await screen.findByRole('button', { name: /keep my guess for known for/i }));

      await waitFor(() =>
        expect(saveDraftMock).toHaveBeenCalledWith(
          expect.objectContaining({ updates: { 'offering.signature': ['Diet plans', 'Yoga'] } }),
          expect.anything()
        )
      );
    });

    it('dropping one hides it, saves nothing, and does not block confirming', async () => {
      loadDraftMock.mockResolvedValue(withGuess());
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await user.click(await screen.findByRole('button', { name: /drop my guess for known for/i }));

      expect(screen.queryByRole('heading', { name: /mitra's guesses/i })).not.toBeInTheDocument();
      expect(saveDraftMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          updates: expect.objectContaining({ 'offering.signature': expect.anything() }),
        }),
        expect.anything()
      );
      await waitFor(() => expect(looksRight()).toBeEnabled());
    });
  });

  describe('changing something', () => {
    it('"I\'d like to change something" offers the parts of the conversation, and opens only that one', async () => {
      loadDraftMock.mockResolvedValue(reviewable());
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await heading(/here's what i've understood/i);

      await user.click(screen.getByRole('button', { name: /i'd like to change something/i }));
      expect(screen.getByText(/what would you like to change/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /my whatsapp number/i }));

      expect(await heading(/what's your whatsapp number/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /what should i call you/i })
      ).not.toBeInTheDocument();
    });

    it('after a change the owner reviews again, and the server is told about the new review', async () => {
      loadDraftMock.mockResolvedValue(reviewable());
      const user = userEvent.setup();
      render(<ConversationShell uid="u1" />);
      await heading(/here's what i've understood/i);
      await user.click(screen.getByRole('button', { name: /change business name/i }));

      const box = await screen.findByRole('textbox');
      await user.clear(box);
      await user.type(box, 'Prana Yoga & Wellness');
      await user.click(screen.getByRole('button', { name: /^continue$/i }));

      expect(await heading(/here's what i've understood/i)).toBeInTheDocument();
      expect(screen.getByText('Prana Yoga & Wellness')).toBeInTheDocument();
      await waitFor(() => {
        const sentReview = saveDraftMock.mock.calls.filter(([p]) => p.reviewShown).length;
        expect(sentReview).toBeGreaterThanOrEqual(2); // once for each time the review appeared
      });
    });
  });
});
