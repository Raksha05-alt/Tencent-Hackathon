'use client';

import { useStore } from '../../lib/store';
import TraceView from '../../components/TraceView';
import ArtifactsPane from '../../components/ArtifactsPane';

export default function RunPage() {
  const { state, startRun, skipToEnd } = useStore();

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Monthly review</h1>
          <p className="mt-1 text-muted">
            Watch the agent plan, call its tools, and reason over what they return. Every outbound item it
            produces waits for your approval — nothing sends itself.
          </p>
        </div>
        <div className="no-print flex gap-2">
          {state.phase === 'running' && (
            <button
              onClick={skipToEnd}
              className="rounded-md border border-hairline px-4 py-2 text-muted hover:text-ink"
            >
              Skip to end
            </button>
          )}
          <button
            onClick={startRun}
            disabled={state.phase === 'running'}
            className="rounded-md bg-jade px-5 py-2 font-semibold text-white hover:bg-jade-deep disabled:opacity-50"
          >
            {state.phase === 'done' ? 'Run again' : state.phase === 'running' ? 'Running…' : 'Run this month’s review'}
          </button>
        </div>
      </header>

      {state.phase === 'idle' ? (
        <div className="rounded-lg border border-dashed border-hairline bg-surface/50 p-16 text-center">
          <p className="font-display text-xl font-semibold">Ready when you are</p>
          <p className="mx-auto mt-2 max-w-md text-muted">
            The agent will review all 45 members’ attendance, investigate anything unusual, draft the
            responses, and propose August’s calendar — with its full reasoning on show.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
          <section aria-label="Agent trace" className="min-w-0">
            <TraceView />
          </section>
          <section aria-label="Artifacts" className="min-w-0">
            <ArtifactsPane />
          </section>
        </div>
      )}
    </div>
  );
}
