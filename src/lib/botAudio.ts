const SOUND_ENABLED_KEY = "yazzy.soundEnabled.v1";
const DEMON_TRACKS = {
  game: "/audio/demon-game.mp3",
  win: "/audio/demon-win.mp3",
  loss: "/audio/demon-loss.mp3",
} as const;

type DemonTrack = keyof typeof DEMON_TRACKS;

export type BotSoundEffect =
  | "button"
  | "dice"
  | "hold"
  | "botHold"
  | "release"
  | "score"
  | "bot"
  | "win"
  | "loss"
  | "tie";

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export function readSoundEnabled() {
  try {
    return window.localStorage.getItem(SOUND_ENABLED_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeSoundEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "on" : "off");
  } catch {}
}

class BotAudioEngine {
  private context: AudioContext | null = null;
  private masterOutput: AudioNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicBar = 0;
  private nextMusicBarAt = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private demonAudio: HTMLAudioElement | null = null;
  private demonTrack: DemonTrack | null = null;
  private demonFadeTimer: number | null = null;
  private wantsMusic = false;
  private isUnlockingMusic = false;
  private enabled = false;
  private unlockListenersAttached = false;

  constructor() {
    this.setupUnlockListeners();
  }

  setupUnlockListeners() {
    if (typeof window === "undefined" || this.unlockListenersAttached) return;
    this.unlockListenersAttached = true;
    const events = ["pointerdown", "touchstart", "click", "keydown"] as const;
    const unlockHandler = () => {
      this.unlock();
      const ctx = this.context;
      if (ctx && ctx.state === "running") {
        events.forEach((evt) => {
          window.removeEventListener(evt, unlockHandler, true);
        });
        this.unlockListenersAttached = false;
      }
    };
    events.forEach((evt) => {
      window.addEventListener(evt, unlockHandler, { capture: true, passive: true });
    });

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          if (this.context && this.context.state === "suspended" && this.wantsMusic) {
            void this.context.resume().catch(() => {});
          }
        }
      });
    }
  }

  unlock() {
    if (typeof window === "undefined") return;
    const context = this.getContext();
    if (!context) return;

    if (context.state === "suspended") {
      void context.resume().then(() => {
        if (this.wantsMusic && this.enabled && (this.musicGain === null || this.musicTimer === null)) {
          this.startMusic(this.demonTrack !== null);
        }
      }).catch(() => {});
    }

    try {
      const buffer = context.createBuffer(1, 1, context.sampleRate || 44100);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    } catch {}

    if (this.demonAudio && this.demonAudio.paused && this.wantsMusic) {
      void this.demonAudio.play().catch(() => {});
    }

    if (this.wantsMusic && this.enabled && (this.musicGain === null || this.musicTimer === null) && context.state === "running") {
      this.startMusic(this.demonTrack !== null);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    writeSoundEnabled(enabled);
    if (!enabled) {
      this.stopMusic(0.08);
    } else {
      this.unlock();
      if (this.wantsMusic && (this.musicGain === null || this.musicTimer === null)) {
        this.startMusic(this.demonTrack !== null);
      }
    }
  }

  syncPreference() {
    this.enabled = readSoundEnabled();
    return this.enabled;
  }

  startGame(demonTheme = false) {
    if (!this.enabled) return;
    this.unlock();
    this.playEffect("button");
    this.startMusic(demonTheme);
  }

  startMusic(demonTheme = false) {
    this.wantsMusic = true;
    if (demonTheme) {
      this.startDemonTrack("game");
      return;
    }
    this.stopDemonTrack(0.18);
    if (!this.enabled) return;

    // Si la musique procédurale tourne déjà activement, on la préserve sans coupure
    if (this.musicGain !== null && this.musicTimer !== null) {
      return;
    }

    const context = this.getContext();
    if (!context) return;
    if (context.state !== "running") {
      this.isUnlockingMusic = true;
      void context.resume().then(() => {
        this.isUnlockingMusic = false;
        if (this.wantsMusic && this.enabled && (this.musicGain === null || this.musicTimer === null)) {
          this.startMusic(false);
        }
      }).catch(() => {
        this.isUnlockingMusic = false;
      });
      return;
    }

    this.isUnlockingMusic = false;
    try {
      if (this.musicTimer !== null) {
        window.clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
      if (this.musicGain !== null) {
        try {
          this.musicGain.disconnect();
        } catch {}
        this.musicGain = null;
      }
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.38, context.currentTime + 0.8);
      gain.connect(this.getMasterOutput());
      this.musicGain = gain;
      this.musicBar = 0;
      this.nextMusicBarAt = context.currentTime + 0.05;
      this.runMusicScheduler();
    } catch {
      this.musicGain = null;
    }
  }

  stopMusic(fadeSeconds = 0.35) {
    this.wantsMusic = false;
    this.stopDemonTrack(fadeSeconds);
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    const context = this.context;
    const gain = this.musicGain;
    this.musicGain = null;
    if (!context || !gain) return;
    try {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
      window.setTimeout(() => {
        try {
          gain.disconnect();
        } catch {}
      }, Math.ceil(fadeSeconds * 1_000) + 40);
    } catch {}
  }

  playDemonResult(outcome: "win" | "loss") {
    if (!this.enabled) return;
    this.unlock();
    this.wantsMusic = false;
    this.stopProceduralMusic(0.18);
    this.startDemonTrack(outcome);
  }

  playEffect(effect: BotSoundEffect) {
    if (!this.enabled) return;
    this.unlock();
    const context = this.getContext();
    if (!context) return;

    try {
      const now = context.currentTime;
      switch (effect) {
        case "button":
          this.materialClick(now, 0.065, 720);
          break;
        case "hold":
          this.materialClick(now, 0.12, 860);
          break;
        case "botHold":
          this.materialClick(now, 0.06, 620);
          break;
        case "release":
          this.materialClick(now, 0.09, 540);
          break;
        case "score":
          this.noise(0.14, 0.05, now, 1_300, 0.45);
          this.materialClick(now + 0.07, 0.07, 560);
          break;
        case "bot":
          this.materialClick(now, 0.07, 310);
          this.noise(0.09, 0.05, now, 190, 0.55, null, "lowpass");
          break;
        case "dice":
          // Roulement feutré doux et chaleureux
          this.noise(0.42, 0.075, now, 380, 0.85, null, "bandpass");
          this.noise(0.28, 0.045, now + 0.05, 580, 0.65, null, "bandpass");
          // Cascade de cliquetis marbrés joyeux et physiques (collisions de dés)
          [
            { t: 0.015, f: 1420, v: 0.14, d: 0.034 },
            { t: 0.058, f: 1840, v: 0.16, d: 0.030 },
            { t: 0.112, f: 1260, v: 0.13, d: 0.038 },
            { t: 0.168, f: 2020, v: 0.15, d: 0.028 },
            { t: 0.224, f: 1510, v: 0.12, d: 0.036 },
            { t: 0.285, f: 1680, v: 0.11, d: 0.040 },
          ].forEach((c) => {
            this.diceClack(now + c.t, c.f, c.v, c.d);
            this.materialClick(now + c.t, c.v * 0.45, c.f * 0.7);
          });
          break;
        case "win":
          this.noise(0.44, 0.08, now, 1_700, 0.35, null, "highpass");
          this.noise(0.28, 0.06, now + 0.06, 430, 0.4, null, "lowpass");
          break;
        case "loss":
          this.noise(0.34, 0.07, now, 310, 0.38, null, "lowpass");
          this.noise(0.2, 0.04, now + 0.09, 1_100, 0.35, null, "highpass");
          break;
        case "tie":
          this.materialClick(now, 0.08, 520);
          this.materialClick(now + 0.15, 0.08, 520);
          break;
      }
    } catch {
      // Le son reste optionnel : une panne Web Audio ne doit jamais bloquer la partie.
    }
  }

  playBotRollSequence(rollCount: number) {
    if (!this.enabled || rollCount <= 0) return;
    this.unlock();
    const context = this.getContext();
    if (!context) return;

    try {
      const count = Math.min(3, rollCount);
      const now = context.currentTime;
      const duration = 0.12 + count * 0.075;
      this.noise(duration, 0.055, now, 420, 0.75, null, "bandpass");
      for (let index = 0; index < count + 1; index += 1) {
        const offset = 0.025 + index * ((duration - 0.045) / count);
        const freq = 1350 + (index % 3) * 280;
        this.diceClack(now + offset, freq, 0.12, 0.030);
        this.materialClick(now + offset, 0.055, freq * 0.7);
      }
    } catch {}
  }

  playDiceClack(freq?: number) {
    if (!this.enabled) return;
    this.unlock();
    const context = this.getContext();
    if (!context) return;

    try {
      const now = context.currentTime;
      const f = freq ?? (1350 + Math.random() * 550);
      this.diceClack(now, f, 0.15, 0.034);
      this.materialClick(now, 0.07, f * 0.7);
    } catch {}
  }

  private getContext() {
    if (typeof window === "undefined") return null;
    if (!this.context) {
      const Context = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Context) return null;
      try {
        this.context = new Context();
      } catch {
        return null;
      }
    }
    return this.context;
  }

  private startDemonTrack(track: DemonTrack) {
    if (!this.enabled || typeof Audio === "undefined") return;
    if (this.demonAudio && this.demonTrack === track && !this.demonAudio.paused) return;
    this.stopProceduralMusic(0.18);
    this.stopDemonTrack(0.12);

    const audio = new Audio(DEMON_TRACKS[track]);
    const targetVolume = track === "game" ? 0.55 : 0.6;
    audio.loop = track === "game";
    audio.preload = "auto";
    audio.volume = 0.01;
    this.demonAudio = audio;
    this.demonTrack = track;
    audio.addEventListener("ended", () => {
      if (this.demonAudio === audio) {
        this.demonAudio = null;
        this.demonTrack = null;
      }
    }, { once: true });
    void audio.play().then(() => {
      if (this.demonAudio !== audio) return;
      const startedAt = performance.now();
      this.demonFadeTimer = window.setInterval(() => {
        if (this.demonAudio !== audio) return;
        const progress = Math.min(1, (performance.now() - startedAt) / 500);
        audio.volume = 0.01 + (targetVolume - 0.01) * progress;
        if (progress >= 1 && this.demonFadeTimer !== null) {
          window.clearInterval(this.demonFadeTimer);
          this.demonFadeTimer = null;
        }
      }, 30);
    }).catch(() => {});
  }

  private stopDemonTrack(fadeSeconds: number) {
    if (this.demonFadeTimer !== null) {
      window.clearInterval(this.demonFadeTimer);
      this.demonFadeTimer = null;
    }
    const audio = this.demonAudio;
    this.demonAudio = null;
    this.demonTrack = null;
    if (!audio) return;
    if (fadeSeconds <= 0 || audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    const initialVolume = Math.max(0.01, audio.volume);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / (fadeSeconds * 1_000));
      audio.volume = Math.max(0, initialVolume * (1 - progress));
      if (progress >= 1) {
        window.clearInterval(timer);
        audio.pause();
        audio.currentTime = 0;
      }
    }, 30);
  }

  private stopProceduralMusic(fadeSeconds: number) {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    const context = this.context;
    const gain = this.musicGain;
    this.musicGain = null;
    if (!context || !gain) return;
    try {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
      window.setTimeout(() => {
        try {
          gain.disconnect();
        } catch {}
      }, Math.ceil(fadeSeconds * 1_000) + 40);
    } catch {}
  }

  private getMasterOutput() {
    const context = this.context;
    if (!context) throw new Error("Audio context unavailable");
    if (!this.masterOutput) {
      const compressor = context.createDynamicsCompressor();
      const gain = context.createGain();
      compressor.threshold.value = -16;
      compressor.knee.value = 12;
      compressor.ratio.value = 3.5;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.16;
      gain.gain.value = 0.95;
      compressor.connect(gain);
      gain.connect(context.destination);
      this.masterOutput = compressor;
    }
    return this.masterOutput;
  }

  private musicVoice(
    frequency: number,
    duration: number,
    volume: number,
    startAt: number,
    output: AudioNode,
    type: OscillatorType,
    cutoff: number,
    attack = 0.018,
  ) {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.detune.setValueAtTime(type === "sawtooth" ? -5 : 3, startAt);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, startAt);
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + attack);
    gain.gain.setValueAtTime(volume, startAt + Math.max(attack, duration * 0.58));
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  }

  private materialClick(startAt: number, volume: number, frequency: number) {
    this.noise(0.026, volume, startAt, Math.max(520, frequency), 0.35, null, "highpass");
    this.noise(0.042, volume * 0.52, startAt, 260, 0.38, null, "lowpass");
  }

  private diceClack(startAt: number, freq: number, volume = 0.14, decay = 0.036) {
    const context = this.context;
    if (!context) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 1.55, startAt);
      osc.frequency.exponentialRampToValueAtTime(freq, startAt + decay * 0.42);

      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = 3.2;

      gain.gain.setValueAtTime(volume, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + decay);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getMasterOutput());

      osc.start(startAt);
      osc.stop(startAt + decay + 0.015);
    } catch {}
  }

  private noise(
    duration: number,
    volume: number,
    startAt: number,
    frequency = 720,
    resonance = 0.7,
    output: AudioNode | null = null,
    filterType: BiquadFilterType = "bandpass",
  ) {
    const context = this.context;
    if (!context) return;
    if (!this.noiseBuffer) {
      this.noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const channel = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = resonance;
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(output ?? this.getMasterOutput());
    source.start(startAt, Math.random() * 0.45, duration);
  }

  private runMusicScheduler() {
    const context = this.context;
    if (!context || !this.wantsMusic || !this.enabled) return;
    try {
      if (this.nextMusicBarAt < context.currentTime - 0.1) {
        const skippedBars = Math.floor((context.currentTime - this.nextMusicBarAt) / 3.84) + 1;
        this.nextMusicBarAt += skippedBars * 3.84;
        this.musicBar += skippedBars;
      }
      while (this.nextMusicBarAt < context.currentTime + 0.22) {
        this.scheduleMusicBar(this.nextMusicBarAt);
        this.nextMusicBarAt += 3.84;
      }
      this.musicTimer = window.setTimeout(() => this.runMusicScheduler(), 80);
    } catch {
      this.stopMusic(0);
    }
  }

  private scheduleMusicBar(barStart: number) {
    const context = this.context;
    const output = this.musicGain;
    if (!context || !output || !this.enabled) return;
    const motifs: Array<Array<number | null>> = [
      [294, null, 349, 440, null, 392, 349, null, 294, 349, null, 523, 440, null, 392, 349],
      [294, 349, null, 440, 523, null, 440, 392, null, 349, 392, null, 466, 440, 349, null],
      [262, null, 349, 392, null, 466, 440, null, 349, 294, null, 392, 523, null, 466, 392],
      [294, null, 392, null, 440, 523, null, 587, 523, null, 440, 392, 349, null, 262, null],
      [349, 392, 440, null, 523, null, 587, 523, null, 466, 440, 392, null, 349, 294, null],
      [392, null, 466, 587, 523, null, 466, 440, 392, null, 523, 698, null, 587, 523, 466],
      [440, 523, null, 659, 587, 523, null, 466, 440, null, 392, 466, 523, null, 392, 349],
      [294, null, 349, 392, 440, null, 523, 587, null, 523, 440, 392, 349, 294, 262, null],
      [311, null, 392, 466, null, 415, 349, 311, null, 466, 554, null, 523, 415, 392, null],
      [349, 415, null, 523, 622, null, 554, 466, 415, null, 349, 392, null, 523, 466, 415],
      [392, null, 466, 554, 622, 554, null, 466, 415, 392, null, 523, 698, 622, 554, null],
      [466, 415, 392, null, 554, 523, null, 415, 349, null, 466, 622, 554, null, 415, 392],
    ];
    const progression = [
      { motif: 0, chord: [147, 175, 220], intensity: 0.68, phase: "intro" },
      { motif: 1, chord: [131, 165, 196], intensity: 0.74, phase: "intro" },
      { motif: 2, chord: [117, 147, 175], intensity: 0.8, phase: "build" },
      { motif: 3, chord: [147, 185, 220], intensity: 0.86, phase: "build" },
      { motif: 4, chord: [147, 175, 220], intensity: 0.9, phase: "groove" },
      { motif: 5, chord: [165, 196, 247], intensity: 0.94, phase: "groove" },
      { motif: 1, chord: [131, 165, 196], intensity: 0.9, phase: "groove" },
      { motif: 6, chord: [175, 220, 262], intensity: 1, phase: "peak" },
      { motif: 5, chord: [196, 233, 294], intensity: 1.08, phase: "peak" },
      { motif: 6, chord: [175, 220, 262], intensity: 1.12, phase: "peak" },
      { motif: 4, chord: [165, 196, 247], intensity: 1.04, phase: "groove" },
      { motif: 7, chord: [147, 185, 220], intensity: 1.14, phase: "peak" },
      { motif: 3, chord: [131, 165, 196], intensity: 0.76, phase: "break" },
      { motif: 2, chord: [117, 147, 175], intensity: 0.86, phase: "build" },
      { motif: 7, chord: [147, 175, 220], intensity: 0.94, phase: "groove" },
      { motif: 0, chord: [147, 185, 220], intensity: 1.02, phase: "peak" },
      { motif: 8, chord: [139, 175, 208], intensity: 0.88, phase: "build" },
      { motif: 9, chord: [147, 185, 233], intensity: 0.98, phase: "groove" },
      { motif: 10, chord: [155, 196, 233], intensity: 1.12, phase: "peak" },
      { motif: 11, chord: [131, 165, 208], intensity: 1.16, phase: "peak" },
      { motif: 2, chord: [117, 147, 175], intensity: 0.72, phase: "break" },
      { motif: 8, chord: [139, 175, 208], intensity: 0.9, phase: "build" },
      { motif: 10, chord: [147, 185, 233], intensity: 1.04, phase: "groove" },
      { motif: 11, chord: [139, 175, 220], intensity: 1.14, phase: "peak" },
      { motif: 4, chord: [147, 175, 220], intensity: 0.82, phase: "break" },
      { motif: 8, chord: [139, 175, 208], intensity: 0.92, phase: "build" },
      { motif: 9, chord: [155, 196, 247], intensity: 1.02, phase: "groove" },
      { motif: 5, chord: [165, 208, 262], intensity: 1.1, phase: "peak" },
      { motif: 10, chord: [147, 185, 233], intensity: 1.16, phase: "peak" },
      { motif: 6, chord: [131, 165, 208], intensity: 1.06, phase: "groove" },
      { motif: 11, chord: [139, 175, 220], intensity: 1.18, phase: "peak" },
      { motif: 7, chord: [139, 175, 208], intensity: 0.88, phase: "build" },
    ];
    const section = progression[this.musicBar % progression.length];
    const notes = motifs[section.motif];
    const intensity = section.intensity;
    const isIntro = section.phase === "intro";
    const isBreak = section.phase === "break";
    const isPeak = section.phase === "peak";
    section.chord.forEach((frequency, index) => {
      this.musicVoice(frequency, 3.72, 0.08 * intensity, barStart, output, "sawtooth", 750 + index * 110, 0.25);
    });

    notes.forEach((frequency, index) => {
      const start = barStart + index * 0.24;
      if (frequency && (!isBreak || index % 4 === 0)) {
        this.musicVoice(frequency, 0.20, (index % 4 === 0 ? 0.24 : 0.17) * intensity, start, output, "triangle", 1_950);
      }
      if (!isIntro && !isBreak && index % 2 === 0) {
        const arpeggioNote = section.chord[(index / 2) % section.chord.length] * 2;
        this.musicVoice(arpeggioNote, 0.14, 0.09 * intensity, start + 0.12, output, "sine", 1_450);
      }
      if (index % (isIntro || isBreak ? 8 : 4) === 0) {
        const bass = section.chord[index === 12 ? 1 : 0];
        this.musicVoice(bass, 0.34, 0.22 * intensity, start, output, "triangle", 540);
        this.noise(0.06, 0.07 * intensity, start, index % 8 === 0 ? 160 : 1_650, 0.75, output);
      } else if (!isIntro && !isBreak && index % 4 === 2) {
        this.noise(0.048, 0.045 * intensity, start, 2_400, 1, output);
      } else if (isPeak && (index === 3 || index === 7 || index === 11 || index === 15)) {
        this.noise(0.03, 0.035 * intensity, start, 3_600, 1.25, output);
      }
    });
    this.musicBar += 1;
  }
}

export const botAudio = new BotAudioEngine();
