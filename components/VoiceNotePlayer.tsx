'use client';

import { useState, useEffect, useRef } from 'react';
import type { Language } from '../types';
import { generateWaveformBars, speakText, playSynthesizedVoiceTone } from '../lib/audio';

interface VoiceNotePlayerProps {
  text: string;
  language: Language;
  channel: 'whatsapp' | 'phone' | 'sms';
  memberId: string;
}

export default function VoiceNotePlayer({
  text,
  language,
  channel,
  memberId,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const stopAudioRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const durationSec = Math.max(8, Math.min(30, Math.ceil(text.length / 15)));
  const waveform = generateWaveformBars(`${memberId}-${language}-${text.length}`, 30);

  const handleStop = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
  };

  const handlePlay = () => {
    if (isPlaying) {
      handleStop();
      return;
    }

    setIsPlaying(true);
    setProgress(0);

    const startTime = Date.now();
    const totalMs = durationSec * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / totalMs) * 100));
      setProgress(pct);
      if (pct >= 100) {
        handleStop();
      }
    }, 100);

    // Trigger WebSpeech API or audio tone synth
    const cancelFn = speakText(
      text,
      language,
      () => handleStop(),
      () => {
        // Fallback tone synth
        stopAudioRef.current = playSynthesizedVoiceTone(durationSec, () => handleStop());
      }
    );

    stopAudioRef.current = cancelFn;
  };

  useEffect(() => {
    return () => {
      handleStop();
    };
  }, []);

  const currentSec = Math.floor((progress / 100) * durationSec);
  const formatTime = (sec: number) =>
    `0:${sec < 10 ? '0' : ''}${sec}`;

  return (
    <div className="my-3 rounded-lg border border-hairline bg-paper p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-jade-soft px-2 py-0.5 text-xs font-semibold text-jade-deep">
            <span>🎙️</span>
            <span>{language} Voice Note Preview</span>
          </span>
          <span className="text-xs text-muted">
            {channel === 'phone' ? 'Phone talking points preview' : 'WhatsApp voice message'}
          </span>
        </div>
        <span className="font-mono text-xs text-muted">
          {formatTime(currentSec)} / {formatTime(durationSec)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlay}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white transition-transform active:scale-95 ${
            isPlaying ? 'bg-amber hover:bg-amber-600' : 'bg-jade hover:bg-jade-deep'
          }`}
          title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
        >
          {isPlaying ? (
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Waveform Visualization Bars */}
        <div
          className="flex h-8 flex-1 items-center gap-1 cursor-pointer overflow-hidden px-1"
          onClick={handlePlay}
          title="Click to toggle audio preview"
        >
          {waveform.map((heightPct, idx) => {
            const barPct = (idx / waveform.length) * 100;
            const isPassed = barPct <= progress;
            return (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isPassed
                    ? isPlaying
                      ? 'bg-jade animate-pulse'
                      : 'bg-jade'
                    : 'bg-stone-300 dark:bg-stone-700'
                }`}
                style={{
                  height: `${heightPct}%`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
