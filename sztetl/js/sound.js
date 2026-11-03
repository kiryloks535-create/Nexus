/* ============================================================
   sound.js — proceduralny silnik dźwięku (Web Audio API)
   Zero plików — wszystko syntezowane. Działa offline.
   Autostart dopiero po geście użytkownika (polityka przeglądarek).
   ============================================================ */
(function () {
  'use strict';

  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { return false; }
    return true;
  }

  /** odblokowanie po pierwszym geście */
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  /* ---------- prymitywy ---------- */
  function env(gainNode, t0, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  function tone(type, freq, peak, attack, decay, t0, freqEnd, dest) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + attack + decay);
    env(g, t0, peak, attack, decay);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + attack + decay + 0.05);
  }

  function noise(peak, attack, decay, t0, filterType, f0, f1, q) {
    const dur = attack + decay + 0.05;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = filterType || 'bandpass';
    flt.frequency.setValueAtTime(f0 || 1000, t0);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t0 + attack + decay);
    flt.Q.value = q || 1;
    const g = ctx.createGain();
    env(g, t0, peak, attack, decay);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t0);
  }

  /* ---------- bank dźwięków ---------- */
  const bank = {
    click(t) { noise(0.18, 0.002, 0.06, t, 'bandpass', 2600, 1200, 2); tone('sine', 720, 0.08, 0.002, 0.05, t, 480); },
    hover(t) { tone('sine', 880, 0.03, 0.004, 0.07, t, 990); },
    whoosh(t) { noise(0.22, 0.18, 0.55, t, 'bandpass', 300, 2400, 0.8); },
    zoom(t) { noise(0.16, 0.05, 0.4, t, 'bandpass', 500, 3200, 1.2); },
    bell(t) {
      tone('sine', 1320, 0.12, 0.004, 1.4, t);
      tone('sine', 1980, 0.05, 0.004, 1.0, t);
      tone('sine', 528, 0.06, 0.004, 1.8, t);
    },
    heartbeat(t) {
      tone('sine', 62, 0.5, 0.012, 0.16, t);
      tone('sine', 56, 0.34, 0.012, 0.2, t + 0.19);
    },
    boom(t) {
      tone('sine', 90, 0.6, 0.01, 0.7, t, 36);
      noise(0.3, 0.01, 0.5, t, 'lowpass', 900, 120);
    },
    stamp(t) { tone('sine', 140, 0.4, 0.004, 0.12, t, 70); noise(0.12, 0.002, 0.09, t, 'lowpass', 1400, 300); },
    pen(t) { noise(0.05, 0.01, 0.22, t, 'highpass', 4200, 5200, 1); },
    tick(t) { tone('square', 1150, 0.045, 0.002, 0.03, t, 900); },
    chime(t) {
      [523.25, 659.25, 783.99].forEach((f, i) => tone('sine', f, 0.09, 0.01, 1.2, t + i * 0.09));
    },
    string(t) { /* skrzypce/smyk — smutna nuta */
      tone('sawtooth', 392, 0.07, 0.35, 1.6, t, 388);
      tone('sine', 784, 0.025, 0.4, 1.4, t);
    },
    rise(t) { tone('sine', 220, 0.1, 0.4, 0.5, t, 880); },
  };

  /** play('click') */
  function play(name) {
    if (muted || !ensure() || ctx.state !== 'running') return;
    const fn = bank[name];
    if (fn) fn(ctx.currentTime + 0.01);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  window.Snd = { play, unlock, toggleMute, get muted() { return muted; } };
})();
