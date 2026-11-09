/**
 * Audio helpers for EFA EDO
 * Provides Voice Read-Aloud (Text-to-Speech) for illiterate artisans/clients,
 * Speech Recognition for voice searches ("Dis ce que tu cherches..."),
 * and Web Audio sound effects (incoming calls, confirmations).
 */

class SoundEffects {
  private ctx: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringInterval: number | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playClick() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  playHammerToc() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Transient physical thud (body of hammer)
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(220, now);
      thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      thudGain.gain.setValueAtTime(0.45, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(now);
      thudOsc.stop(now + 0.09);

      // 2. Sharp "TOC" strike on metal nail
      const tocOsc = ctx.createOscillator();
      const tocGain = ctx.createGain();
      tocOsc.type = 'sine';
      tocOsc.frequency.setValueAtTime(1250, now);
      tocOsc.frequency.exponentialRampToValueAtTime(550, now + 0.12);
      tocGain.gain.setValueAtTime(0.35, now);
      tocGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      tocOsc.connect(tocGain);
      tocGain.connect(ctx.destination);
      tocOsc.start(now);
      tocOsc.stop(now + 0.14);

      // 3. Subtle nail ring resonance
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(2800, now);
      ringGain.gain.setValueAtTime(0.12, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      ringOsc.connect(ringGain);
      ringGain.connect(ctx.destination);
      ringOsc.start(now);
      ringOsc.stop(now + 0.16);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  playSuccess() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  startPhoneRingtone() {
    this.stopPhoneRingtone();
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const playBurst = () => {
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.setValueAtTime(0.2, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.4);
        osc2.stop(now + 1.4);
      };

      playBurst();
      this.ringInterval = window.setInterval(playBurst, 2600);
    } catch {
      // fallback
    }
  }

  stopPhoneRingtone() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringOscillator) {
      try {
        this.ringOscillator.stop();
      } catch {
        // ignore
      }
      this.ringOscillator = null;
    }
  }
}

export const sounds = new SoundEffects();

let isGlobalAudioMuted = false;

export function setAudioMuted(muted: boolean) {
  isGlobalAudioMuted = muted;
  if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isAudioMuted(): boolean {
  return isGlobalAudioMuted;
}

export function toggleAudioMute(): boolean {
  setAudioMuted(!isGlobalAudioMuted);
  return isGlobalAudioMuted;
}

/**
 * Text-to-Speech: Speaks out loud in clear, natural French (Togo friendly, short phrases, human rhythm)
 */
export function speakAloud(text: string, onEnd?: () => void) {
  if (isGlobalAudioMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop prior speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';

    // Sélection d'une voix naturelle et chaleureuse si disponible
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferredVoice =
        voices.find((v) => v.lang.startsWith('fr') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))) ||
        voices.find((v) => v.lang.startsWith('fr'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    // Rythme humain naturel : pauses courtes et intonation vivante
    utterance.rate = 0.98;
    utterance.pitch = 1.05;

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    if (onEnd) onEnd();
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speech Recognition for "Dis ce que tu cherches..."
 */
export function startVoiceRecognition(
  onResult: (text: string) => void,
  onError?: (err: string) => void
): () => void {
  const SpeechRecognition =
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError("Reconnaissance vocale non supportée sur ce navigateur.");
    return () => {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognition = new (SpeechRecognition as any)();
  recognition.lang = 'fr-FR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
    sounds.playSuccess();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    if (onError) onError(event.error || "Erreur micro");
  };

  recognition.start();

  return () => {
    try {
      recognition.stop();
    } catch {
      // ignore
    }
  };
}
