'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useCallback,
} from 'react';
import type {
  AgentEvent,
  DropOffFinding,
  OutreachDraft,
  CalendarProposal,
  ContributorMatch,
  MonthlyReport,
} from '../types';
import { startReplay, startLive, type ReplayHandle } from './replay';

export interface AppState {
  phase: 'idle' | 'running' | 'done';
  events: AgentEvent[];
  findings: DropOffFinding[];
  drafts: OutreachDraft[];
  calendar: CalendarProposal | null;
  contributor: ContributorMatch | null;
  report: MonthlyReport | null;
  lastRunAt: string | null;
}

const initialState: AppState = {
  phase: 'idle',
  events: [],
  findings: [],
  drafts: [],
  calendar: null,
  contributor: null,
  report: null,
  lastRunAt: null,
};

type Action =
  | { type: 'hydrate'; state: Partial<AppState> }
  | { type: 'run-start' }
  | { type: 'event'; event: AgentEvent }
  | { type: 'draft-status'; id: string; status: OutreachDraft['status']; body?: string }
  | { type: 'reset' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.state };
    case 'run-start':
      return { ...initialState, phase: 'running' };
    case 'event': {
      const e = action.event;
      const next: AppState = { ...state, events: [...state.events, e] };
      if (e.type === 'finding') next.findings = [...state.findings, e.finding];
      if (e.type === 'artifact') {
        if (e.kind === 'outreach') next.drafts = [...state.drafts, e.payload as OutreachDraft];
        if (e.kind === 'calendar') next.calendar = e.payload as CalendarProposal;
        if (e.kind === 'contributor') next.contributor = e.payload as ContributorMatch;
        if (e.kind === 'report') next.report = e.payload as MonthlyReport;
      }
      if (e.type === 'done') {
        next.phase = 'done';
        next.lastRunAt = new Date().toISOString();
      }
      return next;
    }
    case 'draft-status':
      return {
        ...state,
        drafts: state.drafts.map((d) =>
          d.id === action.id
            ? { ...d, status: action.status, ...(action.body ? { body: action.body } : {}) }
            : d
        ),
      };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

const STORAGE_KEY = 'silverops-v1';

interface StoreApi {
  state: AppState;
  startRun: () => void;
  skipToEnd: () => void;
  setDraftStatus: (id: string, status: OutreachDraft['status'], body?: string) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const handleRef = useRef<ReplayHandle | null>(null);

  // Hydrate persisted artifacts (not the trace) so approvals survive navigation.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AppState>;
        if (saved.lastRunAt) dispatch({ type: 'hydrate', state: { ...saved, phase: 'done', events: saved.events ?? [] } });
      }
    } catch {
      /* corrupted storage — start clean */
    }
  }, []);

  // Persist once a run has completed and whenever drafts change afterwards.
  useEffect(() => {
    if (state.phase !== 'done') return;
    const { findings, drafts, calendar, contributor, report, lastRunAt, events } = state;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ findings, drafts, calendar, contributor, report, lastRunAt, events })
    );
  }, [state]);

  const startRun = useCallback(() => {
    handleRef.current?.cancel();
    dispatch({ type: 'run-start' });
    const onEvent = (e: AgentEvent) => dispatch({ type: 'event', event: e });
    handleRef.current =
      process.env.NEXT_PUBLIC_DEMO_MODE === 'live' ? startLive(onEvent) : startReplay(onEvent);
  }, []);

  const skipToEnd = useCallback(() => handleRef.current?.flush(), []);

  const setDraftStatus = useCallback(
    (id: string, status: OutreachDraft['status'], body?: string) =>
      dispatch({ type: 'draft-status', id, status, body }),
    []
  );

  const resetDemo = useCallback(() => {
    handleRef.current?.cancel();
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'reset' });
  }, []);

  useEffect(() => () => handleRef.current?.cancel(), []);

  return (
    <StoreContext.Provider value={{ state, startRun, skipToEnd, setDraftStatus, resetDemo }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}
