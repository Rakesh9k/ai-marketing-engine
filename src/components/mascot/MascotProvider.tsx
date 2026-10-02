'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { MascotState } from './mascotStates';

interface MascotContextType {
  state: MascotState;
  setState: (state: MascotState) => void;
  resetState: () => void;
}

const MascotContext = createContext<MascotContextType | undefined>(undefined);

export function MascotProvider({
  children,
  initialState = 'idle',
}: {
  children: ReactNode;
  initialState?: MascotState;
}) {
  const [state, setMascotState] = useState<MascotState>(initialState);

  const setState = useCallback((newState: MascotState) => {
    setMascotState(newState);
  }, []);

  const resetState = useCallback(() => {
    setMascotState(initialState);
  }, [initialState]);

  return (
    <MascotContext.Provider value={{ state, setState, resetState }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  const context = useContext(MascotContext);
  if (!context) {
    // Return fallback state if used outside provider so components don't crash
    return {
      state: 'idle' as MascotState,
      setState: () => {},
      resetState: () => {},
    };
  }
  return context;
}
