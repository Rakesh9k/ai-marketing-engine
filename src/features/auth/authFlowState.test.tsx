import { act, renderHook } from '@testing-library/react';
import { beginAuthFlow, useAuthFlowBusy } from './authFlowState';

describe('authFlowState', () => {
  it('is busy between begin and release, and release is idempotent', () => {
    const { result } = renderHook(() => useAuthFlowBusy());
    expect(result.current).toBe(false);

    let release!: () => void;
    act(() => {
      release = beginAuthFlow();
    });
    expect(result.current).toBe(true);

    act(() => release());
    expect(result.current).toBe(false);

    act(() => release()); // double release must not go negative or flip other flows
    expect(result.current).toBe(false);
  });

  it('stays busy until every overlapping flow has finished', () => {
    const { result } = renderHook(() => useAuthFlowBusy());
    let a!: () => void;
    let b!: () => void;
    act(() => {
      a = beginAuthFlow();
      b = beginAuthFlow();
    });
    act(() => a());
    expect(result.current).toBe(true);
    act(() => b());
    expect(result.current).toBe(false);
  });
});
