/* ============================================================
   main.js — silnik prezentacji: nawigacja, tematy, HUD, tie-line
   Klawisze: →/↓/Space/PGDN następny · ←/↑/PGUP poprzedni
             Home/End · F pełny ekran · M dźwięk · Esc menu (slajd 5)
   ============================================================ */
(function () {
  'use strict';

  const deck = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const N = slides.length;
  const bar = document.getElementById('progress-bar');
  const counter = document.getElementById('counter');
  const flash = document.getElementById('flash');

  let cur = -1;
  let timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function after(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function go(n) {
    n = Math.max(1, Math.min(N, n));
    if (n === cur) return;
    clearTimers();

    const prev = cur;
    if (prev > 0) {
      slides[prev - 1].classList.remove('active', 'play');
      slides[prev - 1].dispatchEvent(new CustomEvent('slideleave'));
    }

    cur = n;
    const el = slides[n - 1];
    el.classList.add('active', 'play');
    el.dispatchEvent(new CustomEvent('slideenter', { detail: { n } }));

    // tematy HUD + letterbox
    const theme = el.dataset.theme || 'night';
    document.body.classList.toggle('hud-dark', theme === 'official' || theme === 'paper');
    document.body.classList.toggle('cine', el.hasAttribute('data-cine'));

    // HUD
    bar.style.width = (n / N * 100) + '%';
    counter.innerHTML = '<b>' + String(n).padStart(2, '0') + '</b> / ' + N;
    history.replaceState(null, '', '#' + n);
  }

  const next = () => go(cur + 1);
  const prev = () => go(cur - 1);
  const home = () => go(5); // menu-mózg

  /* ---------- slajd 1: Rozpocznij ---------- */
  const btnStart = document.getElementById('btn-start');
  btnStart.addEventListener('click', () => {
    window.Snd.unlock();
    window.Snd.play('chime');
    go(2);
  });

  /* ---------- slajd 2: mapa + słowa ---------- */
  const s2 = slides[1];
  s2.addEventListener('slideenter', () => {
    after(400, () => window.Snd.play('whoosh'));
    s2.querySelectorAll('.words span').forEach((sp, i) => {
      after(2600 + i * 900, () => window.Snd.play('bell'));
    });
  });

  /* ---------- slajd 3: liczby z pulsem ---------- */
  const s3 = slides[2];
  s3.addEventListener('slideenter', () => {
    const nums = s3.querySelectorAll('.num');
    const seq = [[900, 0], [2500, 1], [4100, 2]];
    seq.forEach(([t, i]) => after(t, () => {
      nums[i].classList.add('on', 'hit');
      window.Snd.play('heartbeat');
      setTimeout(() => nums[i].classList.remove('hit'), 950);
    }));
    after(5600, () => {
      s3.querySelector('.punch').classList.add('on');
      window.Snd.play('string');
    });
  });
  s3.addEventListener('slideleave', () => {
    s3.querySelectorAll('.num').forEach(x => x.classList.remove('on', 'hit'));
    s3.querySelector('.punch').classList.remove('on');
  });

  /* ---------- slajd 4: błysk → mózg ---------- */
  const s4 = slides[3];
  s4.addEventListener('slideenter', () => {
    after(1500, () => {
      flash.classList.add('go');
      window.Snd.play('boom');
      after(1000, () => flash.classList.remove('go'));
    });
  });

  /* ---------- klawiatura ---------- */
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': go(1); break;
      case 'End': go(N); break;
      case 'Escape': home(); break;
      case 'f': case 'F': toggleFS(); break;
      case 'm': case 'M': setMuteUI(window.Snd.toggleMute()); break;
    }
  });

  /* ---------- przyciski HUD ---------- */
  document.getElementById('nav-next').addEventListener('click', next);
  document.getElementById('nav-prev').addEventListener('click', prev);
  document.getElementById('home-btn').addEventListener('click', home);
  const sndBtn = document.getElementById('snd-btn');
  function setMuteUI(m) { sndBtn.textContent = m ? '🔇' : '🔊'; }
  sndBtn.addEventListener('click', () => setMuteUI(window.Snd.toggleMute()));
  document.getElementById('fs-btn').addEventListener('click', toggleFS);

  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  /* ---------- kursor: pokaż HUD przy ruchu myszy ---------- */
  let idleT;
  addEventListener('mousemove', () => {
    document.body.classList.add('pointer');
    clearTimeout(idleT);
    idleT = setTimeout(() => document.body.classList.remove('pointer'), 2600);
  });

  /* ---------- tryb statyczny (?static) ---------- */
  if (new URLSearchParams(location.search).has('static')) {
    document.documentElement.classList.add('static');
  }

  /* ---------- start (hash albo slajd 1) ---------- */
  const h = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(h) && h >= 1 && h <= N ? h : 1);

  window.Deck = { go, next, prev, slides };
})();
