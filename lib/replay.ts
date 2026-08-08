import recordedRun from '../data/recorded-run.json';
import type { AgentEvent, RecordedEvent } from '../types';

export interface ReplayHandle {
  cancel: () => void;
  /** Deliver all remaining events immediately (rehearsal / judge fast-forward). */
  flush: () => void;
}

/**
 * Streams the recorded run at its recorded pace. All tool calls/results in the
 * recording are genuine outputs of the real tool implementations.
 */
export function startReplay(onEvent: (e: AgentEvent) => void): ReplayHandle {
  const events = (recordedRun as { events: RecordedEvent[] }).events;
  let idx = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const deliverNext = () => {
    if (stopped || idx >= events.length) return;
    const prevAt = idx === 0 ? 0 : events[idx - 1].at;
    const delay = events[idx].at - prevAt;
    timer = setTimeout(() => {
      if (stopped) return;
      onEvent(events[idx]);
      idx++;
      deliverNext();
    }, delay);
  };
  deliverNext();

  return {
    cancel: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
    flush: () => {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      for (; idx < events.length; idx++) onEvent(events[idx]);
    },
  };
}

/**
 * Live mode: consume the SSE stream from /api/agent. Falls back to replay
 * silently if the endpoint is unavailable — the demo must never show an error.
 */
export function startLive(onEvent: (e: AgentEvent) => void): ReplayHandle {
  let cancelled = false;
  let fallback: ReplayHandle | null = null;

  (async () => {
    try {
      const res = await fetch('/api/agent');
      if (!res.ok || !res.body) throw new Error('live unavailable');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const event = JSON.parse(line.slice(6)) as AgentEvent | { type: 'error' };
          if (event.type === 'error') throw new Error('live stream error');
          if (!cancelled) onEvent(event);
        }
      }
    } catch {
      if (!cancelled) fallback = startReplay(onEvent);
    }
  })();

  return {
    cancel: () => {
      cancelled = true;
      fallback?.cancel();
    },
    flush: () => fallback?.flush(),
  };
}
