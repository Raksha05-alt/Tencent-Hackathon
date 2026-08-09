'use client';

import { useState } from 'react';
import type { Language } from '../types';
import { getPhoneticData } from '../lib/audio';

interface PhoneticGuideProps {
  language: Language;
}

export default function PhoneticGuide({ language }: PhoneticGuideProps) {
  const [open, setOpen] = useState(false);
  const data = getPhoneticData(language);

  return (
    <div className="mt-2.5 rounded-md border border-hairline bg-paper text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <span>🗣️</span>
          <span>{language} Dialect &amp; Phonetic Cheat Sheet</span>
        </span>
        <span className="text-xs text-muted">{open ? 'Hide ▲' : 'Show Phonetics ▼'}</span>
      </button>

      {open && (
        <div className="border-t border-hairline p-3 space-y-2.5 bg-surface/50">
          <div>
            <span className="block text-xs font-semibold text-muted mb-1">
              Phonetic Read-Aloud Transcript:
            </span>
            <p className="rounded bg-paper p-2 font-mono text-xs text-ink leading-relaxed border border-hairline">
              {data.phoneticScript}
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-muted mb-1">
              Dialect Rapport &amp; Tone Guidance:
            </span>
            <ul className="list-disc list-inside text-xs text-muted space-y-1 pl-1">
              {data.dialectNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
