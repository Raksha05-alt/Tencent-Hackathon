/**
 * Client-side Audio Engine & Speech Synthesizer for SilverOps.
 * Handles dialect voice previews, Web Speech synthesis, Web Audio API tone synthesis,
 * phonetic transcript generation, and optional external API key storage.
 */

import type { Language } from '../types';

export interface PhoneticData {
  phoneticScript: string;
  dialectNotes: string[];
  samplePhrase: string;
}

// Phonetic guides & pronunciation helpers for Singapore active ageing context
const PHONETIC_MAP: Record<string, PhoneticData> = {
  Hokkien: {
    phoneticScript:
      'Ah Kow un-ko, wa si Toa Payoh Active Ageing Centre e Mei. Ho ku bo kua tio li kap Peng-yu liao, ta-ke chin siu-niam lin! Wa-lang pak-suan ka mahjong kai tng-lai Sing-ki-ji e-po...',
    dialectNotes: [
      'Warm, respectful tone: address senior as "An-ko" (Uncle) or "A-so" (Auntie).',
      'Emphasize community group ("ta-ke chin siu-niam lin" - everyone misses you).',
      'Highlight past routine (cards first, lunch together after).',
    ],
    samplePhrase: 'Ah Kow 安哥，我是大巴窑乐龄中心的小美。',
  },
  Malay: {
    phoneticScript:
      'Mak Cik Fatimah, apa khabar? Lama tak jumpa... Kami di Pusat Penuaan Aktif Toa Payoh sentiasa ingatkan Mak Cik. Macam mana keadaan suami Mak Cik sekarang?',
    dialectNotes: [
      'Soft, empathetic tone: start with "Mak Cik" and ask after her husband before mentioning attendance.',
      'Acknowledge caregiving weight gently without pressure.',
      'Offer practical support (cooking session seat reservation, free transport).',
    ],
    samplePhrase: 'Mak Cik Fatimah, apa khabar? Lama tak jumpa.',
  },
  Mandarin: {
    phoneticScript:
      'Mei-lan jie, wo shi le-ling zhong-xin de Xiao-mei. Xing-qi-er de mahjong da-zi san le, da-jia dou shuo bu xi-guan! Wo-men zhun-bei ba mahjong gai hui xing-qi-er...',
    dialectNotes: [
      'Friendly tone: address as "Mei Lan jie" (Sister Mei Lan).',
      'Assure member that spouse drop-off route is aligned with regular schedule.',
    ],
    samplePhrase: '美兰姐，我是乐龄中心的小美。',
  },
  Cantonese: {
    phoneticScript:
      'Ah Wong Cheuk-gan, ngo si Toa Payoh Active Ageing Centre e Mei. Hou noi mou kin dou nei... ngo dei seung gei mai nei da mahjong...',
    dialectNotes: [
      'Respectful Cantonese greeting: "Ah Shook" / "Ah Yi".',
      'Focus on social reconnection.',
    ],
    samplePhrase: '好耐冇見，大家都好諗念你！',
  },
  Tamil: {
    phoneticScript:
      'Vanakkam, Toa Payoh Active Ageing Centre-il irundhu Mei pesugiren. Ungalai paarthu nedunaal aagi vittadhu. Ungal nalan aariya virumbugiren...',
    dialectNotes: [
      'Polite traditional Tamil greeting ("Vanakkam").',
      'Inquire about health & family wellbeing first.',
    ],
    samplePhrase: 'வணக்கம், உங்கள் நலன் அறிய விரும்புகிறேன்.',
  },
  English: {
    phoneticScript:
      'Hello Uncle, this is Mei from Toa Payoh Active Ageing Centre. We missed having you at our weekly activities and just wanted to check in on how you are doing!',
    dialectNotes: [
      'Warm local Singaporean English phrasing.',
      'Reassuring and non-intrusive checking-in tone.',
    ],
    samplePhrase: 'Hello, we missed having you at the center!',
  },
};

export function getPhoneticData(language: Language | string): PhoneticData {
  return (
    PHONETIC_MAP[language] ?? {
      phoneticScript: 'Standard local pronunciation guide.',
      dialectNotes: ['Keep tone warm, patient, and culturally respectful.'],
      samplePhrase: 'Welcome back to the centre!',
    }
  );
}

// Generate deterministic audio waveform bar heights for visualizer UI
export function generateWaveformBars(seedString: string, count = 28): number[] {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const pseudo = Math.abs(Math.sin(hash + i * 1.7) * 100);
    // height percentage between 20% and 95%
    const height = Math.floor(20 + (pseudo % 75));
    bars.push(height);
  }
  return bars;
}

// Web Speech API Voice synthesis helper
export function speakText(
  text: string,
  language: Language | string,
  onEnd?: () => void,
  onError?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    // Fallback: Web Audio synth play
    playSynthesizedVoiceTone(15, onEnd);
    return () => {};
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // Slightly slower pace for clarity

  // Map language to speech synth locale
  const langCodeMap: Record<string, string> = {
    Mandarin: 'zh-CN',
    Hokkien: 'zh-TW',
    Cantonese: 'zh-HK',
    Malay: 'ms-MY',
    Tamil: 'ta-IN',
    English: 'en-SG',
  };

  utterance.lang = langCodeMap[language] || 'en-US';

  // Try to pick appropriate voice if available
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => {
    // If WebSpeech fails, fallback to Web Audio beep sequence
    playSynthesizedVoiceTone(12, onEnd);
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

// Web Audio API Sound Generator for Voice Note Playback
export function playSynthesizedVoiceTone(durationSec = 10, onComplete?: () => void): () => void {
  if (typeof window === 'undefined') {
    onComplete?.();
    return () => {};
  }

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      setTimeout(() => onComplete?.(), durationSec * 1000);
      return () => {};
    }

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + durationSec);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSec);

    const timer = setTimeout(() => {
      ctx.close();
      onComplete?.();
    }, durationSec * 1000);

    return () => {
      clearTimeout(timer);
      try {
        osc.stop();
        ctx.close();
      } catch {
        // ignore
      }
    };
  } catch {
    const timer = setTimeout(() => onComplete?.(), durationSec * 1000);
    return () => clearTimeout(timer);
  }
}

// Optional API Keys storage helpers (OpenAI / ElevenLabs)
const API_KEY_STORAGE_KEY = 'silverops_tts_api_key';

export function getStoredTtsApiKey(): { provider: string; key: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(API_KEY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredTtsApiKey(provider: string, key: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify({ provider, key }));
}
