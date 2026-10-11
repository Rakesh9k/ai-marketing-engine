import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QUESTIONS } from '../engine/questions';
import { QuestionField } from './QuestionField';

/**
 * The option buttons carry role="radio", which promises radio-group keyboard behaviour: one tab stop
 * for the whole group and arrow keys to move between options. Choosing an option commits the answer
 * and advances the conversation, so arrows move focus only — they never choose on the owner's behalf.
 */
const role = QUESTIONS.find((q) => q.id === 'owner-role')!;

function setup(value = '') {
  const onChange = jest.fn();
  render(<QuestionField question={role} known={{}} value={value} onChange={onChange} />);
  const radios = screen.getAllByRole('radio');
  return { onChange, radios, user: userEvent.setup() };
}

describe('single-choice options: keyboard', () => {
  it('is one tab stop for the whole group, not one per option', () => {
    const { radios } = setup();
    expect(radios.length).toBeGreaterThan(3);
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);
    expect(radios.filter((r) => r.tabIndex === -1)).toHaveLength(radios.length - 1);
  });

  it('the chosen option is the tab stop when there is one', () => {
    const { radios } = setup('manager');
    const stop = radios.find((r) => r.tabIndex === 0)!;
    expect(stop).toHaveAccessibleName(/manager/i);
  });

  it('arrow keys move focus through the options and wrap, without choosing anything', async () => {
    const { radios, user, onChange } = setup();
    radios[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(radios[1]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(radios[2]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(radios[1]).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(radios[radios.length - 1]).toHaveFocus(); // wrapped backwards
    await user.keyboard('{ArrowRight}');
    expect(radios[0]).toHaveFocus(); // wrapped forwards
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Home and End jump to the first and last option', async () => {
    const { radios, user } = setup();
    radios[2]!.focus();
    await user.keyboard('{End}');
    expect(radios[radios.length - 1]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(radios[0]).toHaveFocus();
  });

  it('Space or Enter on the focused option chooses it', async () => {
    const { radios, user, onChange } = setup();
    radios[1]!.focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![1]).toEqual({ commit: true });
    radios[2]!.focus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
