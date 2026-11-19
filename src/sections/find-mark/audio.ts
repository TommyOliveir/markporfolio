// Afternoon sounds, made on the fly with the Web Audio API (no sound files): a breeze and the hum of
// the town, birdsong, the fountain splashing louder as you get near, footsteps, a jeepney's horn,
// and a little tune when you find Mark.

/** A recording of St. Anne's bell, if one has been added to public/ (otherwise the bell is synthesised). */
const BELL_FILE = "/church-bell.mp3";

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

  /** Starts the sound (must be called from a click or key press). */
  start() {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

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
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.1);
  }

  /** Each frame: fountain loudness from the distance to the nearest one, and the odd bird. */
  update(dt: number, fountainDistance: number) {
    if (!this.ctx || !this.water) return;
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
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(this.master!);
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
   * St. Anne's bell, for `seconds`, then fading away. Plays `public/church-bell.mp3` if it's there;
   * otherwise a big church bell made here: slow, full strokes that ring on, with a light echo.
   * Does nothing while it's still ringing.
   */
  bells(seconds = 7) {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.currentTime < this.bellsUntil) return;
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
        .catch(() => this.tolls(seconds)); // no file (or it can't play): make the bell instead
      return;
    }
    this.tolls(seconds);
  }

  /** A big church bell tolling: a full stroke every 1.8 s, each ringing on for several seconds. */
  private tolls(seconds: number) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + 0.05;
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
    for (let t = t0; t < end - 0.5; t += 1.8) this.strike(out, t, 392);
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
    this.song?.pause();
    this.song = null;
    window.clearTimeout(this.bellStop);
    this.bellFile?.pause();
    this.bellFile = null;
    this.ctx?.close();
    this.ctx = null;
  }
}
