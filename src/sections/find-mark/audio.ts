// Afternoon sounds, made on the fly with the Web Audio API (no sound files): a breeze and the hum of
// the town, birdsong, the fountain splashing louder as you get near, footsteps, a jeepney's horn,
// and a little tune when you find Mark.

/** A recording of St. Anne's bell, if one has been added to public/ (otherwise the bell is synthesised). */
const BELL_FILE = "/church-bell.mp3";
/** Seconds between strokes in that recording (they land at about 0.1, 6.05, 11.9 and 18.6 s). */
const BELL_FILE_GAP = 5.9;
/** The marching band's tune (public/viva.mp3). If it can't play, the band plays a drum cadence and an
 * oom-pah bass made here instead. */
const BAND_FILE = "/viva.mp3";
/** Where the music in that file starts and ends (it has 2.2 s of silence before and 1.4 s after). */
const BAND_START = 2.15;
const BAND_END = 114.25;
/** Seconds between strokes of the synthesised bell. */
const BELL_SYNTH_GAP = 2.4;

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private water: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private birdTimer = 0;
  private muted = false;
  private song: HTMLAudioElement | null = null;
  private bellsUntil = 0;
  private bellFile: HTMLAudioElement | null = null;
  private bellStop = 0;
  private songFade = 0;
  private band: HTMLAudioElement | null = null;
  private bandOn = false;
  private bandLevel = 0;
  private bandSynth: { out: GainNode; timer: number; next: number; beat: number } | null = null;
  /** wakes the sound back up after the phone paused it (see `start`) */
  private wake: (() => void) | null = null;
  private unwake: (() => void) | null = null;

  /** Starts the sound (must be called from a click or key press). */
  start() {
    if (this.ctx) {
      this.wake?.();
      return;
    }
    // iPhones play Web Audio as "ambient" sound, which the ring/silent switch mutes (while the mp3s
    // still play). Asking for "playback" makes the breeze and the birds play like the songs do.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    // Phones suspend the sound when the screen locks, the tab is hidden or a call comes in, and don't
    // start it again by themselves: resume on coming back, and on the next tap if that wasn't enough.
    const wake = () => {
      if (ctx.state !== "running" && ctx.state !== "closed") ctx.resume().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") wake();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("touchend", wake);
    window.addEventListener("keydown", wake);
    this.wake = wake;
    this.unwake = () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("touchend", wake);
      window.removeEventListener("keydown", wake);
    };
    wake();

    // a few seconds of soft pink noise, looped, for the breeze and the water
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    }
    this.noise = buf;

    // the breeze, swelling and easing
    const wind = this.loop(buf);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.22;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(windGain.gain);
    wind.connect(lp).connect(windGain).connect(this.master);
    lfo.start();

    // splashing water, loud only near a fountain
    const splash = this.loop(buf);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.6;
    this.water = ctx.createGain();
    this.water.gain.value = 0;
    splash.connect(bp).connect(this.water).connect(this.master);
  }

  private loop(buf: AudioBuffer) {
    const src = this.ctx!.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.loopStart = Math.random();
    src.start(0, Math.random() * 3);
    return src;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.song) this.song.muted = m;
    if (this.bellFile) this.bellFile.muted = m;
    if (this.band) this.band.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.1);
  }

  /** Each frame: fountain loudness from the distance to the nearest one, and the odd bird. */
  update(dt: number, fountainDistance: number) {
    if (!this.ctx || !this.water || this.ctx.state !== "running") return;
    const g = Math.max(0, 1 - fountainDistance / 22) ** 2 * 0.9;
    this.water.gain.setTargetAtTime(g, this.ctx.currentTime, 0.2);
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birdTimer = 2 + Math.random() * 6;
      this.bird();
    }
  }

  private bird() {
    const ctx = this.ctx!;
    // a bird off to one side (older Safari has no stereo panner: then straight ahead)
    let pan: AudioNode = this.master!;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.6 - 0.8;
      p.connect(this.master!);
      pan = p;
    }
    const notes = 2 + Math.floor(Math.random() * 4);
    const base = 2600 + Math.random() * 1400;
    let at = ctx.currentTime + 0.05;
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      const f = base * (1 + (Math.random() - 0.3) * 0.3);
      o.frequency.setValueAtTime(f, at);
      o.frequency.exponentialRampToValueAtTime(f * (1.2 + Math.random() * 0.4), at + 0.06);
      o.frequency.exponentialRampToValueAtTime(f * 0.9, at + 0.11);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.05, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0005, at + 0.12);
      o.connect(g).connect(pan);
      o.start(at);
      o.stop(at + 0.14);
      at += 0.1 + Math.random() * 0.12;
    }
  }

  /** A soft footstep (louder and sharper when running). */
  step(run: boolean) {
    if (!this.ctx || !this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = run ? 1100 : 700;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(run ? 0.5 : 0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(lp).connect(g).connect(this.master!);
    src.start(t, Math.random() * 3, 0.1);
  }

  /** Beep-beep! A jeepney waiting for you to cross. */
  horn() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (const [at, f] of [
      [0, 410],
      [0.22, 410],
    ]) {
      const t = ctx.currentTime + at;
      for (const mult of [1, 1.26]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.01);
        g.gain.setValueAtTime(0.035, t + 0.15);
        g.gain.linearRampToValueAtTime(0, t + 0.18);
        o.connect(g).connect(this.master!);
        o.start(t);
        o.stop(t + 0.2);
      }
    }
  }

  /** A bright little arpeggio for finding Mark. */
  found() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const t = ctx.currentTime + i * 0.11;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.75);
    });
  }

  /** Picking up a lost postcard: a quick papery flutter, then a bright two-note chime. */
  pickup() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    if (this.noise) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 3200;
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      src.connect(bp).connect(g).connect(this.master);
      src.start(t, Math.random() * 2);
      src.stop(t + 0.2);
    }
    [1046.5, 1568].forEach((f, i) => {
      const at = t + 0.12 + i * 0.11;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.16, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      o.connect(g).connect(this.master!);
      o.start(at);
      o.stop(at + 0.55);
    });
  }

  /** A soft blip when a landmark card appears. */
  chime() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.45);
  }

  /**
   * St. Anne's bell: `strokes` tolls, the last left to ring on a little, then fading away. Plays
   * `public/church-bell.mp3` if it's there; otherwise a big church bell made here: slow, full strokes
   * that ring on, with a light echo. Does nothing while it's still ringing.
   */
  bells(strokes = 3) {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.currentTime < this.bellsUntil) return;
    // ring until just after the last stroke, then fade over two seconds (before the recording's next one)
    const seconds = (strokes - 1) * BELL_FILE_GAP + 4;
    this.bellsUntil = ctx.currentTime + seconds + 2;
    if (typeof Audio !== "undefined") {
      const bell = (this.bellFile ??= new Audio(BELL_FILE));
      bell.muted = this.muted;
      bell.volume = 0.8;
      bell.currentTime = 0;
      window.clearTimeout(this.bellStop);
      bell
        .play()
        .then(() => {
          // let it ring for `seconds`, then fade it out over two
          this.bellStop = window.setTimeout(() => {
            const from = bell.volume;
            let i = 0;
            const fade = window.setInterval(() => {
              bell.volume = Math.max(0, from * (1 - ++i / 25));
              if (i >= 25) {
                window.clearInterval(fade);
                bell.pause();
              }
            }, 80);
          }, seconds * 1000);
        })
        .catch(() => this.tolls(strokes)); // no file (or it can't play): make the bell instead
      return;
    }
    this.tolls(strokes);
  }

  /** A big church bell tolling `strokes` times, a full stroke every 2.4 s, each ringing on for seconds. */
  private tolls(strokes: number) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + 0.05;
    const seconds = (strokes - 1) * BELL_SYNTH_GAP + 3;
    const end = t0 + seconds;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.34, t0);
    out.gain.setValueAtTime(0.34, end);
    out.gain.exponentialRampToValueAtTime(0.0001, end + 2);
    out.connect(this.master!);
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.23;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    out.connect(echo).connect(feedback).connect(echo);
    feedback.connect(this.master!);
    for (let i = 0; i < strokes; i++) this.strike(out, t0 + i * BELL_SYNTH_GAP, 392);
    window.setTimeout(() => out.disconnect(), (seconds + 3) * 1000);
  }

  /**
   * One stroke of a church bell with its strike note at `f` Hz: the low hum, the strike note, the third,
   * fifth and octave above, and the bright metallic partials, each ringing on for its own time.
   */
  private strike(out: AudioNode, at: number, f: number) {
    const ctx = this.ctx!;
    const partials: [number, number, number][] = [
      // ratio to the strike note, loudness, how long it rings (s)
      [0.5, 0.5, 5],
      [1, 1, 3.6],
      [1.2, 0.35, 2.6],
      [1.5, 0.3, 2.2],
      [2, 0.55, 2],
      [2.51, 0.2, 1.4],
      [2.67, 0.18, 1.3],
      [3.01, 0.15, 1.1],
      [4.07, 0.09, 0.7],
      [5.1, 0.05, 0.4],
    ];
    for (const [ratio, level, length] of partials) {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      // a slight beat in each partial, as in a real bell's slightly uneven metal
      o.detune.value = (ratio * 7) % 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(level * 0.2, at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + length);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + length + 0.05);
    }
  }

  /** Plays a song file (a shop's jingle) from `start` seconds in, fading in, and looping back to `start`. */
  playSong(src: string, start: number) {
    if (typeof Audio === "undefined") return;
    const song = (this.song ??= new Audio());
    if (song.dataset.src !== src) {
      song.dataset.src = src;
      song.preload = "auto";
      song.src = `${src}#t=${start}`;
    }
    song.onended = () => {
      song.currentTime = start;
      song.play().catch(() => {});
    };
    song.muted = this.muted;
    song.volume = 0;
    // seeking only works once the file's length is known
    if (song.readyState >= 1) song.currentTime = start;
    else song.addEventListener("loadedmetadata", () => (song.currentTime = start), { once: true });
    song.play().catch(() => {}); // the browser may refuse before the visitor has clicked; nothing to do then
    this.fadeSong(0.75);
  }

  /** Fades the song out and stops it. */
  stopSong() {
    if (!this.song || this.song.paused) return;
    this.fadeSong(0, () => this.song?.pause());
  }

  /**
   * The marching band strikes up (looping until `stopBand`). How loud it is follows `bandDistance`,
   * so it swells as you walk up to them.
   */
  playBand() {
    if (this.bandOn || typeof Audio === "undefined") return;
    this.bandOn = true;
    const band = this.bandAudio();
    band.muted = this.muted;
    band.volume = 0;
    // straight into the music, skipping the silence at the start of the file
    if (band.readyState >= 1) band.currentTime = BAND_START;
    else band.addEventListener("loadedmetadata", () => (band.currentTime = BAND_START), { once: true });
    band.play().catch(() => {
      // no recording (or it won't play): drums and an oom-pah bass instead
      if (this.bandOn) this.startBandSynth();
    });
  }

  /** The band's recording, loaded ahead so it starts the moment they're asked; loops music to music. */
  private bandAudio() {
    if (this.band) return this.band;
    const band = new Audio(BAND_FILE);
    band.preload = "auto";
    // round again from the first note when the music ends, not after the silence at the end of the file
    band.addEventListener("timeupdate", () => {
      if (band.currentTime >= BAND_END) band.currentTime = BAND_START;
    });
    band.addEventListener("ended", () => {
      band.currentTime = BAND_START;
      if (this.bandOn) band.play().catch(() => {});
    });
    band.load();
    this.band = band;
    return band;
  }

  /** The band stops playing (fading out over a second). */
  stopBand() {
    this.bandOn = false;
  }

  /** Each frame while the band is about: how far away they are, for the loudness (and the fades). */
  bandDistance(dt: number, d: number) {
    // fetch the band's tune once you're getting close (not for everyone who starts walking), so it's
    // ready to play the moment they're asked
    if (this.ctx && !this.band && d < 60) this.bandAudio();
    const want = this.bandOn ? Math.max(0, 1 - d / 75) ** 1.6 : 0;
    this.bandLevel += (want - this.bandLevel) * Math.min(dt * (this.bandOn ? 6 : 1.4), 1);
    if (this.band && !this.band.paused) {
      this.band.volume = Math.min(1, this.bandLevel * 0.9);
      if (!this.bandOn && this.bandLevel < 0.01) this.band.pause();
    }
    if (this.bandSynth && this.ctx) {
      this.bandSynth.out.gain.setTargetAtTime(this.bandLevel * 0.5, this.ctx.currentTime, 0.1);
      if (!this.bandOn && this.bandLevel < 0.01) {
        window.clearInterval(this.bandSynth.timer);
        const out = this.bandSynth.out;
        window.setTimeout(() => out.disconnect(), 1000);
        this.bandSynth = null;
      }
    }
  }

  /** A march at 120 beats a minute: snare rolls and accents, a bass drum on the beat, a tuba oom-pah. */
  private startBandSynth() {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.bandSynth) return;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.master);
    const beat = 0.5;
    // the tuba's line, a bar at a time (F major: F, C, F, C … then up to B-flat and back)
    const bass = [
      87.31, 65.41, 87.31, 65.41, 87.31, 65.41, 98, 65.41, 116.54, 87.31, 116.54, 87.31, 98, 65.41, 87.31, 87.31,
    ];
    const synth = { out, timer: 0, next: ctx.currentTime + 0.1, beat: 0 };
    const schedule = () => {
      while (synth.next < ctx.currentTime + 0.3) {
        const t = synth.next;
        const i = synth.beat;
        if (i % 2 === 0) this.boom(out, t, 0.9);
        this.snare(out, t, i % 4 === 0 ? 0.9 : 0.55);
        if (i % 4 === 1 || i % 4 === 3) this.snare(out, t + beat / 2, 0.35);
        if (i % 8 === 7) for (let r = 1; r < 4; r++) this.snare(out, t + (beat / 4) * r, 0.3);
        this.tuba(out, t, bass[Math.floor(i / 2) % bass.length] * (i % 2 ? 1.5 : 1), beat * 0.7);
        synth.next += beat;
        synth.beat++;
      }
    };
    schedule();
    synth.timer = window.setInterval(schedule, 100);
    this.bandSynth = synth;
  }

  private boom(out: AudioNode, at: number, level: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(90, at);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.35);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.4);
  }

  private snare(out: AudioNode, at: number, level: number) {
    const ctx = this.ctx!;
    if (!this.noise) return;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level * 1.6, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    n.connect(hp).connect(g).connect(out);
    n.start(at, Math.random() * 3);
    n.stop(at + 0.15);
  }

  private tuba(out: AudioNode, at: number, f: number, length: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.32, at + 0.03);
    g.gain.setValueAtTime(0.32, at + length * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    o.connect(lp).connect(g).connect(out);
    o.start(at);
    o.stop(at + length + 0.05);
  }

  private fadeSong(target: number, then?: () => void) {
    const song = this.song!;
    window.clearInterval(this.songFade);
    const from = song.volume;
    const steps = 20;
    let i = 0;
    this.songFade = window.setInterval(() => {
      i++;
      song.volume = Math.min(1, Math.max(0, from + ((target - from) * i) / steps));
      if (i >= steps) {
        window.clearInterval(this.songFade);
        then?.();
      }
    }, 40);
  }

  dispose() {
    window.clearInterval(this.songFade);
    this.band?.pause();
    this.band = null;
    if (this.bandSynth) window.clearInterval(this.bandSynth.timer);
    this.song?.pause();
    this.song = null;
    window.clearTimeout(this.bellStop);
    this.bellFile?.pause();
    this.bellFile = null;
    this.unwake?.();
    this.unwake = this.wake = null;
    this.ctx?.close();
    this.ctx = null;
  }
}
