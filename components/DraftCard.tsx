'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { OutreachDraft } from '../types';
import { memberById } from '../lib/data';
import { useStore } from '../lib/store';
import Avatar from './Avatar';

import VoiceNotePlayer from './VoiceNotePlayer';
import PhoneticGuide from './PhoneticGuide';

const CHANNEL_LABEL = { whatsapp: 'WhatsApp', phone: 'Phone call', sms: 'SMS' } as const;

export default function DraftCard({ draft }: { draft: OutreachDraft }) {
  const { setDraftStatus } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.body);
  const member = memberById(draft.memberId);
  if (!member) return null;

  const settled = draft.status !== 'pending';

  return (
    <article className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
      <header className="mb-3 flex items-center gap-3">
        <Avatar name={member.name} size={36} />
        <div className="min-w-0 flex-1">
          <Link href={`/member/${member.id}`} className="font-display text-lg font-semibold hover:text-jade">
            {member.name}
          </Link>
          <p className="text-sm text-muted">
            {CHANNEL_LABEL[draft.channel]} · {draft.language}
            {draft.channel === 'phone' && ' · talking points'}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
            draft.status === 'pending'
              ? 'bg-amber-soft text-amber'
              : draft.status === 'declined'
                ? 'bg-risk-soft text-risk'
                : 'bg-jade-soft text-jade-deep'
          }`}
        >
          {draft.status}
        </span>
      </header>

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-hairline p-3 text-[15px] leading-relaxed"
          aria-label="Edit draft message"
        />
      ) : (
        <p className="whitespace-pre-wrap rounded-md bg-paper p-3 text-[15px] leading-relaxed">{text}</p>
      )}

      {/* Voice Note Waveform Audio Player */}
      {!editing && (
        <VoiceNotePlayer
          text={text}
          language={draft.language}
          channel={draft.channel}
          memberId={draft.memberId}
        />
      )}

      {draft.englishGloss && !editing && (
        <p className="mt-2 border-l-2 border-hairline pl-3 text-[15px] italic leading-relaxed text-muted">
          {draft.englishGloss}
        </p>
      )}

      {/* Phonetic & Dialect Guide */}
      {!editing && <PhoneticGuide language={draft.language} />}

      <p className="mt-3 text-sm text-muted">
        <span className="font-semibold text-ink">Why this framing:</span> {draft.rationale}
      </p>

      <footer className="no-print mt-4 flex gap-2">
        {editing ? (
          <>
            <button
              onClick={() => {
                setDraftStatus(draft.id, 'edited', text);
                setEditing(false);
              }}
              className="rounded-md bg-jade px-4 py-1.5 font-semibold text-white hover:bg-jade-deep"
            >
              Save &amp; approve
            </button>
            <button
              onClick={() => {
                setText(draft.body);
                setEditing(false);
              }}
              className="rounded-md border border-hairline px-4 py-1.5 text-muted hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : settled ? (
          <button
            onClick={() => setDraftStatus(draft.id, 'pending')}
            className="rounded-md border border-hairline px-4 py-1.5 text-sm text-muted hover:text-ink"
          >
            Move back to pending
          </button>
        ) : (
          <>
            <button
              onClick={() => setDraftStatus(draft.id, 'approved')}
              className="rounded-md bg-jade px-4 py-1.5 font-semibold text-white hover:bg-jade-deep"
            >
              Approve
            </button>
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-hairline px-4 py-1.5 hover:bg-paper"
            >
              Edit
            </button>
            <button
              onClick={() => setDraftStatus(draft.id, 'declined')}
              className="rounded-md border border-hairline px-4 py-1.5 text-risk hover:bg-risk-soft"
            >
              Decline
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

